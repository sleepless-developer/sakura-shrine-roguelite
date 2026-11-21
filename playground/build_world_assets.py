# -----------------------------------------------------------------------------
# World Sprite-Stack Asset Pack Builder (Blender 5.x, background mode)
#
# Generates towering, properly proportioned pixel-art sprite-stack trees
# (relative to the 32px-tall rogue archer!) + animated enemy test dummies:
#   - tree_oak_strip.png    (48x48, 46 slices) — big lush green oak
#   - tree_pine_strip.png   (42x42, 54 slices) — tall tiered evergreen spruce
#   - tree_autumn_strip.png (46x46, 44 slices) — golden-crimson autumn maple
#   - enemy_dummy_strip.png (28x28, 26 slices x 4 walk frames) — test dummy bots
# -----------------------------------------------------------------------------
import os, math
import bpy
import numpy as np

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), "assets"))
os.makedirs(OUT, exist_ok=True)

def hexc(s):
    s = s.lstrip("#")
    return np.array([int(s[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.uint8)

def save_png(arr, path):
    h0, w0 = arr.shape[:2]
    im = bpy.data.images.new("tmp_w", w0, h0, alpha=True)
    im.colorspace_settings.name = "sRGB"
    im.pixels.foreach_set((arr[::-1].astype(np.float32) / 255.0).ravel())
    im.filepath_raw = path; im.file_format = "PNG"; im.save()
    bpy.data.images.remove(im)

def add_outline(img, col):
    out = img.copy()
    a = out[..., 3] > 0
    grow = a.copy()
    grow[1:] |= a[:-1]; grow[:-1] |= a[1:]
    grow[:, 1:] |= a[:, :-1]; grow[:, :-1] |= a[:, 1:]
    edge = grow & ~a
    out[edge, :3] = col; out[edge, 3] = 255
    return out

def vox_to_strip(vox):
    h_u = vox.shape[2]
    slices = [np.ascontiguousarray(np.transpose(vox[:, :, k], (1, 0, 2))[::-1]) for k in range(h_u)]
    return np.concatenate(slices, axis=1), slices

def preview_stack(slices, w, outline_col, theta=0.35, tilt=0.68):
    h_u = len(slices)
    R = int(math.ceil(w / 2 * 1.42)) + 3
    cw = 2 * R + 6
    ch = int(2 * R * tilt) + h_u + 10
    can = np.zeros((ch, cw, 4), np.uint8)
    cx, base_cy = cw / 2.0, ch - R * tilt - 5.0
    vv, uu = np.mgrid[0:ch, 0:cw].astype(np.float32) + 0.5
    c, s = math.cos(theta), math.sin(theta)
    for k, img in enumerate(slices):
        oy = base_cy - k
        dx = uu - cx; dy = (vv - oy) / tilt
        sx = c * dx + s * dy + w / 2.0
        sy = -s * dx + c * dy + w / 2.0
        xi, yi = np.floor(sx).astype(int), np.floor(sy).astype(int)
        ok = (xi >= 0) & (xi < w) & (yi >= 0) & (yi < w)
        px = np.zeros_like(can); px[ok] = img[yi[ok], xi[ok]]
        m = px[..., 3] > 0; can[m] = px[m]
    return add_outline(can, outline_col)

def seg_dist_sq(X, Y, Z, a, b, r0, r1):
    ax, ay, az = a; bx, by, bz = b
    vx, vy, vz = bx - ax, by - ay, bz - az
    l2 = vx * vx + vy * vy + vz * vz + 1e-8
    t = np.clip(((X - ax) * vx + (Y - ay) * vy + (Z - az) * vz) / l2, 0.0, 1.0)
    cx, cy, cz = ax + t * vx, ay + t * vy, az + t * vz
    rad = r0 + t * (r1 - r0)
    return ((X - cx) ** 2 + (Y - cy) ** 2 + (Z - cz) ** 2) / (rad * rad)

# ====================================================== 1) BIG OAK & AUTUMN MAPLE
def build_broadleaf_tree(W, H, scale, lobes_raw, leaf_hex, bark_hex, out_hex):
    pal = np.stack([hexc(out_hex)] + [hexc(h) for h in leaf_hex] + [hexc(h) for h in bark_hex])
    I, J, K = np.meshgrid(np.arange(W), np.arange(W), np.arange(H), indexing="ij")
    X, Y, Z = I + 0.5 - W / 2.0, J + 0.5 - W / 2.0, K + 0.5

    s = scale
    trunk_segs = [
        ((0.0, 0.0, 0.0), (0.8 * s, -0.4 * s, 9.5 * s), 4.2 * s, 3.3 * s),
        ((0.8 * s, -0.4 * s, 9.5 * s), (0.0, 0.3 * s, 19.5 * s), 3.3 * s, 3.0 * s),
        # 5 gnarled root flares
        ((0.0, 0.0, 3.2 * s), ( 7.2 * s, -3.0 * s, 0.5), 2.7 * s, 1.6 * s),
        ((0.0, 0.0, 3.2 * s), (-6.8 * s, -3.4 * s, 0.5), 2.7 * s, 1.6 * s),
        ((0.0, 0.0, 3.2 * s), ( 3.6 * s,  6.8 * s, 0.5), 2.5 * s, 1.5 * s),
        ((0.0, 0.0, 3.2 * s), (-5.8 * s,  4.8 * s, 0.5), 2.5 * s, 1.5 * s),
        ((0.0, 0.0, 3.2 * s), (-0.4 * s, -6.8 * s, 0.5), 2.3 * s, 1.4 * s),
        # Sturdy boughs
        ((0.2 * s, 0.0, 15.0 * s), (-7.8 * s, -1.6 * s, 23.0 * s), 2.5 * s, 1.6 * s),
        ((0.2 * s, 0.0, 15.5 * s), ( 7.8 * s,  1.8 * s, 23.5 * s), 2.5 * s, 1.6 * s),
        ((0.2 * s, 0.0, 15.0 * s), (-0.8 * s, -7.2 * s, 22.0 * s), 2.4 * s, 1.5 * s),
        ((0.2 * s, 0.0, 15.5 * s), ( 1.4 * s,  7.2 * s, 23.0 * s), 2.4 * s, 1.5 * s),
    ]
    bd = np.full((W, W, H), 999.0, np.float32)
    for a, b, r0, r1 in trunk_segs:
        bd = np.minimum(bd, seg_dist_sq(X, Y, Z, a, b, r0, r1))
    occ_bark = (bd <= 1.0) & (K >= 0)

    lobes = [(cx * s, cy * s, cz * s, rx * s, ry * s, rz * s) for (cx, cy, cz, rx, ry, rz) in lobes_raw]
    ld = np.empty((len(lobes), W, W, H), np.float32)
    for idx, (cx, cy, cz, rx, ry, rz) in enumerate(lobes):
        ld[idx] = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 + ((Z - cz) / rz) ** 2
    order = np.argsort(ld, axis=0)
    owner = order[0]
    d1 = np.take_along_axis(ld, order[0:1], axis=0)[0]
    d2 = np.take_along_axis(ld, order[1:2], axis=0)[0]

    occ_leaf = d1 <= 1.0
    occ_bark = occ_bark & ~occ_leaf
    occ = occ_bark | occ_leaf
    above = np.cumsum(occ[:, :, ::-1].astype(np.int32), axis=2)[:, :, ::-1] - occ.astype(np.int32)
    pad = np.pad(occ, ((1, 1), (1, 1), (0, 0)), constant_values=False)
    hedge = occ & (~pad[:-2, 1:-1, :] | ~pad[2:, 1:-1, :] | ~pad[1:-1, :-2, :] | ~pad[1:-1, 2:, :])

    cxa = np.array([l[0] for l in lobes], np.float32)[owner]
    cya = np.array([l[1] for l in lobes], np.float32)[owner]
    cza = np.array([l[2] for l in lobes], np.float32)[owner]
    rxa = np.array([l[3] for l in lobes], np.float32)[owner]
    rya = np.array([l[4] for l in lobes], np.float32)[owner]
    rza = np.array([l[5] for l in lobes], np.float32)[owner]
    nx, ny, nz = (X - cxa) / rxa, (Y - cya) / rya, (Z - cza) / rza
    nl = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-6
    nx, ny, nz = nx / nl, ny / nl, nz / nl

    ndotl = -0.10 * nx + 0.10 * ny + 0.99 * nz
    zl = Z[occ_leaf]
    hn = (Z - zl.min()) / max(1.0, zl.max() - zl.min())
    val = 0.42 + 0.56 * ndotl + 0.22 * (hn - 0.5)
    val = np.where(above >= 6, val - 0.34, np.where(above >= 2, val - 0.16, val))
    val = np.where((d2 < 1.24) & (nz < 0.48), val - 0.24, val)
    val = np.where(nz < -0.22, val - 0.26, val)

    lc = np.where(val < 0.22, 1, np.where(val < 0.48, 2, np.where(val < 0.74, 3, np.where(val < 0.95, 4, 5))))
    low_rim = occ_leaf & hedge & (nz < -0.08)
    lc = np.where(low_rim & (nz < -0.32), 0, np.where(low_rim, 1, lc))

    ang = np.arctan2(Y, X)
    flute = np.sin(ang * 5.0 + 0.4) * 0.5 + 0.5
    bv = 0.48 + 0.38 * flute
    bv = np.where(above >= 4, bv - 0.30, bv)
    bv = np.where(K >= int(16 * s), bv - 0.25, bv)
    bc = np.where(bv < 0.28, 7, np.where(bv < 0.68, 8, 9))
    bc = np.where((K == 0) & hedge, 6, bc)

    pidx = np.full((W, W, H), -1, np.int16)
    pidx[occ_leaf] = lc[occ_leaf]
    pidx[occ_bark] = bc[occ_bark]
    zs = np.where(occ.any(axis=(0, 1)))[0]
    hu = int(zs.max()) + 1
    vox = np.zeros((W, W, hu, 4), np.uint8)
    vox[occ[:, :, :hu], :3] = pal[pidx[:, :, :hu][occ[:, :, :hu]]]
    vox[occ[:, :, :hu], 3] = 255
    return vox, hexc(out_hex)

OAK_LOBES = [
    (-2.8,  1.8, 33.0, 9.2, 8.8, 7.0),
    ( 4.2, -1.6, 31.4, 8.4, 8.2, 6.4),
    (-9.4, -3.0, 24.8, 8.4, 8.0, 6.2),
    ( 9.4,  2.4, 26.0, 8.4, 8.0, 6.2),
    (-2.6, -8.6, 23.8, 8.0, 7.6, 6.0),
    ( 6.4, -7.0, 25.0, 7.6, 7.2, 5.8),
    ( 1.6,  9.2, 25.6, 8.8, 8.0, 6.2),
    (-7.4,  6.4, 27.8, 7.6, 7.2, 5.8),
    ( 7.4,  6.8, 23.2, 6.8, 6.6, 5.4),
]
oak_vox, oak_out = build_broadleaf_tree(
    54, 54, 1.20, OAK_LOBES,
    ["163a47", "1d6149", "339445", "6ec244", "b6e352"],
    ["2b1718", "542c24", "824832", "b36f47"],
    "141e28",
)
oak_strip, oak_sl = vox_to_strip(oak_vox)
save_png(oak_strip, os.path.join(OUT, "tree_oak_strip.png"))
print(f"OAK: {oak_vox.shape[0]}x{oak_vox.shape[1]}x{oak_vox.shape[2]}")

AUTUMN_LOBES = [
    ( 2.2,  1.2, 31.5, 8.6, 8.4, 6.6),
    (-4.0, -1.8, 29.8, 8.0, 7.6, 6.0),
    (-8.8,  2.4, 24.2, 8.0, 7.8, 6.0),
    ( 8.8, -2.2, 24.8, 8.2, 7.8, 6.0),
    ( 1.8, -8.2, 23.5, 7.8, 7.4, 5.8),
    (-5.8, -6.4, 24.4, 7.2, 7.0, 5.4),
    (-1.4,  8.6, 24.8, 8.4, 7.8, 6.0),
    ( 6.8,  6.0, 26.8, 7.4, 7.0, 5.6),
]
aut_vox, aut_out = build_broadleaf_tree(
    52, 52, 1.12, AUTUMN_LOBES,
    ["6e1f26", "b53b26", "e07028", "f2ac32", "fce258"],
    ["3b2824", "75594c", "a88d7c", "d4c2b2"],   # pale warm birch-tan bark!
    "24141a",
)
aut_strip, aut_sl = vox_to_strip(aut_vox)
save_png(aut_strip, os.path.join(OUT, "tree_autumn_strip.png"))
print(f"AUTUMN: {aut_vox.shape[0]}x{aut_vox.shape[1]}x{aut_vox.shape[2]}")

# ====================================================== 2) TALL TIERED EVERGREEN PINE (42x42x54!)
def build_pine():
    W, H = 42, 56
    pal = np.stack([hexc(h) for h in (
        "101c26",                                        # 0 outline
        "102d3b", "174c52", "227556", "3da654", "86d658",# 1..5 cool evergreen needles
        "241313", "4a261e", "733e2c", "9e5c3e",          # 6..9 dark spruce bark
    )])
    I, J, K = np.meshgrid(np.arange(W), np.arange(W), np.arange(H), indexing="ij")
    X, Y, Z = I + 0.5 - W / 2.0, J + 0.5 - W / 2.0, K + 0.5

    # Straight tall trunk + 4 roots
    bd = seg_dist_sq(X, Y, Z, (0, 0, 0), (0, 0, 20), 3.4, 2.4)
    for rx, ry in ((5.8, -2.0), (-5.5, -2.5), (2.5, 5.5), (-3.8, 4.2)):
        bd = np.minimum(bd, seg_dist_sq(X, Y, Z, (0, 0, 3.0), (rx, ry, 0.5), 2.1, 1.3))
    occ_bark = (bd <= 1.0) & (K >= 0)

    # 5 stacked scalloped conical bough tiers (tall dramatic evergreen spire!)
    ang = np.arctan2(Y, X)
    r_xy = np.sqrt(X * X + Y * Y)
    tiers = [
        # (z_bot, z_top, r_bot, r_top, n_boughs, phase)
        (10.0, 23.0, 17.5,  6.0, 7, 0.2),
        (19.0, 32.0, 14.8,  5.0, 7, 0.7),
        (28.0, 40.0, 11.8,  3.8, 6, 1.3),
        (36.0, 47.0,  8.6,  2.5, 5, 0.5),
        (43.0, 54.0,  5.5,  0.6, 5, 1.1),
    ]
    occ_leaf = np.zeros((W, W, H), bool)
    tier_u = np.zeros((W, W, H), np.float32)   # 0 at bottom of tier, 1 at top
    tier_r = np.zeros((W, W, H), np.float32)   # 0 at centre, 1 at scalloped tip
    tier_id = np.full((W, W, H), -1, np.int16)

    for tid, (zb, zt, rb, rt, nb, ph) in enumerate(tiers):
        u = (Z - zb) / (zt - zb)
        # Scalloped evergreen boughs (droopy outer lobes!)
        scallop = 1.0 + 0.16 * (1.0 - u) * np.cos(ang * nb + ph)
        rmax = (rb + (rt - rb) * (u ** 0.85)) * scallop
        in_t = (Z >= zb) & (Z <= zt) & (r_xy <= rmax)
        occ_leaf |= in_t
        tier_u = np.where(in_t, u, tier_u)
        tier_r = np.where(in_t, r_xy / np.maximum(rmax, 1.0), tier_r)
        tier_id = np.where(in_t, tid, tier_id)

    occ_bark = occ_bark & ~occ_leaf
    occ = occ_bark | occ_leaf
    above = np.cumsum(occ[:, :, ::-1].astype(np.int32), axis=2)[:, :, ::-1] - occ.astype(np.int32)
    pad = np.pad(occ, ((1, 1), (1, 1), (0, 0)), constant_values=False)
    hedge = occ & (~pad[:-2, 1:-1, :] | ~pad[2:, 1:-1, :] | ~pad[1:-1, :-2, :] | ~pad[1:-1, 2:, :])

    # Crisp tiered pine shading: tips & upper slopes of each tier are bright; undersides deep blue-teal!
    hn = np.clip((Z - 10.0) / 44.0, 0.0, 1.0)
    val = 0.24 + 0.44 * tier_u + 0.24 * hn + 0.14 * tier_r
    val = np.where(above >= 5, val - 0.34, np.where(above >= 2, val - 0.16, val))
    # Dark underside lip at the very bottom 2 slices of each tier -> iconic layered pine look!
    val = np.where(tier_u < 0.16, val - 0.30, val)
    lc = np.where(val < 0.25, 1, np.where(val < 0.48, 2, np.where(val < 0.72, 3, np.where(val < 0.92, 4, 5))))
    lc = np.where(occ_leaf & hedge & (tier_u < 0.14), 0, lc)

    flute = np.sin(ang * 4.0) * 0.5 + 0.5
    bv = 0.42 + 0.38 * flute - np.where(above >= 3, 0.28, 0.0)
    bc = np.where(bv < 0.30, 7, np.where(bv < 0.65, 8, 9))
    bc = np.where((K == 0) & hedge, 6, bc)

    pidx = np.full((W, W, H), -1, np.int16)
    pidx[occ_leaf] = lc[occ_leaf]
    pidx[occ_bark] = bc[occ_bark]
    zs = np.where(occ.any(axis=(0, 1)))[0]
    hu = int(zs.max()) + 1
    vox = np.zeros((W, W, hu, 4), np.uint8)
    vox[occ[:, :, :hu], :3] = pal[pidx[:, :, :hu][occ[:, :, :hu]]]
    vox[occ[:, :, :hu], 3] = 255
    return vox, pal[0]

pine_vox, pine_out = build_pine()
pine_strip, pine_sl = vox_to_strip(pine_vox)
save_png(pine_strip, os.path.join(OUT, "tree_pine_strip.png"))
print(f"PINE: {pine_vox.shape[0]}x{pine_vox.shape[1]}x{pine_vox.shape[2]}")

# ====================================================== 3) SPRITE-STACK ENEMY TEST DUMMIES (28x28x26 x 4f!)
def build_dummy_frame(stride=0.0, bob=0.0):
    W, H = 28, 26
    pal = np.stack([hexc(h) for h in (
        "1a1018",                                  # 0 outline
        "59392a", "8c5d41", "bd8a62", "e0ba94",    # 1..4 carved training-dummy wood / straw
        "4f1522", "9e2234", "e03848", "ff7582",    # 5..8 crimson enemy band / glowing visor / target chest
        "353945", "5c6375", "9aa2b5",              # 9..11 iron helmet / shoulder rivets
        "ffffff",                                  # 12 white bullseye ring
    )])
    I, J, K = np.meshgrid(np.arange(W), np.arange(W), np.arange(H), indexing="ij")
    X, Y, Z = I + 0.5 - W / 2.0, J + 0.5 - W / 2.0, K + 0.5
    pidx = np.full((W, W, H), -1, np.int16)
    def paint(m, i): pidx[m] = i

    def cap(a, b, r0, r1=None):
        return seg_dist_sq(X, Y, Z, a, b, r0, r0 if r1 is None else r1) <= 1.0
    def el(cx, cy, cz, rx, ry, rz):
        return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 + ((Z - cz) / rz) ** 2 <= 1.0

    # Stubby animated wooden peg legs!
    ly_l = stride * 2.6; ly_r = -stride * 2.6
    lz_l = 0.8 + max(0.0, -stride) * 1.8; lz_r = 0.8 + max(0.0, stride) * 1.8
    legs = cap((-2.4, ly_l, lz_l), (-2.0, 0.0, 6.8 + bob), 1.6, 1.7) | \
           cap(( 2.4, ly_r, lz_r), ( 2.0, 0.0, 6.8 + bob), 1.6, 1.7)
    paint(legs, 1)
    paint(legs & (Y < -0.5), 2)
    paint(legs & (Z < 2.2), 9)   # iron foot caps

    # Chunky wooden barrel-torso training dummy with painted red-white bullseye on front & back!
    body = cap((0, 0, 7.2 + bob), (0, 0, 15.6 + bob), 4.2, 4.4)
    paint(body, 2)
    paint(body & (Y < -1.2), 3)
    paint(body & (Z < 9.0 + bob), 1)
    # Iron waist band & shoulder straps
    paint(body & (Z >= 7.5 + bob) & (Z <= 9.2 + bob), 9)
    paint(body & (Z >= 14.4 + bob), 10)
    # Crimson + white bullseye target painted on chest (-Y)!
    front_b = body & (Y < -2.6)
    r_bull = np.sqrt(X * X + (Z - (11.8 + bob)) ** 2)
    paint(front_b & (r_bull < 3.0), 12)
    paint(front_b & (r_bull < 2.1), 7)
    paint(front_b & (r_bull < 1.1), 12)

    # Stubby swinging wooden cross-arms with iron fists!
    arm_l = cap((-4.4, 0, 13.8 + bob), (-7.2, -1.6 - stride * 2.2, 11.4 + bob), 1.5, 1.3)
    arm_r = cap(( 4.4, 0, 13.8 + bob), ( 7.2, -1.6 + stride * 2.2, 11.4 + bob), 1.5, 1.3)
    paint(arm_l | arm_r, 2)
    paint((arm_l | arm_r) & (Z >= 13.0 + bob), 3)
    paint((arm_l | arm_r) & (np.abs(X) > 5.8), 10)  # iron fists

    # Neck & round training-dummy head with dark iron bandit-cap & GLOWING CRIMSON VISOR EYES!
    paint(cap((0, 0, 15.5 + bob), (0, 0, 18.0 + bob), 1.8, 1.7), 1)
    head = el(0, 0, 20.4 + bob, 4.2, 4.0, 4.0)
    paint(head, 3)
    paint(head & (Y < -1.0), 4)
    paint(head & (Z < 18.5 + bob), 2)
    # Dark iron helmet / crimson headband
    helm = head & (Z >= 21.4 + bob)
    paint(helm, 9)
    paint(helm & (Z >= 23.0 + bob), 10)
    band = head & (Z >= 20.6 + bob) & (Z < 21.8 + bob)
    paint(band, 6)
    paint(band & (Y < -2.0), 7)
    # Glowing crimson eyes on front face!
    f_head = head & (Y < -2.4)
    paint(f_head & (np.abs(Z - (19.8 + bob)) < 1.0) & (np.abs(X) >= 1.1) & (np.abs(X) <= 2.9), 7)
    paint(f_head & (np.abs(Z - (19.8 + bob)) < 0.7) & (np.abs(X) >= 1.5) & (np.abs(X) <= 2.3), 8)

    occ = pidx >= 0
    vox = np.zeros((W, W, H, 4), np.uint8)
    vox[occ, :3] = pal[pidx[occ]]
    vox[occ, 3] = 255
    return vox, pal[0]

dummy_frames = [
    dict(stride= 0.0, bob=0.0),
    dict(stride= 1.0, bob=1.1),
    dict(stride= 0.0, bob=0.2),
    dict(stride=-1.0, bob=1.1),
]
d_rows = []
dummy_sl0 = None
for fi, kw in enumerate(dummy_frames):
    dv, dout = build_dummy_frame(**kw)
    st, sl = vox_to_strip(dv)
    if fi == 0: dummy_sl0 = sl
    d_rows.append(st)
save_png(np.concatenate(d_rows, axis=0), os.path.join(OUT, "enemy_dummy_strip.png"))
print("DUMMY: 28x28x26 x 4 frames OK")

# ====================================================== 4) PROPORTION COMPARISON PREVIEW
# Put Archer + Enemy Dummy + Autumn + Oak + Pine side-by-side at EXACT 1:1 pixel scale!
archer_strip_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sprite-stack", "out", "archer_stack_strip.png"))
aim = bpy.data.images.load(archer_strip_path)
aw, ah = aim.size
aarr = (np.array(aim.pixels[:], np.float32).reshape(ah, aw, 4)[::-1] * 255).round().astype(np.uint8)
bpy.data.images.remove(aim)
archer_sl = [aarr[:, k * 36:(k + 1) * 36] for k in range(aw // 36)]

previews = [
    preview_stack(archer_sl, 36, hexc("131223"), theta=0.45),
    preview_stack(dummy_sl0, 28, dout,           theta=0.35),
    preview_stack(aut_sl,    52, aut_out,        theta=0.35),
    preview_stack(oak_sl,    54, oak_out,        theta=0.35),
    preview_stack(pine_sl,   42, pine_out,       theta=0.35),
]
max_h = max(p.shape[0] for p in previews) + 12
tot_w = sum(p.shape[1] for p in previews) + 20
lineup = np.full((max_h, tot_w, 4), (94, 168, 60, 255), np.uint8)
x_cur = 10
for p in previews:
    ph, pw = p.shape[:2]
    y0 = max_h - 6 - ph
    m = p[..., 3] > 0
    lineup[y0:y0 + ph, x_cur:x_cur + pw][m] = p[m]
    x_cur += pw
save_png(lineup.repeat(3, 0).repeat(3, 1), os.path.join(OUT, "world_assets_preview.png"))
print("WORLD_ASSETS_DONE")
