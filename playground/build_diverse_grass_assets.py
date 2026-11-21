import os
import math
import numpy as np
import bpy

OUT_DIR = r"C:\Users\izxnxmi\Documents\CODEX CHAT LOGS\katana-zero-archer\playground\assets"
os.makedirs(OUT_DIR, exist_ok=True)

PAL = {
    # Deep roots & stems
    "Root_D":   (0.20, 0.30, 0.11, 1.0),
    "Moss_D":   (0.26, 0.38, 0.14, 1.0),
    "Moss_M":   (0.40, 0.54, 0.20, 1.0),
    "Moss_L":   (0.56, 0.70, 0.28, 1.0),
    "Grass_L":  (0.72, 0.85, 0.38, 1.0),
    "Grass_Tip":(0.84, 0.93, 0.50, 1.0),

    # Jade / Fern greens
    "Jade_D":   (0.11, 0.31, 0.25, 1.0),
    "Jade_M":   (0.19, 0.47, 0.33, 1.0),
    "Jade_L":   (0.38, 0.67, 0.40, 1.0),
    "Lime_L":   (0.62, 0.82, 0.44, 1.0),

    # Golden Susuki Reeds / Pampas plumes
    "Reed_D":   (0.45, 0.48, 0.20, 1.0),
    "Reed_M":   (0.64, 0.63, 0.28, 1.0),
    "Gold_M":   (0.86, 0.74, 0.38, 1.0),
    "Plume_L":  (0.96, 0.90, 0.66, 1.0),
    "Plume_W":  (0.99, 0.97, 0.86, 1.0),

    # Wildflower blossoms (Sakura pink, white, gold center)
    "Pink_D":   (0.84, 0.36, 0.46, 1.0),
    "Pink_L":   (0.98, 0.70, 0.77, 1.0),
    "White":    (0.98, 0.97, 0.95, 1.0),
    "Sun_Gold": (0.98, 0.84, 0.26, 1.0),
}


def save_png(rgba, path):
    h, w, _ = rgba.shape
    img = bpy.data.images.new("tmp", width=w, height=h, alpha=True)
    img.pixels.foreach_set(np.flipud(rgba).reshape(-1))
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)


def export_strip(grid, name):
    H, W, D, _ = grid.shape
    strip = np.zeros((W, W * H, 4), dtype=np.float32)
    for z in range(H):
        strip[:, z * W:(z + 1) * W, :] = grid[z]
    out_path = os.path.join(OUT_DIR, f"{name}_strip.png")
    save_png(strip, out_path)
    print(f"BUILT {name}_strip.png ({W}x{W}x{H})")


# 1) GRASS_LUSH — Dense Emerald-Olive Meadow Grass Clump (16x16x13)
def build_grass_lush():
    W, H = 16, 13
    g = np.zeros((H, W, W, 4), dtype=np.float32)
    cx, cy = W // 2, W // 2
    for z in range(3):
        for y in range(cy - 3, cy + 4):
            for x in range(cx - 4, cx + 5):
                if math.hypot(x - cx, y - cy) <= 4.3 - z * 0.4:
                    g[z, y, x] = PAL["Root_D" if z == 0 else "Moss_D"]
    blades = [
        (cx - 3, cy - 1, -0.26, -0.10, 12),
        (cx + 3, cy - 1,  0.26, -0.10, 12),
        (cx,     cy + 2,  0.05,  0.24, 13),
        (cx - 2, cy + 2, -0.22,  0.18, 11),
        (cx + 2, cy - 2,  0.20, -0.22, 11),
        (cx - 1, cy - 2, -0.12, -0.20, 12),
        (cx + 1, cy + 1,  0.15,  0.15, 13),
        (cx,     cy,      0.00,  0.00, 13),
    ]
    for bx0, by0, dx, dy, bh in blades:
        for z in range(1, bh):
            bx = int(round(bx0 + dx * z))
            by = int(round(by0 + dy * z))
            r = 1 if z < bh - 4 else 0
            c = "Grass_Tip" if z >= bh - 2 else ("Grass_L" if z >= bh - 4 else ("Moss_L" if z >= 5 else "Moss_M"))
            for oy in range(-r, r + 1):
                for ox in range(-r, r + 1):
                    x, y = bx + ox, by + oy
                    if 0 <= x < W and 0 <= y < W:
                        g[z, y, x] = PAL[c]
    export_strip(g, "grass_lush")


