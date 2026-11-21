# -----------------------------------------------------------------------------
# Pixel-Art Sprite-Stack Rogue Archer + Split Upper/Lower Animations
#
#   blender -b --factory-startup --python build_archer_anims.py -- <out_dir>
#
# Features:
#   - White shirt + WHITE SHIRT SLEEVES poking out from under wide dark mantle
#   - Charcoal-slate trousers matching original upper outfit colour
#   - Run animation: bow lowered down at her right side; free left arm swings
#     naturally in counter-phase to legs to help her run!
#   - Split LOWER (legs/boots/lower cloak/belt) + UPPER (torso/white shirt/
#     white sleeves/bow/quiver/upper cloak/scarf/head/ponytail) voxel strips
#     so the upper body independently tracks the mouse cursor during walk/run/shoot!
# -----------------------------------------------------------------------------
import sys, os, math, json
import bpy, bmesh
import numpy as np
from mathutils import Vector, Quaternion

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else os.path.join(os.path.dirname(__file__), "..", "out"))
for sub in ("slices", "frames", "anim_frames", "anim_strips"):
    d = os.path.join(OUT, sub)
    os.makedirs(d, exist_ok=True)
    for fn in os.listdir(d):
        if fn.endswith(".png"):
            os.remove(os.path.join(d, fn))

W, H_USED = 36, 32
DIRS = 32
TILT = 0.65

