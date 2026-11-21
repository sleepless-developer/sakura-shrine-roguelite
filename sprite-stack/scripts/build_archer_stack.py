# -----------------------------------------------------------------------------
# Pixel-Art Sprite-Stack Rogue Archer Builder (Blender 5.x, background mode)
#
#   blender -b --factory-startup --python build_archer_stack.py -- <out_dir>
#
# Style: Hoodless female rogue archer (Katana ZERO silhouette/proportions,
# neutral base palette, Variant 4 serious narrow combat eyes with raised eye
# line, NO lips) built on a crisp 36x36x33 voxel-slice grid for top-down /
# 4-view sprite stacking.
# -----------------------------------------------------------------------------
import sys, os, math, json
import bpy, bmesh
import numpy as np
from mathutils import Vector, Quaternion

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else os.path.join(os.path.dirname(__file__), "..", "out"))
for sub in ("slices", "frames", "demo_frames"):
    d = os.path.join(OUT, sub)
    os.makedirs(d, exist_ok=True)
    for fn in os.listdir(d):
        if fn.endswith(".png"):
            os.remove(os.path.join(d, fn))

W, H = 36, 36
DIRS = 32
TILT = 0.65          # classic top-down / 3/4 sprite-stack pitch

def hexc(s):
    s = s.lstrip("#")
    return np.array([int(s[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.uint8)

def srgb_to_linear(c):
    v = c / 255.0
    return np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)

# Crisp neutral rogue-archer palette (zero purple/red neon bounce, exact match!)
PAL_NAMES = [
    ("Outline",  "131223"),   # 0  dark ink outline
    ("Hair_0",   "1a1a29"),   # 1  deep charcoal hair / cloak shadow
    ("Hair_1",   "292b37"),   # 2  mid charcoal hair / cloak body
    ("Hair_2",   "434756"),   # 3  cool slate cloak / hair highlight
    ("Scarf_1",  "656a78"),   # 4  scarf / collar mid grey
    ("Scarf_2",  "888e9c"),   # 5  scarf / steel highlight
    ("Gold_0",   "a87018"),   # 6  dark gold shade
    ("Gold_1",   "dfa528"),   # 7  rich warm gold
    ("Gold_2",   "fae04b"),   # 8  bright gold highlight
    ("Skin_0",   "c47861"),   # 9  warm skin shadow
    ("Skin_1",   "e8a882"),   # 10 warm peach skin mid
    ("Skin_2",   "f6c8a2"),   # 11 bright warm peach skin
    ("Eye_Lash", "20192a"),   # 12 serious dark lash / pupil
    ("Eye_Shd",  "9aa1bc"),   # 13 lavender-grey upper sclera shadow (Var 4!)
    ("Eye_Wht",  "ffffff"),   # 14 crisp white eye catchlight
    ("Wood_0",   "3d2a23"),   # 15 dark leather / bow / trousers shadow
    ("Wood_1",   "634436"),   # 16 warm wood bow / quiver / trousers
    ("Steel",    "c4cad6"),   # 17 steel arrowhead
]
PAL = np.stack([hexc(h) for _, h in PAL_NAMES])
P = {name: i for i, (name, _) in enumerate(PAL_NAMES)}

# ------------------------------------------------------------------ voxel grid
# Convention:
#   X: -left / +right (viewer's right when looking at FRONT)
#   Y: -Y = FRONT (character faces -Y!), +Y = BACK (ponytail & scarf trail +Y)
#   Z: 0 = ground, +Z = up
I, J, K = np.meshgrid(np.arange(W), np.arange(W), np.arange(H), indexing="ij")
X = I + 0.5 - W / 2.0
Y = J + 0.5 - W / 2.0
Z = K + 0.5

pal_idx = np.full((W, W, H), -1, np.int16)

def paint(mask, color_name):
    pal_idx[mask] = P[color_name]

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

# --------------------------------------------------- 1) BOOTS & LEGS (z=0..9.5)
# Agile heroic combat stance (wider planted boots for strong silhouette from all 8 angles)
leg_front = capsule((-2.8, -2.2, 0.8), (-2.2, -0.6, 9.5), 1.85, 2.0)
leg_back  = capsule(( 2.9,  2.4, 0.8), ( 2.0,  0.6, 9.5), 1.85, 2.0)
foot_f    = ellip(-2.8, -3.2, 1.2, 1.9, 2.6, 1.4) & (Z >= 0)
foot_b    = ellip( 2.9,  1.6, 1.2, 1.9, 2.4, 1.4) & (Z >= 0)

# Trousers (warm dark brown leather/cloth, z=4.5..10.5)
trousers = (leg_front | leg_back) & (Z >= 4.5) & (Z <= 10.5)
paint(trousers, "Wood_0")
paint(trousers & (Y < -0.5), "Wood_1")

# Dark rogue boots with steel cuff highlights (z=0..5.0)
boots = ((leg_front | leg_back) & (Z < 5.0)) | foot_f | foot_b
paint(boots, "Hair_0")
paint(boots & (Z >= 2.0) & (Z <= 4.0) & (Y < -1.0), "Hair_2")
paint(boots & (Z >= 3.8) & (Z <= 4.9), "Scarf_1")
paint(boots & (Z < 1.4), "Outline")

# --------------------------------------------------- 2) TORSO & WIDE DRAPED ROGUE MANTLE
torso = capsule((0.0, 0.0, 9.2), (0.0, 0.0, 17.5), 3.6, 3.3)
paint(torso, "Hair_1")
paint(torso & (Y < -1.2), "Hair_2")
belt = (torso | ellip(0.0, 0.0, 11.2, 4.1, 3.5, 1.2)) & (Z >= 10.4) & (Z <= 12.0)
paint(belt, "Hair_0")
paint(belt & (Y < -2.6) & (np.abs(X) < 1.5), "Gold_1")

# WIDE continuous billowing rogue mantle/cloak from shoulders (z=18.2) down to hem (z=3.0)!
# Rich width (flares out to ~10px radius = ~20px wide!) + natural draped fabric ripples
t_cl = np.clip((18.2 - Z) / 15.2, 0.0, 1.0)
ang_cl = np.arctan2(Y - (0.6 + 2.0 * t_cl), X)
# Organic billowing fabric pleats (5 soft vertical folds, deeper near the wide bottom hem!)
pleat = 1.0 + (0.09 * t_cl) * np.cos(ang_cl * 5.0 + 0.4) + (0.06 * t_cl) * np.sin(ang_cl * 3.0 - 0.6)
rx_cl = (5.4 + 4.8 * (t_cl ** 0.85)) * pleat
ry_cl = (3.8 + 4.4 * (t_cl ** 0.90)) * pleat
cy_cl = 0.7 + 2.4 * t_cl
d_cl = (X / rx_cl) ** 2 + ((Y - cy_cl) / ry_cl) ** 2

# Wide open front V-split so her chest, belt, trousers & planted combat boots show cleanly,
# while the mantle billows widely out to BOTH sides and sweeps behind her!
front_open_w = 2.6 + 2.4 * (t_cl ** 0.8)   # widens gracefully toward bottom
front_opening = (Y < -0.6 + 0.5 * t_cl) & (np.abs(X) < front_open_w)
# Also keep right bow-arm cutout clean at upper front-right so arm extends smoothly
arm_cut = (X > 3.2) & (Y < -1.4) & (Z >= 13.5) & (Z <= 18.0)

# Hollow shell with thick readable pixel-art fabric walls (d_cl in [0.58..1.0])
cloak = (Z >= 3.0) & (Z <= 18.2) & (d_cl <= 1.0) & (d_cl >= 0.54) & ~front_opening & ~arm_cut
paint(cloak, "Hair_1")

# Sculpted vertical fabric fold shading (ridges = Hair_2, deep troughs = Hair_0, inner lining = Hair_0)
ridge = np.cos(ang_cl * 5.0 + 0.4) > 0.28
trough = np.cos(ang_cl * 5.0 + 0.4) < -0.35
paint(cloak & ridge & (d_cl > 0.76), "Hair_2")
paint(cloak & (trough | (d_cl < 0.68)), "Hair_0")
# Crisp cloak lapel edges bordering the front opening
lapel = cloak & (Y < 0.2) & (np.abs(X) < front_open_w + 1.4) & (d_cl > 0.72)
paint(lapel, "Hair_2")

# Iconic bold GOLD HEM TRIM following the wide billowing cloak edge (z=3.0..5.0)
gold_hem = cloak & (Z <= 4.9)
paint(gold_hem, "Gold_1")
paint(gold_hem & (Z >= 3.9) & (d_cl > 0.76), "Gold_2")
paint(gold_hem & (Z < 3.6), "Gold_0")

# Broad sculpted mantle shoulder drape & lowered hood/cowl collar (z=15.5..19.5)
mantle_top = ellip(0.0, 0.5, 17.2, 6.4, 4.4, 2.4) & (Z >= 15.2) & (Z <= 19.2) & ~(
    (Y < -1.8) & (np.abs(X) < 2.6) & (Z < 17.8)
)
paint(mantle_top, "Hair_1")
paint(mantle_top & (Z >= 17.6), "Hair_2")
paint(mantle_top & (Z < 16.2), "Hair_0")
cowl = ellip(0.0, 1.5, 18.2, 5.2, 3.8, 1.6) & (Z >= 17.2) & (Z <= 19.5) & (Y > -2.0)
paint(cowl, "Hair_2")
paint(cowl & (Z >= 18.5), "Scarf_1")

# Flowing windswept S-wave grey scarf trailing behind shoulder
scarf_segs = [
    (( 1.6, 2.6, 17.4), ( 3.2,  6.2, 16.0), 1.45, 1.25),
    (( 3.2, 6.2, 16.0), ( 4.2, 10.0, 16.8), 1.25, 1.05),
    (( 4.2, 10.0, 16.8), ( 3.6, 13.8, 15.8), 1.05, 0.80),
]
scarf = np.zeros((W, W, H), bool)
for a, b, r0, r1 in scarf_segs:
    scarf |= capsule(a, b, r0, r1)
paint(scarf, "Scarf_1")
paint(scarf & (Z >= 16.6), "Scarf_2")
paint(scarf & (Z < 15.6), "Hair_2")

# --------------------------------------------------- 3) QUIVER + GOLD ARROWS (resting over wide cloak back)
quiver = capsule((-4.6, 3.8, 8.2), (-2.2, 5.6, 15.2), 1.45, 1.65)
paint(quiver, "Wood_0")
paint(quiver & (X < -3.5), "Wood_1")
for ox, oy in ((-0.55, 0.2), (0.5, -0.25), (0.05, 0.55)):
    shaft = capsule((-2.4 + ox, 5.4 + oy, 14.8), (-1.5 + ox * 1.4, 6.4 + oy * 1.4, 17.6), 0.62, 0.62)
    fletch = ellip(-1.4 + ox * 1.5, 6.5 + oy * 1.5, 17.8, 1.05, 1.05, 1.15)
    paint(shaft, "Wood_1")
    paint(fletch, "Gold_2")
    paint(fletch & (Z < 17.4), "Gold_1")

# --------------------------------------------------- 4) ARMS, RECURVE BOW & ARROW (clean gap from face!)
arm_bow = capsule((3.8, -0.6, 16.2), (6.0, -8.2, 16.0), 1.4, 1.2)
hand_bow = ellip(6.2, -9.2, 16.0, 1.35, 1.35, 1.2)
arm_draw = capsule((-3.8, -0.6, 16.2), (-1.2, -4.8, 16.0), 1.4, 1.2)
hand_draw = ellip(-0.4, -5.0, 16.0, 1.3, 1.25, 1.2)

paint(arm_bow | arm_draw, "Hair_1")
paint((arm_bow | arm_draw) & (Z >= 16.4), "Hair_2")
paint(hand_bow | hand_draw, "Skin_1")
paint((hand_bow | hand_draw) & (Z >= 16.3), "Skin_2")

# Sleek recurve bow held further forward (y=-9.8) so side profile of face is completely clear!
bow_pts = []
for s in np.linspace(-1.0, 1.0, 27):
    bz = 16.0 + s * 8.6
    by = -9.8 + 3.4 * (s * s) - 0.55 * (s ** 4)
    bx = 6.2
    bow_pts.append((bx, by, bz))
bow_mask = np.zeros((W, W, H), bool)
for p0, p1 in zip(bow_pts[:-1], bow_pts[1:]):
    bow_mask |= capsule(p0, p1, 0.85, 0.85)
paint(bow_mask, "Wood_0")
paint(bow_mask & (Y < -8.2), "Wood_1")
paint(bow_mask & (np.abs(Z - 16.0) > 7.2), "Gold_1")
paint(bow_mask & (np.abs(Z - 16.0) < 1.3), "Hair_0")

top_tip, bot_tip = bow_pts[-1], bow_pts[0]
nock_pt = (2.6, -5.0, 16.0)
bstring = capsule(top_tip, nock_pt, 0.56) | capsule(bot_tip, nock_pt, 0.56)
paint(bstring & (pal_idx < 0), "Outline")

arrow_shaft = capsule((2.6, -5.0, 16.0), (6.2, -13.0, 16.0), 0.62)
arrow_tip   = capsule((6.2, -12.4, 16.0), (6.4, -15.2, 16.0), 1.15, 0.45)
arrow_guard = ellip(6.2, -12.0, 16.0, 1.25, 0.9, 1.35)
paint(arrow_shaft, "Hair_0")
paint(arrow_guard, "Gold_2")
paint(arrow_tip, "Steel")

# --------------------------------------------------- 5) HEAD, HAIR & VARIANT-4 FACE (z=19..30)
neck = capsule((0.0, -0.2, 18.0), (0.0, -0.2, 20.6), 1.85, 1.7)
paint(neck, "Skin_0")

chin_taper = np.where(Z < 22.6, 0.72 + 0.28 * np.clip((Z - 19.4) / 3.2, 0.0, 1.0), 1.0)
head_r = ((X / (4.7 * chin_taper)) ** 2 + ((Y + 0.3) / (4.4 * chin_taper)) ** 2 + ((Z - 24.8) / 5.2) ** 2)
head = head_r <= 1.0
paint(head, "Skin_1")
paint(head & (Y < -1.4) & (Z >= 21.0), "Skin_2")
paint(head & (Z < 21.0), "Skin_0")

# NO LIPS! Raised Variant-4 serious narrow combat eyes (K == 24..25 on z=19..30 head!)
pad_h = np.pad(head, ((0, 0), (1, 0), (0, 0)), constant_values=False)
front_surf = head & ~pad_h[:, :-1, :]
cx_i = W // 2
eye_depth = front_surf | (head & np.roll(front_surf, 1, axis=1))

# Left eye (i=14 outer, 15 mid, 16 inner) & Right eye (i=19 inner, 20 mid, 21 outer)
paint(eye_depth & (K == 25) & ((I == cx_i - 4) | (I == cx_i - 3)), "Eye_Lash")
paint(eye_depth & (K == 25) & (I == cx_i - 2), "Skin_0")
paint(eye_depth & (K == 24) & (I == cx_i - 4), "Eye_Shd")
paint(eye_depth & (K == 24) & (I == cx_i - 3), "Eye_Wht")
paint(eye_depth & (K == 24) & (I == cx_i - 2), "Eye_Lash")

paint(eye_depth & (K == 25) & (I == cx_i + 1), "Skin_0")
paint(eye_depth & (K == 25) & ((I == cx_i + 2) | (I == cx_i + 3)), "Eye_Lash")
paint(eye_depth & (K == 24) & (I == cx_i + 1), "Eye_Lash")
paint(eye_depth & (K == 24) & (I == cx_i + 2), "Eye_Wht")
paint(eye_depth & (K == 24) & (I == cx_i + 3), "Eye_Shd")

# Full lush dark charcoal hair cap & bangs covering the ENTIRE forehead (ZERO bald spot!)
# Hair covers down to z=26.0 across the whole forehead right above the raised eye line (K=25)!
hair_shell = ellip(0.0, 0.1, 25.8, 5.5, 5.2, 5.3) & ~ellip(0.0, -2.0, 23.2, 4.3, 4.0, 3.8)
# Face cutout strictly BELOW the bangs (Z < 25.8, so forehead/temples are 100% covered by full hair!)
face_window = (Y < -0.5) & (np.abs(X) < 4.1) & (Z < 25.8)
# Full front bangs flush with forehead (no bald spot AND no visor-brim overhang hiding eyes at 3/4 tilt!)
front_bangs = (
    ellip(0.0, -0.1, 26.2, 5.2, 4.5, 4.9) &
    (Y < -1.2) & (Z >= 26.0)
)
bang_tips = (
    ellip(0.0, -0.1, 25.8, 5.1, 4.5, 5.0) &
    (Y < -2.2) & (Z >= 25.3) & (Z < 26.2) &
    ((np.abs(X) < 1.1) | (np.abs(X) > 3.2))
)
hair_cap = (hair_shell & ~face_window & (Z >= 20.2)) | front_bangs | bang_tips
side_locks = (
    capsule((-4.5, -0.5, 25.6), (-4.2, -0.7, 20.0), 1.2, 0.95) |
    capsule(( 4.5, -0.5, 25.6), ( 4.2, -0.7, 20.0), 1.2, 0.95)
)
hair_main = hair_cap | side_locks
paint(hair_main, "Hair_1")
paint(hair_main & (Z >= 28.4), "Hair_2")
paint(hair_main & (Z >= 29.6) & (np.abs(X) < 3.0), "Scarf_1")
paint(hair_main & (Z < 23.2), "Hair_0")
# Subtle dark root-line on bottom edge of bangs so they pop cleanly against forehead/eyes
paint(front_bangs & (Z < 26.5) & (Y < -3.2), "Hair_0")

# Lush windswept HIGH PONYTAIL streaming behind (+Y)
pony = (
    capsule((0.0,  6.2, 26.8), (-0.4, 10.0, 27.8), 2.4, 2.2) |
    capsule((-0.4, 10.0, 27.8), (-0.8, 13.8, 25.8), 2.1, 1.4) |
    capsule(( 0.8,  9.2, 26.2), ( 1.4, 12.6, 23.6), 1.7, 1.05) |
    capsule((-1.0,  8.6, 25.4), (-1.8, 11.8, 22.8), 1.4, 0.9)
)
paint(pony, "Hair_1")
paint(pony & (Z >= 28.0), "Hair_2")
paint(pony & (Z < 24.8), "Hair_0")

# Paint GOLD HAIR-TIE AFTER ponytail so it wraps cleanly around the base & shines in Top/Side/Back!
hair_tie = ellip(0.0, 5.6, 26.8, 2.35, 1.35, 2.35)
paint(hair_tie, "Gold_1")
paint(hair_tie & (Z >= 27.3), "Gold_2")
paint(hair_tie & (Z < 25.6), "Gold_0")

# Trim empty top slices
occ = pal_idx >= 0
zs = np.where(occ.any(axis=(0, 1)))[0]
H_USED = int(zs.max()) + 1
pal_idx = pal_idx[:, :, :H_USED]
occ = occ[:, :, :H_USED]

vox = np.zeros((W, W, H_USED, 4), np.uint8)
vox[occ, :3] = PAL[pal_idx[occ]]
vox[occ, 3] = 255
print(f"Archer Grid: {W}x{W}x{H_USED} | voxels={int(occ.sum())}")

# ------------------------------------------------------------------ PNG helper
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

# ----------------------------------------------------------- 1) slices
def slice_img(k):
    s = vox[:, :, k]
    return np.ascontiguousarray(np.transpose(s, (1, 0, 2))[::-1])

slices = [slice_img(k) for k in range(H_USED)]
for k, s in enumerate(slices):
    save_png(s, os.path.join(OUT, "slices", f"slice_{k:02d}.png"))
save_png(np.concatenate(slices, axis=1), os.path.join(OUT, "archer_stack_strip.png"))

# ----------------------------------------------------------- 2) 4-view sheet
# Top, Side (facing right!), Front, Back — crisp 1px dark outline
def ortho_proj(axis_vox):
    occ_a = axis_vox[..., 3] > 0
    first = np.argmax(occ_a, axis=2)
    has = occ_a.any(axis=2)
    ai, bi = np.meshgrid(np.arange(axis_vox.shape[0]), np.arange(axis_vox.shape[1]), indexing="ij")
    img = axis_vox[ai, bi, first].copy()
    img[~has] = 0
    return img

# vox indices: (i=X, j=Y, k=Z); Front faces -Y!
top_v   = np.transpose(ortho_proj(vox[:, :, ::-1]), (1, 0, 2))[::-1]
front_v = np.transpose(ortho_proj(np.transpose(vox, (0, 2, 1, 3))), (1, 0, 2))[::-1]
back_v  = np.transpose(ortho_proj(np.transpose(vox, (0, 2, 1, 3))[::-1, :, ::-1]), (1, 0, 2))[::-1]
# Right-side profile (looking from +X toward -X, so -Y front is on the RIGHT -> facing right!)
side_v  = np.transpose(ortho_proj(np.transpose(vox, (1, 2, 0, 3))[::-1, :, ::-1]), (1, 0, 2))[::-1]

ph = max(W, H_USED) + 6
pw = W + 6
def make_panel(im):
    p = np.zeros((ph, pw, 4), np.uint8)
    h0, w0 = im.shape[:2]
    p[ph - 3 - h0:ph - 3, (pw - w0) // 2:(pw - w0) // 2 + w0] = im
    return add_outline(p)

four_view = np.concatenate([make_panel(v) for v in (top_v, side_v, front_v, back_v)], axis=1)
save_png(four_view, os.path.join(OUT, "archer_4view.png"))
# Also save a 6x upscaled 4-view preview on neutral grey bg for crisp review!
fv_bg = np.full((four_view.shape[0], four_view.shape[1], 4), (62, 65, 72, 255), np.uint8)
m_fv = four_view[..., 3] > 0
fv_bg[m_fv] = four_view[m_fv]
save_png(fv_bg.repeat(6, 0).repeat(6, 1), os.path.join(OUT, "archer_4view_6x.png"))

# ----------------------------------------------------------- 3) stack renderer
R = int(math.ceil(W / 2 * 1.42)) + 3

def render_stack(theta, step=1.0, tilt=TILT, drop_t=None):
    extra_h = 22 if drop_t is not None else 0
    CW = 2 * R + 6
    CH = int(2 * R * tilt) + int(H_USED * step) + 10 + extra_h
    can = np.zeros((CH, CW, 4), np.uint8)
    cx, base_cy = CW / 2.0, CH - R * tilt - 5.0
    vv, uu = np.mgrid[0:CH, 0:CW].astype(np.float32) + 0.5
    c, s = math.cos(theta), math.sin(theta)
    for k, img in enumerate(slices):
        lift = 0.0
        if drop_t is not None:
            t0 = (k / H_USED) * 0.65
            t1 = t0 + 0.35
            if drop_t < t0:
                continue
            u = min(1.0, (drop_t - t0) / (t1 - t0))
            ease = 1.0 - (1.0 - u) ** 3
            lift = (1.0 - ease) * extra_h
        oy = base_cy - k * step - lift
        dx = uu - cx
        dy = (vv - oy) / tilt
        sx = c * dx + s * dy + W / 2.0
        sy = -s * dx + c * dy + W / 2.0
        xi, yi = np.floor(sx).astype(int), np.floor(sy).astype(int)
        ok = (xi >= 0) & (xi < W) & (yi >= 0) & (yi < W)
        px = np.zeros_like(can)
        px[ok] = img[yi[ok], xi[ok]]
        m = px[..., 3] > 0
        can[m] = px[m]
    return add_outline(can), (cx, base_cy)

frames = []
for d in range(DIRS):
    th = 2.0 * math.pi * d / DIRS
    im, base = render_stack(th)
    frames.append(im)
    save_png(im, os.path.join(OUT, "frames", f"rot_{d:02d}.png"))

# 8-angle turntable preview sheet on neutral slate stone floor bg (x5)
BG_COL = hexc("3e4148")
SH_COL = hexc("282a30")
tiles = []
for d in range(0, DIRS, 4):
    im = frames[d]
    hh, ww = im.shape[:2]
    bg = np.zeros((hh, ww, 4), np.uint8)
    bg[..., :3] = BG_COL; bg[..., 3] = 255
    vv, uu = np.mgrid[0:hh, 0:ww]
    sh = ((uu + 0.5 - base[0]) / 10.5) ** 2 + ((vv + 0.5 - base[1] + 1.0) / (10.5 * TILT)) ** 2 < 1.0
    bg[sh, :3] = SH_COL
    m = im[..., 3] > 0
    bg[m, :3] = im[m, :3]
    tiles.append(bg)
row1 = np.concatenate(tiles[:4], axis=1)
row2 = np.concatenate(tiles[4:], axis=1)
save_png(np.concatenate([row1, row2], axis=0).repeat(5, 0).repeat(5, 1),
         os.path.join(OUT, "archer_rot8_preview.png"))

# Demo GIF frames (drop-in + 360 spin, x5)
SC = 5
sample_im, sample_base = render_stack(0.0, drop_t=1.0)
DH, DW = sample_im.shape[:2]
def comp_demo(im, base_xy):
    bg = np.zeros((DH, DW, 4), np.uint8)
    bg[..., :3] = BG_COL; bg[..., 3] = 255
    vv, uu = np.mgrid[0:DH, 0:DW]
    sh = ((uu + 0.5 - base_xy[0]) / 10.5) ** 2 + ((vv + 0.5 - base_xy[1] + 1.0) / (10.5 * TILT)) ** 2 < 1.0
    bg[sh, :3] = SH_COL
    m = im[..., 3] > 0
    bg[m, :3] = im[m, :3]
    return bg.repeat(SC, 0).repeat(SC, 1)

demo_idx = 0
for step_i in range(20):
    t = step_i / 19.0
    im, bxy = render_stack(-0.4 + t * 0.4, drop_t=t)
    save_png(comp_demo(im, bxy), os.path.join(OUT, "demo_frames", f"demo_{demo_idx:03d}.png"))
    demo_idx += 1
for _ in range(4):
    im, bxy = render_stack(0.0, drop_t=1.0)
    save_png(comp_demo(im, bxy), os.path.join(OUT, "demo_frames", f"demo_{demo_idx:03d}.png"))
    demo_idx += 1
for d in range(DIRS):
    th = 2.0 * math.pi * d / DIRS
    im, bxy = render_stack(th, drop_t=1.0)
    save_png(comp_demo(im, bxy), os.path.join(OUT, "demo_frames", f"demo_{demo_idx:03d}.png"))
    demo_idx += 1

# ---------------------------------------------------- 4) PIXEL-ART BLENDER MODEL
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob, do_unlink=True)
for m in list(bpy.data.meshes):
    bpy.data.meshes.remove(m)
for mat in list(bpy.data.materials):
    bpy.data.materials.remove(mat)

scene = bpy.context.scene
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.view_settings.exposure = 0.0

world = bpy.data.worlds.new("PixelWorld")
scene.world = world
world.use_nodes = True
bg_node = world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs[0].default_value = (*srgb_to_linear(BG_COL), 1.0)
    bg_node.inputs[1].default_value = 1.0

def make_pixel_mat(name, rgb):
    mat = bpy.data.materials.new(name)
    lin = srgb_to_linear(rgb)
    mat.diffuse_color = (float(lin[0]), float(lin[1]), float(lin[2]), 1.0)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (float(lin[0]), float(lin[1]), float(lin[2]), 1.0)
    em.inputs["Strength"].default_value = 1.0
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return mat

mats = [make_pixel_mat(name, PAL[i]) for i, (name, _) in enumerate(PAL_NAMES)]
mat_floor = make_pixel_mat("Floor", BG_COL)
mat_sh    = make_pixel_mat("Shadow", SH_COL)

col_slices = bpy.data.collections.new("Archer_Slices")
col_env = bpy.data.collections.new("Environment")
scene.collection.children.link(col_slices)
scene.collection.children.link(col_env)

pivot = bpy.data.objects.new("Archer_Pivot", None)
pivot.empty_display_type = "PLAIN_AXES"
pivot.empty_display_size = 4.0
col_slices.objects.link(pivot)

CUBE_FACES = [
    (( 1, 0, 0), ((1,0,0), (1,1,0), (1,1,1), (1,0,1))),
    ((-1, 0, 0), ((0,1,0), (0,0,0), (0,0,1), (0,1,1))),
    (( 0, 1, 0), ((1,1,0), (0,1,0), (0,1,1), (1,1,1))),
    (( 0,-1, 0), ((0,0,0), (1,0,0), (1,0,1), (0,0,1))),
    (( 0, 0, 1), ((0,0,1), (1,0,1), (1,1,1), (0,1,1))),
    (( 0, 0,-1), ((0,1,0), (1,1,0), (1,0,0), (0,0,0))),
]

for k in range(H_USED):
    bm = bmesh.new()
    used_mats = {}
    xs, ys = np.where(occ[:, :, k])
    for i, j in zip(xs.tolist(), ys.tolist()):
        mi = int(pal_idx[i, j, k])
        if mi not in used_mats:
            used_mats[mi] = len(used_mats)
        slot = used_mats[mi]
        x0, y0 = i - W / 2.0, j - W / 2.0
        for (dx, dy, dz), corners in CUBE_FACES:
            ni, nj = i + dx, j + dy
            if dz == 0 and 0 <= ni < W and 0 <= nj < W and occ[ni, nj, k]:
                continue
            vs = [bm.verts.new((x0 + cx, y0 + cy, cz)) for cx, cy, cz in corners]
            f = bm.faces.new(vs)
            f.material_index = slot
            f.smooth = False
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    me = bpy.data.meshes.new(f"Slice_{k:02d}")
    bm.to_mesh(me); bm.free()
    for mi, _ in sorted(used_mats.items(), key=lambda kv: kv[1]):
        me.materials.append(mats[mi])
    ob = bpy.data.objects.new(f"Slice_{k:02d}", me)
    ob.parent = pivot
    ob.location = (0.0, 0.0, float(k))
    col_slices.objects.link(ob)

    f_start = 1 + int(k * 0.85)
    f_land = f_start + 12
    ob.location.z = float(k) + 20.0
    ob.keyframe_insert("location", index=2, frame=1)
    if f_start > 1:
        ob.keyframe_insert("location", index=2, frame=f_start)
    ob.location.z = float(k)
    ob.keyframe_insert("location", index=2, frame=f_land)

pivot.rotation_euler = (0.0, 0.0, 0.0)
pivot.keyframe_insert("rotation_euler", index=2, frame=1)
pivot.keyframe_insert("rotation_euler", index=2, frame=46)
pivot.rotation_euler = (0.0, 0.0, 2.0 * math.pi)
pivot.keyframe_insert("rotation_euler", index=2, frame=126)

scene.frame_start = 1
scene.frame_end = 126
scene.frame_set(48)

# Pixel shadow pad
bm = bmesh.new()
for ix in range(-14, 15):
    for iy in range(-14, 15):
        if ((ix + 0.5) / 10.5) ** 2 + ((iy + 0.5) / 10.5) ** 2 < 1.0:
            vs = [bm.verts.new((ix + cx, iy + cy, 0.0)) for cx, cy in ((0,0), (1,0), (1,1), (0,1))]
            f = bm.faces.new(vs); f.material_index = 0; f.smooth = False
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
sme = bpy.data.meshes.new("PixelShadow")
bm.to_mesh(sme); bm.free()
sme.materials.append(mat_sh)
sh_ob = bpy.data.objects.new("PixelShadow", sme)
sh_ob.location = (0.0, 0.0, -0.02)
col_env.objects.link(sh_ob)

cam_data = bpy.data.cameras.new("PixelCam")
cam_data.type = "ORTHO"; cam_data.ortho_scale = 52.0
cam = bpy.data.objects.new("PixelCam", cam_data)
col_env.objects.link(cam)
target = Vector((0.0, 0.0, H_USED * 0.5))
cam_dir = Vector((0.35, -math.cos(math.radians(38)), math.sin(math.radians(38)))).normalized()
cam.location = target + cam_dir * 90.0
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam

scene.render.engine = "BLENDER_WORKBENCH"
scene.display.render_aa = "OFF"
scene.display.viewport_aa = "OFF"
scene.display.shading.light = "FLAT"
scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_object_outline = True
scene.display.shading.object_outline_color = tuple(srgb_to_linear(PAL[P["Outline"]]))
scene.display.shading.background_type = "VIEWPORT"
scene.display.shading.background_color = tuple(srgb_to_linear(BG_COL))
scene.render.resolution_x = 80; scene.render.resolution_y = 80
scene.render.filter_size = 0.01

rot_vp = Quaternion((0, 0, 1), math.radians(24)) @ Quaternion((1, 0, 0), math.radians(52))
for scr in bpy.data.screens:
    for area in scr.areas:
        if area.type == "VIEW_3D":
            sp = area.spaces.active
            sp.shading.type = "SOLID"
            sp.shading.light = "FLAT"
            sp.shading.color_type = "MATERIAL"
            sp.shading.show_object_outline = True
            sp.shading.object_outline_color = tuple(srgb_to_linear(PAL[P["Outline"]]))
            sp.shading.background_type = "VIEWPORT"
            sp.shading.background_color = tuple(srgb_to_linear(BG_COL))
            sp.overlay.show_floor = False
            sp.overlay.show_axis_x = False
            sp.overlay.show_axis_y = False
            sp.overlay.show_cursor = False
            sp.overlay.show_relationship_lines = False
            sp.clip_end = 2000.0
            r3d = sp.region_3d
            r3d.view_perspective = "ORTHO"
            r3d.view_location = target
            r3d.view_distance = 62.0
            r3d.view_rotation = rot_vp

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "archer_model.blend"))

meta = {
    "slice_w": W, "slice_h": W, "slices": H_USED, "directions": DIRS,
    "tilt": TILT, "frame_w": int(frames[0].shape[1]), "frame_h": int(frames[0].shape[0]),
    "demo_frames": demo_idx,
    "palette": {name: "#" + h for name, h in PAL_NAMES},
    "slice_order": "bottom (0) -> top",
    "strip": "archer_stack_strip.png",
}
with open(os.path.join(OUT, "archer_stack.json"), "w") as f:
    json.dump(meta, f, indent=2)
print("DONE", json.dumps(meta))