# 2) GRASS_WILD — Tall Japanese Susuki / Golden-Plumed Reed Grass (18x18x16)
def build_grass_wild():
    W, H = 18, 16
    g = np.zeros((H, W, W, 4), dtype=np.float32)
    cx, cy = W // 2, W // 2
    for z in range(3):
        for y in range(cy - 3, cy + 4):
            for x in range(cx - 3, cx + 4):
                if math.hypot(x - cx, y - cy) <= 3.8 - z * 0.3:
                    g[z, y, x] = PAL["Root_D" if z == 0 else "Reed_D"]
    reeds = [
        (cx - 2, cy,     -0.25, -0.05, 15, True),
        (cx + 2, cy - 1,  0.26, -0.10, 16, True),
        (cx,     cy + 1,  0.05,  0.24, 15, True),
        (cx - 2, cy + 2, -0.22,  0.20, 11, False),
        (cx + 2, cy + 2,  0.22,  0.18, 12, False),
        (cx,     cy - 2, -0.08, -0.24, 13, True),
    ]
    for bx0, by0, dx, dy, bh, has_plume in reeds:
        for z in range(1, bh):
            # Arch outward more near the top
            curve = (z / float(bh)) ** 1.4 * bh
            bx = int(round(bx0 + dx * curve))
            by = int(round(by0 + dy * curve))
            if has_plume and z >= bh - 5:
                c = "Plume_W" if z >= bh - 2 else ("Plume_L" if z >= bh - 4 else "Gold_M")
                r = 1 if z == bh - 3 else 0
            else:
                c = "Gold_M" if z >= bh - 3 else ("Reed_M" if z >= 5 else "Reed_D")
                r = 1 if z < 5 else 0
            for oy in range(-r, r + 1):
                for ox in range(-r, r + 1):
                    x, y = bx + ox, by + oy
                    if 0 <= x < W and 0 <= y < W:
                        g[z, y, x] = PAL[c]
    export_strip(g, "grass_wild")


# 3) GRASS_FERN — Japanese Woodland Shida Fern with Radiating Fronds (18x18x12)
def build_grass_fern():
    W, H = 18, 12
    g = np.zeros((H, W, W, 4), dtype=np.float32)
    cx, cy = W // 2, W // 2
    # Central dark root crown
    for z in range(3):
        for y in range(cy - 2, cy + 3):
            for x in range(cx - 2, cx + 3):
                if math.hypot(x - cx, y - cy) <= 2.5:
                    g[z, y, x] = PAL["Jade_D"]
    # 6 radiating arching fern fronds with side pinnae leaflets!
    for k in range(6):
        ang = (k / 6.0) * math.pi * 2 + 0.25
        ca, sa = math.cos(ang), math.sin(ang)
        pa, psa = -sa, ca
        for s in range(1, 8):
            # Frond arches up then flattens outward
            z = min(H - 1, int(round(1 + s * 1.45 - (s ** 2) * 0.06)))
            fx = cx + ca * s * 0.95
            fy = cy + sa * s * 0.95
            c = "Lime_L" if s >= 6 else ("Jade_L" if s >= 4 else "Jade_M")
            ix, iy = int(round(fx)), int(round(fy))
            if 0 <= ix < W and 0 <= iy < W:
                g[z, iy, ix] = PAL[c]
            # Side leaflets on middle segments
            if 2 <= s <= 6:
                lw = 2 if (3 <= s <= 5) else 1
                for side in (-1, 1):
                    for l in range(1, lw + 1):
                        lx = int(round(fx + pa * side * l))
                        ly = int(round(fy + psa * side * l))
                        if 0 <= lx < W and 0 <= ly < W:
                            g[max(1, z - 1), ly, lx] = PAL["Jade_L" if l == 1 else "Jade_M"]
    export_strip(g, "grass_fern")


