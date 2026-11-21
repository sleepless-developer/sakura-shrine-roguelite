# -----------------------------------------------------------------------------
# Japanese Sakura Shrine Biome Sprite-Stack Asset Builder (Blender 5.x)
#
# Palette grounded in the Mt. Fuji + Kyoto Temple reference photos:
#   - Sakura coral-pink (#ea7b83 / #f7b2bc / #ffe4ea)
#   - Vermilion shrine lacquer (#c9382a / #96231b)
#   - Curved dark-slate roof tiles (#343942 / #525b68 / #747f8f)
#   - Warm Kyoto wood & gold temple finials (#f7c552 / #dfa528)
#
# Generates:
#   - tree_sakura_strip.png  (56x56, 48 slices) — big lush cherry blossom tree
#   - pagoda_strip.png       (64x64, 66 slices) — 3-tier Japanese pagoda
#   - torii_strip.png        (52x52, 44 slices) — vermilion torii shrine gate
#   - lantern_strip.png      (20x20, 26 slices) — stone toro lantern (warm glow)
#   - enemy_boss_strip.png   (44x44, 42 slices x 4 walk frames) — Oni Golem Boss
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
    im = bpy.data.images.new("tmp_j", w0, h0, alpha=True)
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
    slices = [np.ascontiguousarray(np.transpose(vox[:, :, k], (1, 0, 2))[::-1]) for k in range(vox.shape[2])]
    return np.concatenate(slices, axis=1), slices

def preview_stack(slices, w, outline_col, theta=0.42, tilt=0.68):
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

def seg_d2(X, Y, Z, a, b, r0, r1):
    ax, ay, az = a; bx, by, bz = b
    vx, vy, vz = bx - ax, by - ay, bz - az
    l2 = vx * vx + vy * vy + vz * vz + 1e-8
    t = np.clip(((X - ax) * vx + (Y - ay) * vy + (Z - az) * vz) / l2, 0.0, 1.0)
    cx, cy, cz = ax + t * vx, ay + t * vy, az + t * vz
    rad = r0 + t * (r1 - r0)
    return ((X - cx) ** 2 + (Y - cy) ** 2 + (Z - cz) ** 2) / (rad * rad)

