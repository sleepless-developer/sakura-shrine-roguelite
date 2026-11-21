# -----------------------------------------------------------------------------
# Monumental 3-Tier Kyoto Pagoda (80x80x86) + Traditional Tsukiji-Bei Shrine Walls
# (48x48x28 rotatable wall segment + 24x24x30 tiled corner/gate pillar)
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
    im = bpy.data.images.new("tmp_a", w0, h0, alpha=True)
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

def preview_stack(slices, w, outline_col, theta=0.45, tilt=0.68):
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

PAL = np.stack([hexc(h) for h in (
    "1a1721",                                  # 0 outline
    "686e75", "939aa1", "bfc4c9",              # 1..3 shrine stone masonry
    "8a1e18", "c9382a", "e85c48",              # 4..6 vermilion shrine lacquer
    "282d36", "404754", "626b7a", "8892a3",    # 7..10 curved dark-slate roof tiles
    "d6d2c7", "f2efe8",                        # 11..12 white Kyoto shoji plaster
    "a87018", "dfa528", "fae04b",              # 13..15 warm gold temple spire & trim
    "3d241c", "5c3a2b",                        # 16..17 dark temple timber beams
)])

# ====================================================== 1) MONUMENTAL BIG PAGODA (80x80x86!)
def build_big_pagoda():
    W, H = 80, 88
    I, J, K = np.meshgrid(np.arange(W), np.arange(W), np.arange(H), indexing="ij")
    X, Y, Z = I + 0.5 - W / 2.0, J + 0.5 - W / 2.0, K + 0.5
    pidx = np.full((W, W, H), -1, np.int16)
    def paint(m, i): pidx[m] = i
    ax, ay = np.abs(X), np.abs(Y)

    # Wide grand stone foundation plinth (z=0..6.5) + wide front stairs
    plinth = (Z < 6.5) & (ax <= 24.0) & (ay <= 24.0)
    paint(plinth, 2)
    paint(plinth & ((ax > 22.0) | (ay > 22.0)), 1)
    paint(plinth & (Z >= 5.2), 3)
    # Stone brick mortar lines on plinth walls
    paint(plinth & ((K % 2) == 0) & ((ax > 22.8) | (ay > 22.8)), 1)
    stairs = (Y < -23.0) & (Y >= -30.5) & (ax <= 7.5) & (Z < np.clip((Y + 31.0) * 0.9, 0, 6.5))
    paint(stairs, 3)
    paint(stairs & (ax > 6.2), 1)

    def add_tier(z_bot, wall_h, wall_w, roof_w, roof_h):
        wall = (Z >= z_bot) & (Z < z_bot + wall_h) & (ax <= wall_w) & (ay <= wall_w)
        paint(wall, 12)
        paint(wall & ((ax > wall_w - 1.4) | (ay > wall_w - 1.4)) & (Z < z_bot + 1.8), 11)
        pillars = wall & (
            ((ax >= wall_w - 2.4) & (ay >= wall_w - 2.4)) |
            ((ax >= wall_w - 1.8) & ((ay <= 2.0) | (np.abs(ay - wall_w * 0.5) <= 1.2))) |
            ((ay >= wall_w - 1.8) & ((ax <= 2.0) | (np.abs(ax - wall_w * 0.5) <= 1.2))) |
            (Z >= z_bot + wall_h - 1.8) |
            (Z <= z_bot + 1.6)
        )
        paint(pillars, 5)
        paint(pillars & ((ax >= wall_w - 1.0) | (ay >= wall_w - 1.0)) & (Z >= z_bot + wall_h - 2.2), 6)
        balc = (Z >= z_bot) & (Z < z_bot + 2.8) & (ax <= wall_w + 2.8) & (ay <= wall_w + 2.8) & ~(
            (ax <= wall_w + 0.8) & (ay <= wall_w + 0.8)
        )
        paint(balc, 4)
        paint(balc & (Z >= z_bot + 1.6), 6)
        if z_bot < 8:
            door = (Z >= z_bot) & (Z < z_bot + wall_h - 2.4) & (Y < -wall_w + 2.2) & (Y >= -wall_w - 0.5) & (ax <= 4.5)
            paint(door, 16)
            # Golden shrine transom above main doorway
            paint((Z >= z_bot + wall_h - 3.6) & (Z < z_bot + wall_h - 1.8) & (Y < -wall_w + 1.2) & (ax <= 5.0), 14)

        z_r0 = z_bot + wall_h
        rmax = np.maximum(ax, ay)
        corner_f = np.minimum(ax, ay) / np.maximum(rmax, 1.0)
        u_r = np.clip((Z - z_r0) / roof_h, 0.0, 1.0)
        cur_w = roof_w - (roof_w - (wall_w * 0.54)) * (u_r ** 0.72) + corner_f * 2.8 * (1.0 - u_r)
        roof_in = (Z >= z_r0) & (Z <= z_r0 + roof_h) & (rmax <= cur_w)
        eave_curl = (Z >= z_r0 + 1.0) & (Z <= z_r0 + 3.2) & (rmax <= roof_w + 2.0) & (rmax >= roof_w - 2.4) & (corner_f > 0.74)
        roof = roof_in | eave_curl
        paint(roof, 8)
        rib = ((np.floor(ax) % 2 == 0) & (ay >= ax)) | ((np.floor(ay) % 2 == 0) & (ax > ay))
        paint(roof & rib & (Z > z_r0 + 1.4), 9)
        paint(roof & (np.abs(ax - ay) <= 1.3), 10)
        eave_under = (Z >= z_r0 - 1.6) & (Z < z_r0) & (rmax <= roof_w - 1.0) & (rmax >= wall_w - 0.5)
        paint(eave_under, 4)
        paint(eave_under & (rmax >= roof_w - 2.8), 5)
        paint(eave_curl & (rmax >= roof_w + 0.5), 14)

    add_tier( 6.5, 14.0, 18.5, 31.0, 10.0)   # Grand Tier 1 (z=6.5..30.5)
    add_tier(29.5, 11.5, 14.5, 25.5,  9.5)   # Tier 2 (z=29.5..50.5)
    add_tier(49.5, 10.0, 10.5, 21.0, 10.5)   # Tier 3 (z=49.5..70.0)

    # Tall ornate Golden Sorin Spire (z=69..86!)
    r_xy = np.sqrt(X * X + Y * Y)
    paint((Z >= 69.0) & (Z <= 73.0) & (r_xy <= 4.4 - (Z - 69.0) * 0.45), 7)
    paint((Z >= 72.5) & (Z <= 84.5) & (r_xy <= 1.5), 14)
    paint((Z >= 74.0) & (Z <= 82.5) & ((K % 2) == 0) & (r_xy <= 2.8), 15)
    paint((Z >= 83.5) & (Z <= 86.0) & (r_xy <= 2.1), 15)

    occ = pidx >= 0
    zs = np.where(occ.any(axis=(0, 1)))[0]
    hu = int(zs.max()) + 1
    vox = np.zeros((W, W, hu, 4), np.uint8)
    vox[occ[:, :, :hu], :3] = PAL[pidx[:, :, :hu][occ[:, :, :hu]]]
    vox[occ[:, :, :hu], 3] = 255
    return vox