# 4) GRASS_CLOVER — Broadleaf Sasa Dwarf Bamboo Grass & Moss Cluster (16x16x10)
def build_grass_clover():
    W, H = 16, 10
    g = np.zeros((H, W, W, 4), dtype=np.float32)
    cx, cy = W // 2, W // 2
    leaves = [
        (cx - 3, cy - 2, 3, -0.8, 3.2, 1.6),
        (cx + 3, cy - 2, 4,  0.7, 3.2, 1.6),
        (cx - 3, cy + 2, 5, -2.3, 3.4, 1.7),
        (cx + 3, cy + 2, 6,  2.2, 3.4, 1.7),
        (cx,     cy - 3, 7, -1.5, 3.2, 1.6),
        (cx,     cy + 1, 8,  1.2, 3.5, 1.8),
    ]
    for z in range(3):
        for y in range(cy - 4, cy + 5):
            for x in range(cx - 4, cx + 5):
                if math.hypot(x - cx, y - cy) <= 4.5 - z * 0.5:
                    g[z, y, x] = PAL["Jade_D" if z == 0 else "Moss_D"]
    for lx, ly, lz, ang, rx, ry in leaves:
        ca, sa = math.cos(ang), math.sin(ang)
        for dz in range(2):
            z = min(H - 1, lz + dz)
            for y in range(W):
                for x in range(W):
                    dx, dy = x - lx, y - ly
                    u = dx * ca + dy * sa
                    v = -dx * sa + dy * ca
                    if (u / rx) ** 2 + (v / ry) ** 2 <= 1.0:
                        c = "Grass_Tip" if (dz == 1 and abs(v) < 0.7) else ("Grass_L" if dz == 1 else "Moss_L")
                        g[z, y, x] = PAL[c]
    export_strip(g, "grass_clover")


# 5) GRASS_FLOWER — Blooming Shrine Meadow Grass with Pink/White/Gold Wildflowers (16x16x14)
def build_grass_flower():
    W, H = 16, 14
    g = np.zeros((H, W, W, 4), dtype=np.float32)
    cx, cy = W // 2, W // 2
    for z in range(3):
        for y in range(cy - 3, cy + 4):
            for x in range(cx - 4, cx + 5):
                if math.hypot(x - cx, y - cy) <= 4.0 - z * 0.4:
                    g[z, y, x] = PAL["Root_D" if z == 0 else "Moss_D"]
    stems = [
        (cx - 2, cy - 1, -0.22, -0.10, 12, "pink"),
        (cx + 2, cy + 1,  0.22,  0.14, 13, "white"),
        (cx,     cy - 2,  0.04, -0.22, 11, "pink"),
        (cx - 2, cy + 2, -0.20,  0.18, 10, None),
        (cx + 2, cy - 2,  0.18, -0.18, 10, None),
        (cx,     cy + 1,  0.00,  0.08, 9,  None),
    ]
    for bx0, by0, dx, dy, bh, flower in stems:
        for z in range(1, bh):
            bx = int(round(bx0 + dx * z))
            by = int(round(by0 + dy * z))
            if 0 <= bx < W and 0 <= by < W:
                g[z, by, bx] = PAL["Moss_L" if z >= 5 else "Moss_M"]
                if z < 6 and bx + 1 < W:
                    g[z, by, bx + 1] = PAL["Moss_M"]
        if flower is not None:
            fx = int(round(bx0 + dx * (bh - 1)))
            fy = int(round(by0 + dy * (bh - 1)))
            fz = min(H - 2, bh - 1)
            p_col = "Pink_L" if flower == "pink" else "White"
            d_col = "Pink_D" if flower == "pink" else "Pink_L"
            for oy, ox in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                px, py = fx + ox, fy + oy
                if 0 <= px < W and 0 <= py < W:
                    g[fz, py, px] = PAL[d_col]
                    g[fz + 1, py, px] = PAL[p_col]
            if 0 <= fx < W and 0 <= fy < W:
                g[fz, fy, fx] = PAL[d_col]
                g[fz + 1, fy, fx] = PAL["Sun_Gold"]
    export_strip(g, "grass_flower")


build_grass_lush()
build_grass_wild()
build_grass_fern()
build_grass_clover()
build_grass_flower()
print("ALL_5_DIVERSE_3D_GRASS_STRIPS_DONE")