# ====================================================== 1) BIG LUSH SAKURA TREE (56x56x48)
def build_sakura():
    W, H = 56, 52
    pal = np.stack([hexc(h) for h in (
        "2b1224",                                            # 0 deep plum-ink outline
        "7a2944", "b84c68", "ea7b8a", "f8b5c2", "ffe8ee",    # 1..5 sakura blossom ramp (from Fuji ref!)
        "24161b", "452c30", "684748", "8c6864",              # 6..9 dark gnarled cherry bark
    )])
    I, J, K = np.meshgrid(np.arange(W), np.arange(W), np.arange(H), indexing="ij")
    X, Y, Z = I + 0.5 - W / 2.0, J + 0.5 - W / 2.0, K + 0.5

    # Gnarled graceful leaning cherry trunk + roots + wide sweeping branches
    segs = [
        ((0.0, 0.0, 0.0), (1.6, -0.8, 10.5), 4.6, 3.6),
        ((1.6, -0.8, 10.5), (-0.8, 0.6, 21.5), 3.6, 3.1),
        ((0.0, 0.0, 3.5), ( 8.0, -3.5, 0.6), 2.8, 1.6),
        ((0.0, 0.0, 3.5), (-7.6, -3.2, 0.6), 2.8, 1.6),
        ((0.0, 0.0, 3.5), ( 4.0,  7.6, 0.6), 2.6, 1.5),
        ((0.0, 0.0, 3.5), (-6.4,  5.2, 0.6), 2.6, 1.5),
        # Sweeping horizontal cherry boughs
        ((-0.4, 0.2, 16.5), (-11.5, -3.2, 24.5), 2.7, 1.6),
        ((-0.4, 0.2, 17.5), ( 11.2,  3.0, 26.0), 2.6, 1.6),
        ((-0.4, 0.2, 17.0), ( -1.5, -10.0, 24.0), 2.5, 1.5),
        ((-0.4, 0.2, 18.0), (  2.2,  10.2, 25.5), 2.5, 1.5),
    ]
    bd = np.full((W, W, H), 999.0, np.float32)
    for a, b, r0, r1 in segs:
        bd = np.minimum(bd, seg_d2(X, Y, Z, a, b, r0, r1))
    occ_bark = (bd <= 1.0) & (K >= 0)

    # Wide, cloud-like layered sakura blossoms (10 graceful spreading puffs!)
    lobes = [
        (-2.5,  1.8, 37.5, 10.8, 10.2, 7.2),
        ( 5.8, -2.0, 35.5,  9.8,  9.4, 6.6),
        (-12.2, -3.8, 28.5, 10.0,  9.4, 6.6),
        ( 12.0,  3.2, 30.0,  9.8,  9.2, 6.6),
        (-3.2, -11.2, 27.5,  9.8,  8.8, 6.4),
        ( 7.8,  -8.8, 28.8,  9.0,  8.4, 6.0),
        ( 2.2,  11.6, 29.4, 10.2,  9.2, 6.4),
        (-9.4,   8.0, 31.8,  9.0,  8.6, 6.0),
        ( 9.4,   8.2, 26.5,  8.2,  7.8, 5.6),
        (-13.8,  2.2, 25.2,  7.2,  7.0, 5.2),
    ]
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
    val = 0.44 + 0.54 * ndotl + 0.22 * (hn - 0.5)
    val = np.where(above >= 6, val - 0.34, np.where(above >= 2, val - 0.16, val))
    val = np.where((d2 < 1.24) & (nz < 0.48), val - 0.22, val)
    val = np.where(nz < -0.22, val - 0.26, val)

    lc = np.where(val < 0.22, 1, np.where(val < 0.46, 2, np.where(val < 0.72, 3, np.where(val < 0.93, 4, 5))))
    low_rim = occ_leaf & hedge & (nz < -0.10)
    lc = np.where(low_rim & (nz < -0.34), 0, np.where(low_rim, 1, lc))

    ang = np.arctan2(Y, X)
    bv = 0.46 + 0.36 * (np.sin(ang * 5.0) * 0.5 + 0.5) - np.where(above >= 4, 0.28, 0.0)
    bc = np.where(bv < 0.30, 7, np.where(bv < 0.65, 8, 9))
    bc = np.where((K == 0) & hedge, 6, bc)

    pidx = np.full((W, W, H), -1, np.int16)
    pidx[occ_leaf] = lc[occ_leaf]; pidx[occ_bark] = bc[occ_bark]
    zs = np.where(occ.any(axis=(0, 1)))[0]
    hu = int(zs.max()) + 1
    vox = np.zeros((W, W, hu, 4), np.uint8)
    vox[occ[:, :, :hu], :3] = pal[pidx[:, :, :hu][occ[:, :, :hu]]]
    vox[occ[:, :, :hu], 3] = 255
    return vox, pal[0]

sak_vox, sak_out = build_sakura()
sak_strip, sak_sl = vox_to_strip(sak_vox)
save_png(sak_strip, os.path.join(OUT, "tree_sakura_strip.png"))
print(f"SAKURA: {sak_vox.shape[0]}x{sak_vox.shape[1]}x{sak_vox.shape[2]}")