pag_vox = build_big_pagoda()
pag_strip, pag_sl = vox_to_strip(pag_vox)
save_png(pag_strip, os.path.join(OUT, "pagoda_strip.png"))
print(f"BIG_PAGODA: {pag_vox.shape[0]}x{pag_vox.shape[1]}x{pag_vox.shape[2]}")

# ====================================================== 2) TRADITIONAL JAPANESE WALL SEGMENT (48x48x28)
# White shoji plaster + dark wooden framing + stone base + sloped slate tile roof cap!
def build_wall_segment():
    W, H = 48, 28
    I, J, K = np.meshgrid(np.arange(W), np.arange(W), np.arange(H), indexing="ij")
    X, Y, Z = I + 0.5 - W / 2.0, J + 0.5 - W / 2.0, K + 0.5
    pidx = np.full((W, W, H), -1, np.int16)
    def paint(m, i): pidx[m] = i
    ax, ay = np.abs(X), np.abs(Y)

    # Stone foundation base (z=0..5.5)
    base = (Z < 5.5) & (ax <= 24.0) & (ay <= 4.6)
    paint(base, 2)
    paint(base & (ay >= 3.4), 1)
    paint(base & (Z >= 4.4), 3)

    # White Kyoto plaster wall body (z=5.5..18.5)
    wall = (Z >= 5.5) & (Z < 18.5) & (ax <= 24.0) & (ay <= 3.2)
    paint(wall, 12)
    paint(wall & (Z < 7.0), 11)
    # Dark wood timber posts & horizontal lower/upper beams!
    timber = wall & (
        (Z < 7.2) | (Z >= 17.0) |
        (np.abs(X) >= 22.0) | (np.abs(X) <= 1.4) | (np.abs(np.abs(X) - 12.0) <= 1.2)
    )
    paint(timber, 16)
    paint(timber & (Z >= 17.0), 17)
    # Subtle vermilion accent stripe under roof eaves
    paint((Z >= 17.4) & (Z < 19.0) & (ax <= 24.0) & (ay <= 4.2), 5)

    # Sloped dark-slate tiled roof cap (z=18.5..26.5, gabled along X!)
    u = np.clip((Z - 18.5) / 6.5, 0.0, 1.0)
    roof_y = 7.4 * (1.0 - 0.82 * (u ** 0.85))
    roof = (Z >= 18.5) & (Z <= 25.2) & (ax <= 24.0) & (ay <= roof_y)
    paint(roof, 8)
    # Ribbed vertical tile stripes along X
    paint(roof & ((np.floor(ax) % 2) == 0) & (Z > 19.8), 9)
    # Prominent top ridge beam (z=24.8..27.0)
    ridge = (Z >= 24.8) & (Z <= 26.8) & (ax <= 24.0) & (ay <= 1.6)
    paint(ridge, 10)
    paint(ridge & (Z >= 26.0), 3)

    occ = pidx >= 0
    zs = np.where(occ.any(axis=(0, 1)))[0]
    hu = int(zs.max()) + 1
    vox = np.zeros((W, W, hu, 4), np.uint8)
    vox[occ[:, :, :hu], :3] = PAL[pidx[:, :, :hu][occ[:, :, :hu]]]
    vox[occ[:, :, :hu], 3] = 255
    return vox