def hexc(s):
    s = s.lstrip("#")
    return np.array([int(s[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.uint8)

def srgb_to_linear(c):
    v = c / 255.0
    return np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)

PAL_NAMES = [
    ("Outline",  "131223"),   # 0
    ("Hair_0",   "1a1a29"),   # 1
    ("Hair_1",   "292b37"),   # 2
    ("Hair_2",   "434756"),   # 3
    ("Scarf_1",  "656a78"),   # 4
    ("Scarf_2",  "888e9c"),   # 5
    ("Gold_0",   "a87018"),   # 6
    ("Gold_1",   "dfa528"),   # 7
    ("Gold_2",   "fae04b"),   # 8
    ("Skin_0",   "c47861"),   # 9
    ("Skin_1",   "e8a882"),   # 10
    ("Skin_2",   "f6c8a2"),   # 11
    ("Eye_Lash", "20192a"),   # 12
    ("Eye_Shd",  "9aa1bc"),   # 13
    ("Eye_Wht",  "ffffff"),   # 14
    ("Wood_0",   "3d2a23"),   # 15
    ("Wood_1",   "634436"),   # 16
    ("Steel",    "c4cad6"),   # 17
    ("Shirt_D",  "767f92"),   # 18 deep sleeve/armpit crease shadow
    ("Shirt_0",  "9ea5b5"),   # 19 white shirt & sleeve shadow
    ("Shirt_1",  "d5dae4"),   # 20 white shirt & sleeve mid
    ("Shirt_2",  "f3f5fa"),   # 21 crisp white shirt & sleeve highlight
]
PAL = np.stack([hexc(h) for _, h in PAL_NAMES])
P = {name: i for i, (name, _) in enumerate(PAL_NAMES)}

I, J, K = np.meshgrid(np.arange(W), np.arange(W), np.arange(H_USED), indexing="ij")
X = I + 0.5 - W / 2.0
Y = J + 0.5 - W / 2.0
Z = K + 0.5

def ellip(cx, cy, cz, rx, ry, rz):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 + ((Z - cz) / rz) ** 2 <= 1.0

def capsule(a, b, r0, r1=None):
    if r1 is None:
        r1 = r0
    ax, ay, az = a
    bx, by, bz = b
    vx, vy, vz = bx - ax, by - ay, bz - az
    l2 = vx * vx + vy * vy + vz * vz + 1e-8
    t = np.clip(((X - ax) * vx + (Y - ay) * vy + (Z - az) * vz) / l2, 0.0, 1.0)
    cx, cy, cz = ax + t * vx, ay + t * vy, az + t * vz
    rad = r0 + t * (r1 - r0)
    return (X - cx) ** 2 + (Y - cy) ** 2 + (Z - cz) ** 2 <= rad * rad

def build_pose(
    bob=0.0,
    lean=0.0,
    stride=0.0,
    leg_lift=0.0,
    cloak_billow=0.0,
    wind_phase=0.0,
    bow_draw=0.0,
    bow_lowered=False,   # True during idle/run/backpedal: bow lowered at right side
    backpedal=False,     # True for dedicated defensive backward-walking gait!
    arrow_fly=None,
    recoil=0.0,
):
    """Returns (lower_vox, upper_vox, combined_pal_idx, combined_occ, combined_vox)."""
    lo = np.full((W, W, H_USED), -1, np.int16)
    hi = np.full((W, W, H_USED), -1, np.int16)

    def paint_lo(mask, name):
        lo[mask] = P[name]

    def paint_hi(mask, name):
        hi[mask] = P[name]

    # Keep waist pivot cleanly at (0,0) so upper & lower halves twist seamlessly!
    def ly(z_val):
        return -lean * max(0.0, (z_val - 12.0) / 14.0) + recoil * 1.1

    # ================================================= LOWER BODY (follows movement dir!)
    # 1) Boots & charcoal-slate trousers
    if backpedal:
        # DEDICATED BACKPEDAL GAIT: defensive crouched posture, knees bent forward,
        # feet reach cleanly BACK (+Y) and push off smoothly without forward-sprint kick!
        lf_y = 0.6 - stride * 3.4
        rf_y = 0.6 + stride * 3.4
        # Lift the foot that is moving backward (retracting behind hip)
        lf_z = 0.7 + max(0.0, -stride) * 1.9 * leg_lift
        rf_z = 0.7 + max(0.0,  stride) * 1.9 * leg_lift
        lk_y = lf_y * 0.5 - 1.2   # defensive forward knee bend!
        rk_y = rf_y * 0.5 - 1.2
        leg_l = capsule((-2.6, lf_y, lf_z), (-2.3, lk_y, 5.0 + bob), 1.75, 1.85) | \
                capsule((-2.3, lk_y, 5.0 + bob), (-2.0, 0.2, 9.6 + bob), 1.85, 2.0)
        leg_r = capsule(( 2.6, rf_y, rf_z), ( 2.3, rk_y, 5.0 + bob), 1.75, 1.85) | \
                capsule(( 2.3, rk_y, 5.0 + bob), ( 2.0, 0.2, 9.6 + bob), 1.85, 2.0)
        foot_l = ellip(-2.6, lf_y - 0.8, lf_z + 0.3, 1.8, 2.5, 1.35) & (Z >= 0)
        foot_r = ellip( 2.6, rf_y - 0.8, rf_z + 0.3, 1.8, 2.5, 1.35) & (Z >= 0)
        boot_z_l, boot_z_r = lf_z + 3.5, rf_z + 3.5
    elif abs(stride) > 1e-3 or leg_lift > 1e-3:
        lf_y = -1.6 + stride * 4.4
        rf_y = -0.4 - stride * 4.4
        lf_z = 0.8 + max(0.0, -stride) * 2.4 * leg_lift
        rf_z = 0.8 + max(0.0,  stride) * 2.4 * leg_lift
        lk_y = (lf_y - 0.5) * 0.55 - 0.8
        rk_y = (rf_y - 0.5) * 0.55 - 0.8
        leg_l = capsule((-2.5, lf_y, lf_z), (-2.2, lk_y, 5.2 + bob), 1.75, 1.85) | \
                capsule((-2.2, lk_y, 5.2 + bob), (-2.0, 0.0, 9.8 + bob), 1.85, 2.0)
        leg_r = capsule(( 2.5, rf_y, rf_z), ( 2.2, rk_y, 5.2 + bob), 1.75, 1.85) | \
                capsule(( 2.2, rk_y, 5.2 + bob), ( 2.0, 0.0, 9.8 + bob), 1.85, 2.0)
        foot_l = ellip(-2.5, lf_y - 0.9, lf_z + 0.3, 1.8, 2.5, 1.35) & (Z >= 0)
        foot_r = ellip( 2.5, rf_y - 0.9, rf_z + 0.3, 1.8, 2.5, 1.35) & (Z >= 0)
        boot_z_l, boot_z_r = lf_z + 3.6, rf_z + 3.6
    else:
        leg_l = capsule((-2.8, -2.2, 0.8), (-2.2, -0.6, 9.8 + bob), 1.85, 2.0)
        leg_r = capsule(( 2.9,  2.4, 0.8), ( 2.0,  0.6, 9.8 + bob), 1.85, 2.0)
        foot_l = ellip(-2.8, -3.2, 1.2, 1.9, 2.6, 1.4) & (Z >= 0)
        foot_r = ellip( 2.9,  1.6, 1.2, 1.9, 2.4, 1.4) & (Z >= 0)
        boot_z_l = boot_z_r = 5.0

    trousers = (leg_l & (Z >= boot_z_l - 0.4) & (Z <= 11.4 + bob)) | \
               (leg_r & (Z >= boot_z_r - 0.4) & (Z <= 11.4 + bob)) | \
               (capsule((0.0, 0.0, 9.0 + bob), (0.0, 0.0, 11.2 + bob), 3.6, 3.5) & (Z < 11.2 + bob))
    paint_lo(trousers, "Hair_1")
    paint_lo(trousers & (Y < -0.5), "Hair_2")
    paint_lo(trousers & (Y > 1.2), "Hair_0")

    boots_l = (leg_l & (Z < boot_z_l)) | foot_l
    boots_r = (leg_r & (Z < boot_z_r)) | foot_r
    boots = boots_l | boots_r
    paint_lo(boots, "Hair_0")
    paint_lo(boots & (Y < -1.0) & (Z >= 2.0), "Hair_2")
    paint_lo(((boots_l & (Z >= boot_z_l - 1.2)) | (boots_r & (Z >= boot_z_r - 1.2))), "Scarf_1")
    paint_lo(boots & (Z < 1.3), "Outline")

    # Waist belt sits right on the split seam (z=10.4..12.0)
    belt = ellip(0.0, 0.0, 11.2 + bob, 4.0, 3.5, 1.15) & (Z >= 10.4 + bob) & (Z <= 12.0 + bob)
    paint_lo(belt, "Hair_0")
    paint_lo(belt & (Y < -2.4) & (np.abs(X) < 1.5), "Gold_1")

    # ================================================= UPPER BODY (ENTIRE MANTLE + TORSO + ARMS + HEAD!)
    # Entire wide billowing rogue cloak moves cohesively with the UPPER body (shoulders)!
    # NO arm_cut holes under the arms — solid draped fabric around back & sides,
    # clean open front V-split so white shirt, belt & striding legs show clearly!
    z_top_cl = 18.2 + bob
    z_bot_cl = 3.0 + bob * 0.5 + cloak_billow * 0.6
    t_cl = np.clip((z_top_cl - Z) / max(1.0, z_top_cl - z_bot_cl), 0.0, 1.0)
    cy_cl = 0.7 + (2.4 + 2.6 * cloak_billow) * t_cl
    ang_cl = np.arctan2(Y - cy_cl, X)
    pleat = 1.0 + (0.09 * t_cl) * np.cos(ang_cl * 5.0 + 0.4 + wind_phase * 0.8) + \
            (0.06 * t_cl) * np.sin(ang_cl * 3.0 - 0.6 - wind_phase * 0.5)
    rx_cl = (5.4 + (4.8 + 0.5 * cloak_billow) * (t_cl ** 0.85)) * pleat
    ry_cl = (3.8 + (4.4 + 1.2 * cloak_billow) * (t_cl ** 0.90)) * pleat
    d_cl = (X / rx_cl) ** 2 + ((Y - cy_cl) / ry_cl) ** 2

    front_open_w = 2.8 + 2.4 * (t_cl ** 0.8)
    front_opening = (Y < -0.4 + 0.6 * t_cl) & (np.abs(X) < front_open_w)

    # Solid cloak shell with ZERO holes under the arms — split cleanly at waist Z=12.0
    # so the lower skirt moves with hips/legs (lo) and upper mantle moves with torso (hi)!
    cloak = (Z >= z_bot_cl) & (Z <= z_top_cl) & (d_cl <= 1.0) & (d_cl >= 0.54) & ~front_opening
    ridge = np.cos(ang_cl * 5.0 + 0.4 + wind_phase * 0.8) > 0.28
    trough = np.cos(ang_cl * 5.0 + 0.4 + wind_phase * 0.8) < -0.35
    lapel = cloak & (Y < 0.3) & (np.abs(X) < front_open_w + 1.4) & (d_cl > 0.72)
    gold_hem = cloak & (Z <= z_bot_cl + 1.9)

    def paint_cloak_part(part_mask, fn):
        fn(part_mask, "Hair_1")
        fn(part_mask & ridge & (d_cl > 0.76), "Hair_2")
        fn(part_mask & (trough | (d_cl < 0.68)), "Hair_0")
        fn(part_mask & lapel, "Hair_2")
        gh = part_mask & gold_hem
        fn(gh, "Gold_1")
        fn(gh & (Z >= z_bot_cl + 0.9) & (d_cl > 0.76), "Gold_2")
        fn(gh & (Z < z_bot_cl + 0.6), "Gold_0")

    split_z = 12.0 + bob
    paint_cloak_part(cloak & (Z < split_z), paint_lo)
    paint_cloak_part(cloak & (Z >= split_z), paint_hi)

    y_ch = ly(17.5)
    # Crisp WHITE SHIRT torso tucked neatly at belt, shaded cleanly along edges & armpits!
    shirt = capsule((0.0, 0.0, 11.4 + bob), (0.0, y_ch, 17.8 + bob), 3.5, 3.3) & (Z >= 11.4 + bob)
    paint_hi(shirt, "Shirt_1")
    paint_hi(shirt & (Y < y_ch - 1.1) & (np.abs(X) < 2.2), "Shirt_2")
    paint_hi(shirt & ((np.abs(X) >= 2.0) | (Z < 12.6 + bob)), "Shirt_0")
    paint_hi(shirt & (np.abs(X) >= 2.6), "Shirt_D")     # deep side shadow so sleeves never merge into chest!

    # Upper mantle shoulder capelet & lowered hood collar
    mantle_top = ellip(0.0, y_ch + 0.5, 17.4 + bob, 6.2, 4.3, 2.3) & \
                 (Z >= 15.5 + bob) & (Z <= 19.2 + bob) & \
                 ~((Y < y_ch - 1.0) & (np.abs(X) < 2.8) & (Z < 18.4 + bob))
    paint_hi(mantle_top, "Hair_1")
    paint_hi(mantle_top & (Z >= 17.8 + bob), "Hair_2")
    paint_hi(mantle_top & (Z < 16.4 + bob), "Hair_0")
    cowl = ellip(0.0, y_ch + 1.5, 18.2 + bob, 5.2, 3.8, 1.6) & (Z >= 17.2 + bob) & (Z <= 19.5 + bob) & (Y > y_ch - 1.5)
    paint_hi(cowl, "Hair_2")
    paint_hi(cowl & (Z >= 18.5 + bob), "Scarf_1")

    # Flowing grey scarf
    w1 = math.sin(wind_phase) * 1.1
    w2 = math.sin(wind_phase - 1.3) * 1.5
    s_ext = 1.0 + 0.16 * cloak_billow
    scarf = (
        capsule((1.6, y_ch + 2.6, 17.4 + bob), (3.2, y_ch + 6.2 * s_ext, 16.0 + bob + w1), 1.45, 1.25) |
        capsule((3.2, y_ch + 6.2 * s_ext, 16.0 + bob + w1), (4.2, y_ch + 10.0 * s_ext, 16.8 + bob + w2), 1.25, 1.05) |
        capsule((4.2, y_ch + 10.0 * s_ext, 16.8 + bob + w2), (3.6, y_ch + 13.6 * s_ext, 15.8 + bob - w1), 1.05, 0.80)
    )
    paint_hi(scarf, "Scarf_1")
    paint_hi(scarf & (Z >= 16.6 + bob + w1 * 0.4), "Scarf_2")
    paint_hi(scarf & (Z < 15.6 + bob + w1 * 0.4), "Hair_2")

    # Quiver + gold arrows (follows upper back!)
    q_shift = cloak_billow * 0.8
    quiver = capsule((-4.6, y_ch + 3.8 + q_shift, 9.2 + bob), (-2.2, y_ch + 5.6 + q_shift, 15.4 + bob), 1.45, 1.65)
    paint_hi(quiver, "Wood_0")
    paint_hi(quiver & (X < -3.5), "Wood_1")
    for ox, oy in ((-0.55, 0.2), (0.5, -0.25), (0.05, 0.55)):
        shaft = capsule((-2.4 + ox, y_ch + 5.4 + q_shift + oy, 15.0 + bob),
                        (-1.5 + ox * 1.4, y_ch + 6.4 + q_shift + oy * 1.4, 17.6 + bob), 0.62, 0.62)
        fletch = ellip(-1.4 + ox * 1.5, y_ch + 6.5 + q_shift + oy * 1.5, 17.8 + bob, 1.05, 1.05, 1.15)
        paint_hi(shaft, "Wood_1")
        paint_hi(fletch, "Gold_2")
        paint_hi(fletch & (Z < 17.4 + bob), "Gold_1")

    # ------------------------------------------------- 4) WHITE SHIRT SLEEVES + BOW / RUNNING ARMS!
    if bow_lowered:
        # RUNNING POSE:
        # - Right arm (+X): lowered cleanly down by her right hip, carrying bow down/back!
        # - Left arm (-X): free! Swings forward & back naturally in counter-phase to legs!
        r_swing = stride * 1.6
        r_elbow = (5.4, y_ch + 0.2 + r_swing * 0.5, 13.8 + bob)
        r_hand  = (6.4, y_ch - 2.6 + r_swing,       11.2 + bob)
        arm_r = capsule((4.0, y_ch - 0.2, 16.4 + bob), r_elbow, 1.38, 1.28) | \
                capsule(r_elbow, r_hand, 1.25, 1.12)
        hand_r = ellip(r_hand[0], r_hand[1], r_hand[2], 1.3, 1.3, 1.2)

        # Free left arm pumps forward/back (-stride = opposite to left leg!) to help her run!
        l_swing = -stride * 3.8
        l_elbow = (-5.6, y_ch + 1.2 + l_swing * 0.55, 13.4 + bob - abs(stride) * 0.4)
        l_hand  = (-6.0, y_ch - 2.8 + l_swing,        12.4 + bob + max(0.0, -stride) * 1.8)
        arm_l = capsule((-4.0, y_ch - 0.2, 16.4 + bob), l_elbow, 1.38, 1.28) | \
                capsule(l_elbow, l_hand, 1.25, 1.12)
        hand_l = ellip(l_hand[0], l_hand[1], l_hand[2], 1.3, 1.3, 1.2)

        # WHITE SHIRT SLEEVES with crisp underside & shoulder crease shadows so they NEVER blend into torso!
        arms = arm_r | arm_l
        paint_hi(arms, "Shirt_1")
        # Top sunlit ridge of sleeves
        paint_hi(arm_r & (Z >= 13.6 + bob) & (X > 5.0), "Shirt_2")
        paint_hi(arm_l & (Z >= 13.6 + bob) & (X < -5.0), "Shirt_2")
        # Mid-lower sleeve shadow + deep underside/armpit shadow where sleeves exit mantle
        paint_hi(arms & (Z < 13.2 + bob), "Shirt_0")
        paint_hi(arms & ((Z < 12.2 + bob) | (np.abs(X) < 4.9)), "Shirt_D")
        cuffs = (ellip(r_hand[0], r_hand[1] + 0.8, r_hand[2] + 0.6, 1.35, 1.35, 1.25) |
                 ellip(l_hand[0], l_hand[1] + 0.8, l_hand[2] + 0.4, 1.35, 1.35, 1.25)) & arms
        paint_hi(cuffs, "Hair_0")
        paint_hi(hand_r | hand_l, "Skin_1")
        paint_hi((hand_r | hand_l) & (Z >= 11.8 + bob), "Skin_2")

        # Lowered recurve bow carried cleanly & solidly down at her right side (no gaps!)
        bow_pts = []
        for s in np.linspace(-1.0, 1.0, 29):
            bx = r_hand[0] + 1.1 + 0.35 * s
            by = r_hand[1] - 0.5 - s * 5.6 + 1.8 * (s * s)
            bz = r_hand[2] - 0.4 + s * 5.2 + 1.1 * (s * s)
            bow_pts.append((bx, by, bz))
        bow_mask = np.zeros((W, W, H_USED), bool)
        for p0, p1 in zip(bow_pts[:-1], bow_pts[1:]):
            bow_mask |= capsule(p0, p1, 0.95, 0.95)
        paint_hi(bow_mask, "Wood_0")
        paint_hi(bow_mask & (Z >= r_hand[2] + 0.6), "Wood_1")
        paint_hi(capsule(bow_pts[0], bow_pts[3], 1.0) | capsule(bow_pts[-4], bow_pts[-1], 1.0), "Gold_1")
        bstring = capsule(bow_pts[0], bow_pts[-1], 0.58)
        paint_hi(bstring & (hi < 0), "Outline")
    else:
        # IDLE / SHOOT POSE (aiming straight along cursor direction!)
        bow_z = 16.0 + bob + recoil * 0.6
        bow_x = 6.2
        bow_y = y_ch - 9.8 - recoil * 0.9
        arm_bow = capsule((3.8, y_ch - 0.6, 16.2 + bob), (bow_x - 0.2, bow_y + 1.2, bow_z), 1.38, 1.2)
        hand_bow = ellip(bow_x, bow_y + 0.6, bow_z, 1.35, 1.35, 1.2)

        draw_x = -0.4 + 2.4 * (1.0 - bow_draw) - 1.2 * recoil
        draw_y = y_ch - 5.8 + 3.4 * bow_draw + 1.4 * recoil
        draw_z = bow_z + 0.4 * bow_draw
        arm_draw = capsule((-3.8, y_ch - 0.6, 16.2 + bob), (draw_x - 0.8, draw_y + 0.4, draw_z), 1.38, 1.2)
        hand_draw = ellip(draw_x, draw_y, draw_z, 1.3, 1.25, 1.2)

        # WHITE SHIRT SLEEVES with crisp underside & chest-separation shadows!
        arms = arm_bow | arm_draw
        paint_hi(arms, "Shirt_1")
        paint_hi(arms & (Z >= bow_z + 0.4), "Shirt_2")
        paint_hi(arms & (Z < bow_z - 0.1), "Shirt_0")
        # Underside of sleeves + crease where drawing forearm crosses in front of white shirt chest!
        paint_hi(arms & (Z < bow_z - 0.6), "Shirt_D")
        paint_hi(arm_draw & (Y > draw_y - 0.3) & (Z < draw_z + 0.1), "Shirt_D")
        paint_hi(arm_bow & (X < 4.8), "Shirt_D")
        cuffs = (ellip(bow_x - 0.1, bow_y + 1.8, bow_z, 1.35, 1.1, 1.35) |
                 ellip(draw_x - 0.6, draw_y + 0.9, draw_z, 1.35, 1.1, 1.35)) & arms
        paint_hi(cuffs, "Hair_0")
        paint_hi(hand_bow | hand_draw, "Skin_1")
        paint_hi((hand_bow | hand_draw) & (Z >= bow_z + 0.2), "Skin_2")

        # Recurve bow (bends deeper on bow_draw!)
        bend = 3.4 + 2.8 * bow_draw - 0.8 * recoil
        span = 8.6 - 0.9 * bow_draw
        bow_pts = []
        for s in np.linspace(-1.0, 1.0, 27):
            bz = bow_z + s * span
            by = bow_y + bend * (s * s) - 0.55 * (s ** 4)
            bow_pts.append((bow_x, by, bz))
        bow_mask = np.zeros((W, W, H_USED), bool)
        for p0, p1 in zip(bow_pts[:-1], bow_pts[1:]):
            bow_mask |= capsule(p0, p1, 0.85, 0.85)
        paint_hi(bow_mask, "Wood_0")
        paint_hi(bow_mask & (Y < bow_y + 1.6), "Wood_1")
        paint_hi(bow_mask & (np.abs(Z - bow_z) > span - 1.4), "Gold_1")
        paint_hi(bow_mask & (np.abs(Z - bow_z) < 1.3), "Hair_0")

        top_tip, bot_tip = bow_pts[-1], bow_pts[0]
        if arrow_fly is None:
            nock_x = bow_x - 1.8 - 1.6 * bow_draw
            nock_y = bow_y + 3.4 + 3.2 * bow_draw
            nock_pt = (nock_x, nock_y, bow_z)
            bstring = capsule(top_tip, nock_pt, 0.56) | capsule(bot_tip, nock_pt, 0.56)
            paint_hi(bstring & (hi < 0), "Outline")
            tip_y = bow_y - 5.2 + 2.2 * bow_draw
            paint_hi(capsule(nock_pt, (bow_x, tip_y + 2.2, bow_z), 0.62), "Hair_0")
            paint_hi(ellip(bow_x, tip_y + 2.4, bow_z, 1.25, 0.9, 1.35), "Gold_2")
            paint_hi(capsule((bow_x, tip_y + 2.2, bow_z), (bow_x, tip_y, bow_z), 1.15, 0.45),
                     "Eye_Wht" if bow_draw > 0.85 else "Steel")
        else:
            bstring = capsule(top_tip, bot_tip, 0.55)
            paint_hi(bstring & (hi < 0), "Outline")
            if arrow_fly < 9.0:
                fy = bow_y - 2.0 - arrow_fly
                a_tail = (bow_x, min(bow_y + 1.5, fy + 6.5), bow_z)
                a_head = (bow_x, max(-17.4, fy - 2.2), bow_z)
                paint_hi(capsule((bow_x, bow_y + 1.0, bow_z), a_head, 0.62), "Eye_Wht")
                paint_hi(capsule((bow_x, max(-17.2, fy), bow_z), a_head, 1.05, 0.45), "Gold_2")
                paint_hi(capsule(a_tail, (bow_x, max(-16.5, fy + 1.0), bow_z), 0.58), "Steel")

    # ------------------------------------------------- 5) HEAD, FULL BANGS & VARIANT-4 FACE
    y_hd = ly(25.0)
    z_hd = bob
    neck = capsule((0.0, y_hd - 0.2, 18.0 + z_hd), (0.0, y_hd - 0.2, 20.6 + z_hd), 1.85, 1.7)
    paint_hi(neck, "Skin_0")

    chin_taper = np.where(Z < 22.6 + z_hd, 0.72 + 0.28 * np.clip((Z - (19.4 + z_hd)) / 3.2, 0.0, 1.0), 1.0)
    head_r = ((X / (4.7 * chin_taper)) ** 2 + ((Y - (y_hd - 0.3)) / (4.4 * chin_taper)) ** 2 + ((Z - (24.8 + z_hd)) / 5.2) ** 2)
    head = head_r <= 1.0
    paint_hi(head, "Skin_1")
    paint_hi(head & (Y < y_hd - 1.4) & (Z >= 21.0 + z_hd), "Skin_2")
    paint_hi(head & (Z < 21.0 + z_hd), "Skin_0")

    pad_h = np.pad(head, ((0, 0), (1, 0), (0, 0)), constant_values=False)
    front_surf = head & ~pad_h[:, :-1, :]
    eye_depth = front_surf | (head & np.roll(front_surf, 1, axis=1))
    cx_i = W // 2
    ek = int(round(24 + z_hd))

    paint_hi(eye_depth & (K == ek + 1) & ((I == cx_i - 4) | (I == cx_i - 3)), "Eye_Lash")
    paint_hi(eye_depth & (K == ek + 1) & (I == cx_i - 2), "Skin_0")
    paint_hi(eye_depth & (K == ek)     & (I == cx_i - 4), "Eye_Shd")
    paint_hi(eye_depth & (K == ek)     & (I == cx_i - 3), "Eye_Wht")
    paint_hi(eye_depth & (K == ek)     & (I == cx_i - 2), "Eye_Lash")

    paint_hi(eye_depth & (K == ek + 1) & (I == cx_i + 1), "Skin_0")
    paint_hi(eye_depth & (K == ek + 1) & ((I == cx_i + 2) | (I == cx_i + 3)), "Eye_Lash")
    paint_hi(eye_depth & (K == ek)     & (I == cx_i + 1), "Eye_Lash")
    paint_hi(eye_depth & (K == ek)     & (I == cx_i + 2), "Eye_Wht")
    paint_hi(eye_depth & (K == ek)     & (I == cx_i + 3), "Eye_Shd")

    # Full flush dark bangs (zero bald spot, zero visor overhang!)
    hair_shell = ellip(0.0, y_hd + 0.1, 25.8 + z_hd, 5.5, 5.2, 5.3) & ~ellip(0.0, y_hd - 2.0, 23.2 + z_hd, 4.3, 4.0, 3.8)
    face_window = (Y < y_hd - 0.5) & (np.abs(X) < 4.1) & (Z < 25.8 + z_hd)
    front_bangs = ellip(0.0, y_hd - 0.1, 26.2 + z_hd, 5.2, 4.5, 4.9) & (Y < y_hd - 1.2) & (Z >= 26.0 + z_hd)
    bang_tips = ellip(0.0, y_hd - 0.1, 25.8 + z_hd, 5.1, 4.5, 5.0) & (Y < y_hd - 2.2) & \
                (Z >= 25.3 + z_hd) & (Z < 26.2 + z_hd) & ((np.abs(X) < 1.1) | (np.abs(X) > 3.2))
    hair_cap = (hair_shell & ~face_window & (Z >= 20.2 + z_hd)) | front_bangs | bang_tips
    side_locks = (
        capsule((-4.5, y_hd - 0.5, 25.6 + z_hd), (-4.2, y_hd - 0.7, 20.0 + z_hd), 1.2, 0.95) |
        capsule(( 4.5, y_hd - 0.5, 25.6 + z_hd), ( 4.2, y_hd - 0.7, 20.0 + z_hd), 1.2, 0.95)
    )
    hair_main = hair_cap | side_locks
    paint_hi(hair_main, "Hair_1")
    paint_hi(hair_main & (Z >= 28.4 + z_hd), "Hair_2")
    paint_hi(hair_main & (Z >= 29.6 + z_hd) & (np.abs(X) < 3.0), "Scarf_1")
    paint_hi(hair_main & (Z < 23.2 + z_hd), "Hair_0")
    paint_hi(front_bangs & (Z < 26.5 + z_hd) & (Y < y_hd - 3.2), "Hair_0")

    pw = math.sin(wind_phase + 0.6) * 1.2
    p_ext = 1.0 + 0.15 * cloak_billow
    pony = (
        capsule((0.0, y_hd + 6.2, 26.8 + z_hd), (-0.4, y_hd + 10.0 * p_ext, 27.8 + z_hd + pw), 2.4, 2.2) |
        capsule((-0.4, y_hd + 10.0 * p_ext, 27.8 + z_hd + pw), (-0.8, y_hd + 13.8 * p_ext, 25.8 + z_hd - pw * 0.5), 2.1, 1.4) |
        capsule(( 0.8, y_hd + 9.2 * p_ext, 26.2 + z_hd + pw * 0.6), ( 1.4, y_hd + 12.6 * p_ext, 23.6 + z_hd - pw * 0.4), 1.7, 1.05) |
        capsule((-1.0, y_hd + 8.6 * p_ext, 25.4 + z_hd + pw * 0.5), (-1.8, y_hd + 11.8 * p_ext, 22.8 + z_hd - pw * 0.4), 1.4, 0.9)
    )
    paint_hi(pony, "Hair_1")
    paint_hi(pony & (Z >= 28.0 + z_hd + pw * 0.4), "Hair_2")
    paint_hi(pony & (Z < 24.8 + z_hd), "Hair_0")

    hair_tie = ellip(0.0, y_hd + 5.6, 26.8 + z_hd, 2.35, 1.35, 2.35)
    paint_hi(hair_tie, "Gold_1")
    paint_hi(hair_tie & (Z >= 27.3 + z_hd), "Gold_2")
    paint_hi(hair_tie & (Z < 25.6 + z_hd), "Gold_0")

    # Convert to RGBA voxels
    def to_vox(idx_arr):
        occ = idx_arr >= 0
        v = np.zeros((W, W, H_USED, 4), np.uint8)
        v[occ, :3] = PAL[idx_arr[occ]]
        v[occ, 3] = 255
        return v

    comb = np.where(hi >= 0, hi, lo)
    return to_vox(lo), to_vox(hi), comb, comb >= 0, to_vox(comb)

# ------------------------------------------------------------------ helpers
def save_png(arr, path):
    h0, w0 = arr.shape[:2]
    im = bpy.data.images.new("tmp_png", w0, h0, alpha=True)
    im.colorspace_settings.name = "sRGB"
    im.pixels.foreach_set((arr[::-1].astype(np.float32) / 255.0).ravel())
    im.filepath_raw = path; im.file_format = "PNG"; im.save()
    bpy.data.images.remove(im)

def add_outline(img, col=PAL[P["Outline"]]):
    out = img.copy()
    a = out[..., 3] > 0
    grow = a.copy()
    grow[1:] |= a[:-1]; grow[:-1] |= a[1:]
    grow[:, 1:] |= a[:, :-1]; grow[:, :-1] |= a[:, 1:]
    edge = grow & ~a
    out[edge, :3] = col; out[edge, 3] = 255
    return out

def vox_to_slices(vox):
    return [np.ascontiguousarray(np.transpose(vox[:, :, k], (1, 0, 2))[::-1]) for k in range(H_USED)]

R = int(math.ceil(W / 2 * 1.42)) + 3
CW = 2 * R + 6
CH = int(2 * R * TILT) + H_USED + 10
CX, BASE_CY = CW / 2.0, CH - R * TILT - 5.0
VV, UU = np.mgrid[0:CH, 0:CW].astype(np.float32) + 0.5

def render_stack(slices, theta, step=1.0, tilt=TILT):
    can = np.zeros((CH, CW, 4), np.uint8)
    c, s = math.cos(theta), math.sin(theta)
    for k, img in enumerate(slices):
        oy = BASE_CY - k * step
        dx = UU - CX
        dy = (VV - oy) / tilt
        sx = c * dx + s * dy + W / 2.0
        sy = -s * dx + c * dy + W / 2.0
        xi, yi = np.floor(sx).astype(int), np.floor(sy).astype(int)
        ok = (xi >= 0) & (xi < W) & (yi >= 0) & (yi < W)
        px = np.zeros_like(can)
        px[ok] = img[yi[ok], xi[ok]]
        m = px[..., 3] > 0
        can[m] = px[m]
    return add_outline(can)

# ------------------------------------------------------------------ 1) ANIMATIONS
ANIM_SPECS = {
    "idle": [
        # Calm idle: bow lowered cleanly at her right side, free left arm relaxed at left side!
        dict(bob=0.0, wind_phase=0.0,  bow_lowered=True),
        dict(bob=0.5, wind_phase=1.57, bow_lowered=True),
        dict(bob=0.8, wind_phase=3.14, bow_lowered=True),
        dict(bob=0.3, wind_phase=4.71, bow_lowered=True),
    ],
    "run": [
        dict(bob=0.2, lean=2.0, stride= 1.0,  leg_lift=0.8, cloak_billow=1.0, wind_phase=0.0,  bow_lowered=True),
        dict(bob=1.1, lean=2.2, stride= 0.5,  leg_lift=1.0, cloak_billow=1.1, wind_phase=1.05, bow_lowered=True),
        dict(bob=0.7, lean=2.0, stride=-0.5,  leg_lift=0.9, cloak_billow=0.9, wind_phase=2.10, bow_lowered=True),
        dict(bob=0.2, lean=2.0, stride=-1.0,  leg_lift=0.8, cloak_billow=1.0, wind_phase=3.14, bow_lowered=True),
        dict(bob=1.1, lean=2.2, stride=-0.5,  leg_lift=1.0, cloak_billow=1.1, wind_phase=4.19, bow_lowered=True),
        dict(bob=0.7, lean=2.0, stride= 0.5,  leg_lift=0.9, cloak_billow=0.9, wind_phase=5.24, bow_lowered=True),
    ],
    "back": [
        # Dedicated 6-frame defensive backpedal animation (upright/slight back shift, cloak sweeps forward!)
        dict(bob=-0.2, lean=-0.9, stride= 1.0, leg_lift=0.8, cloak_billow=-0.45, wind_phase=0.0,  bow_lowered=True, backpedal=True),
        dict(bob= 0.5, lean=-1.0, stride= 0.5, leg_lift=1.0, cloak_billow=-0.50, wind_phase=1.05, bow_lowered=True, backpedal=True),
        dict(bob= 0.2, lean=-0.9, stride=-0.5, leg_lift=0.9, cloak_billow=-0.40, wind_phase=2.10, bow_lowered=True, backpedal=True),
        dict(bob=-0.2, lean=-0.9, stride=-1.0, leg_lift=0.8, cloak_billow=-0.45, wind_phase=3.14, bow_lowered=True, backpedal=True),
        dict(bob= 0.5, lean=-1.0, stride=-0.5, leg_lift=1.0, cloak_billow=-0.50, wind_phase=4.19, bow_lowered=True, backpedal=True),
        dict(bob= 0.2, lean=-0.9, stride= 0.5, leg_lift=0.9, cloak_billow=-0.40, wind_phase=5.24, bow_lowered=True, backpedal=True),
    ],
    "shoot": [
        dict(bob=0.0,  lean=0.4,  bow_draw=0.15, wind_phase=0.2),
        dict(bob=-0.2, lean=0.0,  bow_draw=0.60, wind_phase=0.7),
        dict(bob=-0.4, lean=-0.3, bow_draw=1.00, wind_phase=1.3),
        dict(bob=0.3,  lean=-0.6, bow_draw=0.0,  arrow_fly=3.0, recoil=1.0, cloak_billow=0.6, wind_phase=2.4),
        dict(bob=0.1,  lean=-0.2, bow_draw=0.0,  arrow_fly=7.5, recoil=0.4, cloak_billow=0.3, wind_phase=3.6),
        dict(bob=0.0,  lean=0.2,  bow_draw=0.0,  arrow_fly=12.0, recoil=0.0, cloak_billow=0.1, wind_phase=4.9),
    ],
}

BG_COL = hexc("3e4148")
SH_COL = hexc("282a30")
SH_MASK = ((UU - CX) / 10.5) ** 2 + ((VV - BASE_CY + 1.0) / (10.5 * TILT)) ** 2 < 1.0
def on_bg(im):
    bg = np.zeros((CH, CW, 4), np.uint8)
    bg[..., :3] = BG_COL; bg[..., 3] = 255
    bg[SH_MASK, :3] = SH_COL
    m = im[..., 3] > 0
    bg[m, :3] = im[m, :3]
    return bg

base_pal_idx = base_occ = base_vox = None
strip_meta = {}
PREVIEW_ANGLES = [0, 4, 8, 16]

for anim_name, frames_spec in ANIM_SPECS.items():
    rows_comb, rows_lo, rows_hi = [], [], []
    sheet_8dir = [[None] * len(frames_spec) for _ in range(8)]
    preview_rows = []
    for fi, kwargs in enumerate(frames_spec):
        lo_v, hi_v, pidx, occ, vox = build_pose(**kwargs)
        if anim_name == "idle" and fi == 0:
            base_pal_idx, base_occ, base_vox = pidx, occ, vox
        sl = vox_to_slices(vox)
        rows_comb.append(np.concatenate(sl, axis=1))
        rows_lo.append(np.concatenate(vox_to_slices(lo_v), axis=1))
        rows_hi.append(np.concatenate(vox_to_slices(hi_v), axis=1))
        for d8 in range(8):
            sheet_8dir[d8][fi] = render_stack(sl, 2.0 * math.pi * d8 / 8.0)
        p4 = [on_bg(render_stack(sl, 2.0 * math.pi * a / 32.0)) for a in PREVIEW_ANGLES]
        fr_img = np.concatenate(p4, axis=1)
        preview_rows.append(fr_img)
        save_png(fr_img.repeat(4, 0).repeat(4, 1), os.path.join(OUT, "anim_frames", f"{anim_name}_{fi:02d}.png"))

    save_png(np.concatenate(rows_comb, axis=0), os.path.join(OUT, "anim_strips", f"archer_{anim_name}_strip.png"))
    save_png(np.concatenate(rows_lo, axis=0),   os.path.join(OUT, "anim_strips", f"archer_{anim_name}_lower.png"))
    save_png(np.concatenate(rows_hi, axis=0),   os.path.join(OUT, "anim_strips", f"archer_{anim_name}_upper.png"))
    strip_meta[anim_name] = len(frames_spec)
    save_png(np.concatenate([np.concatenate(r, axis=1) for r in sheet_8dir], axis=0),
             os.path.join(OUT, f"archer_{anim_name}_8dir_sheet.png"))
    save_png(np.concatenate(preview_rows, axis=0).repeat(3, 0).repeat(3, 1),
             os.path.join(OUT, f"archer_{anim_name}_contact.png"))
    print(f"ANIM {anim_name}: {len(frames_spec)} frames OK (split lower+upper)")

# ------------------------------------------------------------------ 2) BASE ASSETS
base_slices = vox_to_slices(base_vox)
for k, s in enumerate(base_slices):
    save_png(s, os.path.join(OUT, "slices", f"slice_{k:02d}.png"))
save_png(np.concatenate(base_slices, axis=1), os.path.join(OUT, "archer_stack_strip.png"))

def ortho_proj(axis_vox):
    occ_a = axis_vox[..., 3] > 0
    first = np.argmax(occ_a, axis=2)
    has = occ_a.any(axis=2)
    ai, bi = np.meshgrid(np.arange(axis_vox.shape[0]), np.arange(axis_vox.shape[1]), indexing="ij")
    img = axis_vox[ai, bi, first].copy(); img[~has] = 0
    return img

top_v   = np.transpose(ortho_proj(base_vox[:, :, ::-1]), (1, 0, 2))[::-1]
front_v = np.transpose(ortho_proj(np.transpose(base_vox, (0, 2, 1, 3))), (1, 0, 2))[::-1]
back_v  = np.transpose(ortho_proj(np.transpose(base_vox, (0, 2, 1, 3))[::-1, :, ::-1]), (1, 0, 2))[::-1]
side_v  = np.transpose(ortho_proj(np.transpose(base_vox, (1, 2, 0, 3))[::-1, :, ::-1]), (1, 0, 2))[::-1]
ph, pw = max(W, H_USED) + 6, W + 6
def make_panel(im):
    p = np.zeros((ph, pw, 4), np.uint8)
    h0, w0 = im.shape[:2]
    p[ph - 3 - h0:ph - 3, (pw - w0) // 2:(pw - w0) // 2 + w0] = im
    return add_outline(p)
four_view = np.concatenate([make_panel(v) for v in (top_v, side_v, front_v, back_v)], axis=1)
save_png(four_view, os.path.join(OUT, "archer_4view.png"))
fv_bg = np.full((four_view.shape[0], four_view.shape[1], 4), (*BG_COL, 255), np.uint8)
fv_bg[four_view[..., 3] > 0] = four_view[four_view[..., 3] > 0]
save_png(fv_bg.repeat(6, 0).repeat(6, 1), os.path.join(OUT, "archer_4view_6x.png"))

for d in range(DIRS):
    save_png(render_stack(base_slices, 2.0 * math.pi * d / DIRS), os.path.join(OUT, "frames", f"rot_{d:02d}.png"))

# ------------------------------------------------------------------ 3) BLENDER MODEL
for ob in list(bpy.data.objects): bpy.data.objects.remove(ob, do_unlink=True)
for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
for mat in list(bpy.data.materials): bpy.data.materials.remove(mat)

scene = bpy.context.scene
scene.view_settings.view_transform = "Standard"; scene.view_settings.look = "None"
world = bpy.data.worlds.new("PixelWorld"); scene.world = world; world.use_nodes = True
bg_node = world.node_tree.nodes.get("Background")
if bg_node: bg_node.inputs[0].default_value = (*srgb_to_linear(BG_COL), 1.0)

def make_pixel_mat(name, rgb):
    mat = bpy.data.materials.new(name); lin = srgb_to_linear(rgb)
    mat.diffuse_color = (float(lin[0]), float(lin[1]), float(lin[2]), 1.0)
    mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (float(lin[0]), float(lin[1]), float(lin[2]), 1.0)
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return mat

mats = [make_pixel_mat(name, PAL[i]) for i, (name, _) in enumerate(PAL_NAMES)]
col_slices = bpy.data.collections.new("Archer_Slices"); scene.collection.children.link(col_slices)
pivot = bpy.data.objects.new("Archer_Pivot", None); col_slices.objects.link(pivot)
CUBE_FACES = [
    (( 1, 0, 0), ((1,0,0), (1,1,0), (1,1,1), (1,0,1))),
    ((-1, 0, 0), ((0,1,0), (0,0,0), (0,0,1), (0,1,1))),
    (( 0, 1, 0), ((1,1,0), (0,1,0), (0,1,1), (1,1,1))),
    (( 0,-1, 0), ((0,0,0), (1,0,0), (1,0,1), (0,0,1))),
    (( 0, 0, 1), ((0,0,1), (1,0,1), (1,1,1), (0,1,1))),
    (( 0, 0,-1), ((0,1,0), (1,1,0), (1,0,0), (0,0,0))),
]
for k in range(H_USED):
    if not base_occ[:, :, k].any(): continue
    bm = bmesh.new(); used_mats = {}
    xs, ys = np.where(base_occ[:, :, k])
    for i, j in zip(xs.tolist(), ys.tolist()):
        mi = int(base_pal_idx[i, j, k])
        if mi not in used_mats: used_mats[mi] = len(used_mats)
        slot = used_mats[mi]; x0, y0 = i - W / 2.0, j - W / 2.0
        for (dx, dy, dz), corners in CUBE_FACES:
            ni, nj = i + dx, j + dy
            if dz == 0 and 0 <= ni < W and 0 <= nj < W and base_occ[ni, nj, k]: continue
            vs = [bm.verts.new((x0 + cx, y0 + cy, cz)) for cx, cy, cz in corners]
            f = bm.faces.new(vs); f.material_index = slot; f.smooth = False
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    me = bpy.data.meshes.new(f"Slice_{k:02d}"); bm.to_mesh(me); bm.free()
    for mi, _ in sorted(used_mats.items(), key=lambda kv: kv[1]): me.materials.append(mats[mi])
    ob = bpy.data.objects.new(f"Slice_{k:02d}", me); ob.parent = pivot; ob.location = (0.0, 0.0, float(k))
    col_slices.objects.link(ob)

rot_vp = Quaternion((0, 0, 1), math.radians(24)) @ Quaternion((1, 0, 0), math.radians(52))
for scr in bpy.data.screens:
    for area in scr.areas:
        if area.type == "VIEW_3D":
            sp = area.spaces.active
            sp.shading.type = "SOLID"; sp.shading.light = "FLAT"; sp.shading.color_type = "MATERIAL"
            sp.shading.show_object_outline = True
            sp.shading.object_outline_color = tuple(srgb_to_linear(PAL[P["Outline"]]))
            sp.shading.background_type = "VIEWPORT"; sp.shading.background_color = tuple(srgb_to_linear(BG_COL))
            sp.overlay.show_floor = False; sp.overlay.show_axis_x = False; sp.overlay.show_axis_y = False
            r3d = sp.region_3d; r3d.view_perspective = "ORTHO"
            r3d.view_location = Vector((0, 0, 16)); r3d.view_distance = 62.0; r3d.view_rotation = rot_vp

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "archer_model.blend"))
meta = {"slice_w": W, "slice_h": W, "slices": H_USED, "directions": DIRS, "tilt": TILT,
        "frame_w": CW, "frame_h": CH, "animations": strip_meta,
        "split_upper_lower": True}
with open(os.path.join(OUT, "archer_stack.json"), "w") as f: json.dump(meta, f, indent=2)
print("SPLIT_ANIMS_DONE", json.dumps(meta))