# ====================================================== 2) 3-TIER JAPANESE PAGODA (64x64x66!)
def build_pagoda():
    W, H = 64, 68
    pal = np.stack([hexc(h) for h in (
        "1a1721",                                  # 0 outline
        "686e75", "939aa1", "bfc4c9",              # 1..3 stone foundation / gravel stairs
        "8a1e18", "c9382a", "e85c48",              # 4..6 vermilion shrine lacquer (from Kyoto ref!)
        "282d36", "404754", "626b7a", "8892a3",    # 7..10 dark curved tiled pagoda roof
        "d6d2c7", "f2efe8",                        # 11..12 white shoji plaster panels
        "a87018", "dfa528", "fae04b",              # 13..15 warm gold temple spire & trim
        "3d241c",                                  # 16 dark temple timber
    )])
    I, J, K = np.meshgrid(np.arange(W), np.arange(W), np.arange(H), indexing="ij")
    X, Y, Z = I + 0.5 - W / 2.0, J + 0.5 - W / 2.0, K + 0.5
    pidx = np.full((W, W, H), -1, np.int16)
    def paint(m, i): pidx[m] = i

    ax, ay = np.abs(X), np.abs(Y)
    # Stone plinth foundation (z=0..5) + front stone stairs
    plinth = (Z < 5.0) & (ax <= 18.0) & (ay <= 18.0)
    paint(plinth, 2)
    paint(plinth & ((ax > 16.5) | (ay > 16.5)), 1)
    paint(plinth & (Z >= 4.0), 3)
    stairs = (Y < -17.0) & (Y >= -22.5) & (ax <= 5.5) & (Z < np.clip((Y + 23.0) * 0.9, 0, 5.0))
    paint(stairs, 3)
    paint(stairs & (ax > 4.5), 1)

    def add_tier(z_bot, wall_h, wall_w, roof_w, roof_h):
        # White shoji wall body + vermilion corner pillars & horizontal beams!
        wall = (Z >= z_bot) & (Z < z_bot + wall_h) & (ax <= wall_w) & (ay <= wall_w)
        paint(wall, 12)
        paint(wall & ((ax > wall_w - 1.2) | (ay > wall_w - 1.2)) & (Z < z_bot + 1.4), 11)
        # Vermilion structural pillars (corners & mid-bays) + wooden gallery rail
        pillars = wall & (
            ((ax >= wall_w - 2.0) & (ay >= wall_w - 2.0)) |
            ((ax >= wall_w - 1.6) & (ay <= 1.8)) |
            ((ay >= wall_w - 1.6) & (ax <= 1.8)) |
            (Z >= z_bot + wall_h - 1.6) |
            (Z <= z_bot + 1.4)
        )
        paint(pillars, 5)
        paint(pillars & ((ax >= wall_w - 1.0) | (ay >= wall_w - 1.0)) & (Z >= z_bot + wall_h - 2.0), 6)
        # Red wooden balcony rail sticking out 2px at tier base
        balc = (Z >= z_bot) & (Z < z_bot + 2.2) & (ax <= wall_w + 2.2) & (ay <= wall_w + 2.2) & ~(
            (ax <= wall_w + 0.6) & (ay <= wall_w + 0.6)
        )
        paint(balc, 4)
        paint(balc & (Z >= z_bot + 1.2), 6)
        # Dark doorway on front (-Y) of ground floor
        if z_bot < 7:
            door = (Z >= z_bot) & (Z < z_bot + wall_h - 2.0) & (Y < -wall_w + 2.0) & (Y >= -wall_w - 0.5) & (ax <= 3.0)
            paint(door, 16)

        # Sweeping curved Japanese tiled roof with upturned eave corners!
        z_r0 = z_bot + wall_h
        # Compute normalized distance from center (Chebyshev + subtle corner flare!)
        rmax = np.maximum(ax, ay)
        # Corner flare: corners sweep UP slightly as r approaches roof_w!
        corner_f = np.minimum(ax, ay) / np.maximum(rmax, 1.0)  # 0 on flat sides, 1 on 45° corners!
        u_r = np.clip((Z - z_r0) / roof_h, 0.0, 1.0)
        # Concave pagoda roof profile (steep top, wide flaring eaves!)
        cur_w = roof_w - (roof_w - (wall_w * 0.55)) * (u_r ** 0.72) + corner_f * 2.2 * (1.0 - u_r)
        roof_in = (Z >= z_r0) & (Z <= z_r0 + roof_h) & (rmax <= cur_w)
        # Slight upward eave curl at outer corners
        eave_curl = (Z >= z_r0 + 0.8) & (Z <= z_r0 + 2.6) & (rmax <= roof_w + 1.6) & (rmax >= roof_w - 2.0) & (corner_f > 0.75)
        roof = roof_in | eave_curl
        paint(roof, 8)
        # Ribbed slate tile stripes radiating out + bright ridge hips on the 4 diagonals!
        rib = ((np.floor(ax) % 2 == 0) & (ay >= ax)) | ((np.floor(ay) % 2 == 0) & (ax > ay))
        paint(roof & rib & (Z > z_r0 + 1.2), 9)
        hip = roof & (np.abs(ax - ay) <= 1.2)
        paint(hip, 10)
        # Vermilion underside brackets directly beneath roof eaves!
        eave_under = (Z >= z_r0 - 1.2) & (Z < z_r0) & (rmax <= roof_w - 1.0) & (rmax >= wall_w - 0.5)
        paint(eave_under, 4)
        paint(eave_under & (rmax >= roof_w - 2.4), 5)
        # Gold corner ornament pixels at roof tips!
        paint(eave_curl & (rmax >= roof_w + 0.4), 14)

    # 3 classic shrinking pagoda tiers!
    add_tier( 5.0, 11.0, 14.0, 24.0,  8.0)   # Tier 1 (z=5..24)
    add_tier(23.0,  9.0, 11.0, 20.0,  7.5)   # Tier 2 (z=23..39.5)
    add_tier(38.5,  8.0,  8.2, 16.5,  8.5)   # Tier 3 (z=38.5..55)

    # Tall ornate GOLD & IRON PAGODA SPIRE (Sorin finial, z=54..66!)
    r_xy = np.sqrt(X * X + Y * Y)
    paint((Z >= 54.0) & (Z <= 57.5) & (r_xy <= 3.6 - (Z - 54.0) * 0.4), 7)
    spire = (Z >= 57.0) & (Z <= 66.5) & (r_xy <= 1.35)
    paint(spire, 14)
    # Decorative golden rings along spire
    rings = (Z >= 58.0) & (Z <= 64.5) & ((K % 2) == 0) & (r_xy <= 2.3)
    paint(rings, 15)
    paint((Z >= 65.5) & (Z <= 67.5) & (r_xy <= 1.8), 15)

    occ = pidx >= 0
    zs = np.where(occ.any(axis=(0, 1)))[0]
    hu = int(zs.max()) + 1
    vox = np.zeros((W, W, hu, 4), np.uint8)
    vox[occ[:, :, :hu], :3] = pal[pidx[:, :, :hu][occ[:, :, :hu]]]
    vox[occ[:, :, :hu], 3] = 255
    return vox, pal[0]