wall_vox = build_wall_segment()
wall_strip, wall_sl = vox_to_strip(wall_vox)
save_png(wall_strip, os.path.join(OUT, "wall_strip.png"))
print(f"WALL: {wall_vox.shape[0]}x{wall_vox.shape[1]}x{wall_vox.shape[2]}")

# ====================================================== 3) WALL CORNER / GATE PILLAR (24x24x30)
def build_wall_pillar():
    W, H = 24, 30
    I, J, K = np.meshgrid(np.arange(W), np.arange(W), np.arange(H), indexing="ij")
    X, Y, Z = I + 0.5 - W / 2.0, J + 0.5 - W / 2.0, K + 0.5
    pidx = np.full((W, W, H), -1, np.int16)
    def paint(m, i): pidx[m] = i
    ax, ay = np.abs(X), np.abs(Y)
    rmax = np.maximum(ax, ay)

    paint((Z < 6.0) & (rmax <= 6.2), 2)
    paint((Z < 6.0) & (rmax <= 6.2) & (rmax >= 5.0), 1)
    body = (Z >= 6.0) & (Z < 20.0) & (rmax <= 4.8)
    paint(body, 12)
    paint(body & ((ax >= 3.4) & (ay >= 3.4)), 16)
    paint((Z >= 18.5) & (Z < 20.4) & (rmax <= 5.6), 5)
    # Pyramidal curved tiled roof cap + gold finial
    u = np.clip((Z - 20.0) / 7.2, 0.0, 1.0)
    rw = 9.5 * (1.0 - 0.86 * (u ** 0.78))
    roof = (Z >= 20.0) & (Z <= 27.2) & (rmax <= rw)
    paint(roof, 8)
    paint(roof & (np.abs(ax - ay) <= 1.1), 10)
    paint((Z >= 26.8) & (Z <= 29.2) & (rmax <= 1.8), 14)

    occ = pidx >= 0
    zs = np.where(occ.any(axis=(0, 1)))[0]
    hu = int(zs.max()) + 1
    vox = np.zeros((W, W, hu, 4), np.uint8)
    vox[occ[:, :, :hu], :3] = PAL[pidx[:, :, :hu][occ[:, :, :hu]]]
    vox[occ[:, :, :hu], 3] = 255
    return vox

pil_vox = build_wall_pillar()
pil_strip, pil_sl = vox_to_strip(pil_vox)
save_png(pil_strip, os.path.join(OUT, "wall_pillar_strip.png"))
print(f"PILLAR: {pil_vox.shape[0]}x{pil_vox.shape[1]}x{pil_vox.shape[2]}")

# Preview lineup
previews = [
    preview_stack(pil_sl,  24, PAL[0], theta=0.45),
    preview_stack(wall_sl, 48, PAL[0], theta=0.35),
    preview_stack(pag_sl,  80, PAL[0], theta=0.48),
]
mh = max(p.shape[0] for p in previews) + 12
tw = sum(p.shape[1] for p in previews) + 20
lineup = np.full((mh, tw, 4), (124, 146, 61, 255), np.uint8)
xc = 10
for p in previews:
    ph, pw = p.shape[:2]; y0 = mh - 6 - ph
    m = p[..., 3] > 0; lineup[y0:y0 + ph, xc:xc + pw][m] = p[m]
    xc += pw
save_png(lineup.repeat(2, 0).repeat(2, 1), os.path.join(OUT, "shrine_arch_preview.png"))
print("ARCH_DONE")