pag_vox, pag_out = build_pagoda()
pag_strip, pag_sl = vox_to_strip(pag_vox)
save_png(pag_strip, os.path.join(OUT, "pagoda_strip.png"))
print(f"PAGODA: {pag_vox.shape[0]}x{pag_vox.shape[1]}x{pag_vox.shape[2]}")

# ====================================================== 3) VERMILION TORII GATE (52x52x44)
def build_torii():
    W, H = 52, 46
    pal = np.stack([hexc(h) for h in (
        "1a141c",                                  # 0 outline
        "282d36", "48505e", "747e8c",              # 1..3 black stone bases & kasagi cap
        "8a1e18", "c9382a", "eb5c46",              # 4..6 bright vermilion lacquer
        "dfa528", "fae04b",                        # 7..8 gold center shrine plaque
    )])
    I, J, K = np.meshgrid(np.arange(W), np.arange(W), np.arange(H), indexing="ij")
    X, Y, Z = I + 0.5 - W / 2.0, J + 0.5 - W / 2.0, K + 0.5
    pidx = np.full((W, W, H), -1, np.int16)
    def paint(m, i): pidx[m] = i

    # Two sturdy round vermilion pillars (X = ±13.5, Y = 0) on dark stone pedestals!
    for sx in (-13.5, 13.5):
        pr = np.sqrt((X - sx) ** 2 + Y ** 2)
        paint((Z < 5.0) & (pr <= 3.4), 1)
        paint((Z < 5.0) & (pr <= 3.4) & (Y < -1.0), 2)
        pil = (Z >= 4.5) & (Z <= 36.0) & (pr <= 2.65)
        paint(pil, 5)
        paint(pil & (Y < -0.6), 6)
        paint(pil & (Y > 1.2), 4)
        # Black collar ring at top of pillars
        paint((Z >= 34.0) & (Z <= 36.5) & (pr <= 3.0), 1)

    # Lower horizontal tie-beam (Nuki, z=28..31.5) piercing cleanly past both pillars!
    nuki = (Z >= 28.0) & (Z <= 31.5) & (np.abs(X) <= 19.5) & (np.abs(Y) <= 1.8)
    paint(nuki, 5)
    paint(nuki & (Z >= 30.2), 6)
    paint(nuki & (Z < 29.0), 4)
    # Center vertical strut & GOLD SHRINE PLAQUE between beams!
    strut = (Z >= 31.0) & (Z <= 37.5) & (np.abs(X) <= 2.4) & (np.abs(Y) <= 1.6)
    paint(strut, 1)
    paint(strut & (np.abs(X) <= 1.4) & (Z >= 32.2) & (Z <= 36.2), 8)

    # Upper curved lintel (Shimaki vermilion + Kasagi black upturned cap, z=36..43)!
    curve_z = 0.0085 * (X * X)     # classic gentle upward sweep toward outer tips!
    shimaki = (np.abs(X) <= 22.5) & (np.abs(Y) <= 2.5) & (Z >= 35.8 + curve_z) & (Z <= 38.6 + curve_z)
    paint(shimaki, 5)
    paint(shimaki & (Y < -0.5), 6)
    kasagi = (np.abs(X) <= 24.2) & (np.abs(Y) <= 3.3) & (Z >= 38.4 + curve_z) & (Z <= 41.2 + curve_z)
    paint(kasagi, 1)
    paint(kasagi & (Z >= 40.0 + curve_z), 2)
    paint(kasagi & (np.abs(Y) <= 1.2) & (Z >= 40.4 + curve_z), 3)

    occ = pidx >= 0
    zs = np.where(occ.any(axis=(0, 1)))[0]
    hu = int(zs.max()) + 1
    vox = np.zeros((W, W, hu, 4), np.uint8)
    vox[occ[:, :, :hu], :3] = pal[pidx[:, :, :hu][occ[:, :, :hu]]]
    vox[occ[:, :, :hu], 3] = 255
    return vox, pal[0]

tor_vox, tor_out = build_torii()
tor_strip, tor_sl = vox_to_strip(tor_vox)
save_png(tor_strip, os.path.join(OUT, "torii_strip.png"))
print(f"TORII: {tor_vox.shape[0]}x{tor_vox.shape[1]}x{tor_vox.shape[2]}")

# ====================================================== 4) STONE TORO LANTERN (20x20x26)
def build_lantern():
    W, H = 20, 26
    pal = np.stack([hexc(h) for h in (
        "1c1c24",                        # 0 outline
        "585e63", "838a90", "b4babf",    # 1..3 weathered shrine stone
        "dfa528", "fae04b", "fff6c4",    # 4..6 warm glowing lantern light!
    )])
    I, J, K = np.meshgrid(np.arange(W), np.arange(W), np.arange(H), indexing="ij")
    X, Y, Z = I + 0.5 - W / 2.0, J + 0.5 - W / 2.0, K + 0.5
    pidx = np.full((W, W, H), -1, np.int16)
    def paint(m, i): pidx[m] = i
    ax, ay = np.abs(X), np.abs(Y)
    r = np.sqrt(X * X + Y * Y)

    paint((Z < 4.0) & (ax <= 4.5) & (ay <= 4.5), 2)
    paint((Z >= 3.5) & (Z < 12.0) & (r <= 2.3), 2)
    paint((Z >= 3.5) & (Z < 12.0) & (r <= 2.3) & (Y < -0.5), 3)
    paint((Z >= 11.5) & (Z < 14.0) & (ax <= 4.8) & (ay <= 4.8), 3)
    # Glowing fire-box (z=14..18.5) with stone corner posts
    box = (Z >= 13.8) & (Z < 18.8) & (ax <= 3.6) & (ay <= 3.6)
    paint(box, 5)
    paint(box & (Z >= 15.2) & (Z <= 17.4), 6)
    paint(box & (ax >= 2.4) & (ay >= 2.4), 1)
    # Flared stone roof cap (z=18.5..24.5)
    u = np.clip((Z - 18.5) / 5.5, 0.0, 1.0)
    rw = 7.2 * (1.0 - 0.85 * u)
    roof = (Z >= 18.5) & (Z <= 24.0) & (np.maximum(ax, ay) <= rw)
    paint(roof, 2)
    paint(roof & (Z >= 20.5), 3)
    paint((Z >= 23.5) & (Z <= 25.5) & (r <= 1.5), 3)

    occ = pidx >= 0
    zs = np.where(occ.any(axis=(0, 1)))[0]
    hu = int(zs.max()) + 1
    vox = np.zeros((W, W, hu, 4), np.uint8)
    vox[occ[:, :, :hu], :3] = pal[pidx[:, :, :hu][occ[:, :, :hu]]]
    vox[occ[:, :, :hu], 3] = 255
    return vox, pal[0]

lan_vox, lan_out = build_lantern()
lan_strip, lan_sl = vox_to_strip(lan_vox)
save_png(lan_strip, os.path.join(OUT, "lantern_strip.png"))
print(f"LANTERN: {lan_vox.shape[0]}x{lan_vox.shape[1]}x{lan_vox.shape[2]}")

# ====================================================== 5) GIANT ONI GOLEM BOSS (44x44x42 x 4f!)
def build_boss_frame(stride=0.0, bob=0.0):
    W, H = 44, 42
    pal = np.stack([hexc(h) for h in (
        "140b14",                                  # 0 outline
        "28222e", "443d4f", "6e657d",              # 1..3 dark obsidian samurai armor
        "6e1522", "b82534", "f0434e", "ff8c94",    # 4..7 glowing oni crimson core & eyes
        "a87018", "dfa528", "fae04b",              # 8..10 gold oni horns & armor trim
        "e8e2d5",                                  # 11 ivory oni tusks/horns tip
    )])
    I, J, K = np.meshgrid(np.arange(W), np.arange(W), np.arange(H), indexing="ij")
    X, Y, Z = I + 0.5 - W / 2.0, J + 0.5 - W / 2.0, K + 0.5
    pidx = np.full((W, W, H), -1, np.int16)
    def paint(m, i): pidx[m] = i
    def cap(a, b, r0, r1=None): return seg_d2(X, Y, Z, a, b, r0, r0 if r1 is None else r1) <= 1.0
    def el(cx, cy, cz, rx, ry, rz): return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 + ((Z - cz) / rz) ** 2 <= 1.0

    # Heavy stomping samurai legs
    ly_l, ly_r = stride * 3.8, -stride * 3.8
    lz_l, lz_r = 1.2 + max(0.0, -stride) * 2.2, 1.2 + max(0.0, stride) * 2.2
    legs = cap((-4.6, ly_l, lz_l), (-4.0, 0, 11.5 + bob), 3.0, 3.2) | \
           cap(( 4.6, ly_r, lz_r), ( 4.0, 0, 11.5 + bob), 3.0, 3.2)
    paint(legs, 1); paint(legs & (Y < -1.0), 2)
    paint(legs & (Z >= 6.0 + bob) & (Z <= 9.0 + bob), 5)   # crimson greave plates

    # Massive broad armored chest with glowing Oni heart-core!
    chest = el(0, 0, 18.5 + bob, 9.2, 7.2, 8.5) & (Z >= 11.0 + bob)
    paint(chest, 2); paint(chest & (Y < -2.0), 3); paint(chest & (Z < 14.0 + bob), 1)
    # Gold samurai belt & shoulder pauldrons
    paint(chest & (Z >= 11.5 + bob) & (Z <= 13.8 + bob), 9)
    pauldrons = el(-10.5, 0, 23.0 + bob, 4.8, 5.2, 4.2) | el(10.5, 0, 23.0 + bob, 4.8, 5.2, 4.2)
    paint(pauldrons, 5); paint(pauldrons & (Z >= 25.0 + bob), 6); paint(pauldrons & (Z < 21.0 + bob), 9)
    # Glowing crimson core in center of chest
    core = chest & (Y < -4.5) & (np.sqrt(X * X + (Z - (19.0 + bob)) ** 2) < 3.4)
    paint(core, 6); paint(core & (np.sqrt(X * X + (Z - (19.0 + bob)) ** 2) < 1.8), 7)

    # Huge swinging arms + kanabo club spikes
    al = cap((-11.0, 0, 21.0 + bob), (-13.5, -3.5 - stride * 3.5, 12.5 + bob), 2.8, 2.5)
    ar = cap(( 11.0, 0, 21.0 + bob), ( 13.5, -3.5 + stride * 3.5, 12.5 + bob), 2.8, 2.5)
    paint(al | ar, 1); paint((al | ar) & (Z >= 16.0 + bob), 2)
    paint((al | ar) & (Z < 14.5 + bob), 9)

    # Oni demon-mask head + giant curved GOLDEN HORNS!
    head = el(0, -0.5, 29.8 + bob, 6.2, 5.8, 5.6)
    paint(head, 5); paint(head & (Y < -2.0), 6); paint(head & (Z >= 32.0 + bob), 1)
    # Glowing yellow-white eyes!
    f_hd = head & (Y < -3.5)
    paint(f_hd & (np.abs(Z - (29.8 + bob)) < 1.2) & (np.abs(X) >= 1.5) & (np.abs(X) <= 4.2), 10)
    # Curved horns sweeping up & out!
    h_l = cap((-4.0, -1.0, 33.5 + bob), (-8.5, -2.5, 39.5 + bob), 1.9, 0.8)
    h_r = cap(( 4.0, -1.0, 33.5 + bob), ( 8.5, -2.5, 39.5 + bob), 1.9, 0.8)
    paint(h_l | h_r, 9); paint((h_l | h_r) & (Z >= 37.2 + bob), 11)

    occ = pidx >= 0
    vox = np.zeros((W, W, H, 4), np.uint8)
    vox[occ, :3] = pal[pidx[occ]]; vox[occ, 3] = 255
    return vox, pal[0]

b_rows = []
boss_sl0 = None
for fi, kw in enumerate([dict(stride=0,bob=0), dict(stride=1,bob=1.4), dict(stride=0,bob=0.2), dict(stride=-1,bob=1.4)]):
    bv, bout = build_boss_frame(**kw)
    st, sl = vox_to_strip(bv)
    if fi == 0: boss_sl0 = sl
    b_rows.append(st)
save_png(np.concatenate(b_rows, axis=0), os.path.join(OUT, "enemy_boss_strip.png"))
print("BOSS: 44x44x42 x 4 frames OK")

# ====================================================== 6) LINEUP PREVIEW
previews = [
    preview_stack(lan_sl,  20, lan_out, theta=0.45),
    preview_stack(boss_sl0,44, bout,    theta=0.35),
    preview_stack(sak_sl,  56, sak_out, theta=0.35),
    preview_stack(tor_sl,  52, tor_out, theta=0.38),
    preview_stack(pag_sl,  64, pag_out, theta=0.48),
]
max_h = max(p.shape[0] for p in previews) + 12
tot_w = sum(p.shape[1] for p in previews) + 20
lineup = np.full((max_h, tot_w, 4), (124, 146, 61, 255), np.uint8)  # Fuji olive-moss green!
xc = 10
for p in previews:
    ph, pw = p.shape[:2]
    y0 = max_h - 6 - ph
    m = p[..., 3] > 0
    lineup[y0:y0 + ph, xc:xc + pw][m] = p[m]
    xc += pw
save_png(lineup.repeat(2, 0).repeat(2, 1), os.path.join(OUT, "japan_assets_preview.png"))
print("JAPAN_ASSETS_DONE")
