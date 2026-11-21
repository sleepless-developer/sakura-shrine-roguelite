import os
import math
import numpy as np
import bpy

OUT_DIR = r"C:\Users\izxnxmi\Documents\CODEX CHAT LOGS\katana-zero-archer\playground\assets"
os.makedirs(OUT_DIR, exist_ok=True)

PAL = {
    # Stone & Plaster
    "Stone_D":   (0.32, 0.35, 0.39, 1.0),
    "Stone_M":   (0.49, 0.53, 0.57, 1.0),
    "Stone_L":   (0.68, 0.72, 0.75, 1.0),
    "Plaster_D": (0.76, 0.74, 0.70, 1.0),
    "Plaster_L": (0.93, 0.91, 0.87, 1.0),
    "Sand_L":    (0.86, 0.88, 0.85, 1.0),
    "Sand_D":    (0.74, 0.77, 0.73, 1.0),

    # Timber & Bark
    "Wood_D":    (0.20, 0.12, 0.10, 1.0),
    "Wood_M":    (0.35, 0.21, 0.16, 1.0),
    "Wood_L":    (0.52, 0.34, 0.23, 1.0),
    "Tan_M":     (0.75, 0.58, 0.38, 1.0),
    "Tan_L":     (0.89, 0.75, 0.53, 1.0),

    # Vermilion & Crimson
    "Red_D":     (0.52, 0.13, 0.14, 1.0),
    "Red_M":     (0.79, 0.22, 0.16, 1.0),
    "Red_L":     (0.93, 0.38, 0.28, 1.0),

    # Slate Roof Tiles
    "Roof_D":    (0.15, 0.17, 0.23, 1.0),
    "Roof_M":    (0.25, 0.29, 0.37, 1.0),
    "Roof_L":    (0.40, 0.45, 0.54, 1.0),

    # Gold & Bronze
    "Gold_D":    (0.68, 0.47, 0.12, 1.0),
    "Gold_M":    (0.88, 0.66, 0.17, 1.0),
    "Gold_L":    (0.98, 0.88, 0.34, 1.0),
    "Bronze_D":  (0.24, 0.30, 0.23, 1.0),
    "Bronze_M":  (0.38, 0.47, 0.35, 1.0),
    "Bronze_L":  (0.55, 0.65, 0.48, 1.0),

    # Foliage, Moss & Bamboo
    "Moss_D":    (0.25, 0.36, 0.14, 1.0),
    "Moss_M":    (0.40, 0.53, 0.20, 1.0),
    "Moss_L":    (0.57, 0.70, 0.29, 1.0),
    "Grass_L":   (0.72, 0.84, 0.40, 1.0),
    "Pine_D":    (0.09, 0.26, 0.27, 1.0),
    "Pine_M":    (0.15, 0.43, 0.34, 1.0),
    "Pine_L":    (0.36, 0.65, 0.36, 1.0),

    # Water & Spirit Crystal
    "Water_D":   (0.22, 0.52, 0.72, 1.0),
    "Water_L":   (0.52, 0.84, 0.95, 1.0),
    "Cyan_D":    (0.16, 0.48, 0.76, 1.0),
    "Cyan_M":    (0.30, 0.72, 0.96, 1.0),
    "Cyan_L":    (0.75, 0.96, 1.00, 1.0),
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
    return grid


# 1) HONDO — Traditional Kyoto Main Temple Hall / Tea Pavilion (76x76x58)
def build_hondo():
    W, H = 76, 58
    g = np.zeros((H, W, W, 4), dtype=np.float32)
    cx, cy = W // 2, W // 2

    def s(x, y, z, c):
        if 0 <= x < W and 0 <= y < W and 0 <= z < H:
            g[z, y, x] = PAL[c]

    def box(x0, x1, y0, y1, z0, z1, c):
        for z in range(max(0, z0), min(H, z1 + 1)):
            for y in range(max(0, y0), min(W, y1 + 1)):
                for x in range(max(0, x0), min(W, x1 + 1)):
                    g[z, y, x] = PAL[c]

    # Raised stone foundation & wooden engawa veranda
    box(cx - 28, cx + 28, cy - 22, cy + 22, 0, 4, "Stone_D")
    box(cx - 27, cx + 27, cy - 21, cy + 21, 1, 5, "Stone_M")
    box(cx - 26, cx + 26, cy - 20, cy + 20, 5, 6, "Stone_L")
    # Front & Back stone stairs
    for st in range(6):
        box(cx - 7, cx + 7, cy - 22 - (6 - st), cy - 20, st, st, "Stone_L" if st % 2 == 0 else "Stone_M")
        box(cx - 7, cx + 7, cy + 20, cy + 22 + (6 - st), st, st, "Stone_L" if st % 2 == 0 else "Stone_M")
    # Dark wood veranda floor + red/wood perimeter rail
    box(cx - 26, cx + 26, cy - 20, cy + 20, 7, 8, "Wood_M")
    for x in range(cx - 26, cx + 27):
        for y in [cy - 20, cy + 20]:
            if abs(x - cx) > 6:
                s(x, y, 9, "Wood_D")
                s(x, y, 10, "Red_M")
    for y in range(cy - 20, cy + 21):
        for x in [cx - 26, cx + 26]:
            s(x, y, 9, "Wood_D")
            s(x, y, 10, "Red_M")

    # Main shoji hall walls & dark cedar columns (z=8..25)
    box(cx - 21, cx + 21, cy - 15, cy + 15, 8, 25, "Plaster_L")
    box(cx - 21, cx + 21, cy - 15, cy + 15, 8, 10, "Wood_M")  # lower wainscot
    # Shoji lattice grid
    for z in [11, 15, 19, 23, 25]:
        for x in range(cx - 21, cx + 22):
            s(x, cy - 15, z, "Wood_D"); s(x, cy + 15, z, "Wood_D")
        for y in range(cy - 15, cy + 16):
            s(cx - 21, y, z, "Wood_D"); s(cx + 21, y, z, "Wood_D")
    # Heavy cedar pillars
    for px in [cx - 21, cx - 13, cx - 6, cx + 6, cx + 13, cx + 21]:
        for py in [cy - 15, cy + 15]:
            box(px - 1, px + 1, py - 1, py + 1, 8, 25, "Wood_D")
    for py in [cy - 15, cy - 7, cy, cy + 7, cy + 15]:
        for px in [cx - 21, cx + 21]:
            box(px - 1, px + 1, py - 1, py + 1, 8, 25, "Wood_D")
    # Open sanctuary doorway with warm gold altar glow inside
    box(cx - 5, cx + 5, cy - 15, cy - 13, 8, 21, "Wood_D")
    box(cx - 3, cx + 3, cy - 15, cy - 13, 10, 19, "Gold_M")
    box(cx - 1, cx + 1, cy - 15, cy - 13, 12, 17, "Gold_L")
    # Red lintel beam under eaves
    box(cx - 22, cx + 22, cy - 16, cy + 16, 24, 25, "Red_M")

    # Lower sweeping skirt roof (z=26..33)
    for dz in range(8):
        z = 26 + dz
        t = dz / 7.0
        rx = int(round(32 - t * 9))
        ry = int(round(26 - t * 8))
        for y in range(cy - ry, cy + ry + 1):
            for x in range(cx - rx, cx + rx + 1):
                dx, dy = abs(x - cx), abs(y - cy)
                edge = (dx >= rx - 1) or (dy >= ry - 1)
                corner = (dx >= rx - 2) and (dy >= ry - 2)
                if corner and dz < 3:
                    g[z, y, x] = PAL["Gold_M"]
                elif edge and dz == 0:
                    g[z, y, x] = PAL["Roof_L"]
                else:
                    rib = ((x + y) % 3 == 0)
                    g[z, y, x] = PAL["Roof_L" if rib else ("Roof_M" if dz % 2 == 0 else "Roof_D")]

    # Upper clerestory story (z=34..39)
    box(cx - 16, cx + 16, cy - 11, cy + 11, 34, 39, "Plaster_L")
    for px in [cx - 16, cx - 8, cx, cx + 8, cx + 16]:
        for py in [cy - 11, cy + 11]:
            box(px, px, py, py, 34, 39, "Wood_D")
    box(cx - 17, cx + 17, cy - 12, cy + 12, 39, 39, "Red_M")

    # Upper Irimoya hip-and-gable roof (z=40..53)
    for dz in range(14):
        z = 40 + dz
        t = dz / 13.0
        rx = int(round(26 - t * 14))
        ry = int(round(21 - t * 19))
        for y in range(cy - ry, cy + ry + 1):
            for x in range(cx - rx, cx + rx + 1):
                dx, dy = abs(x - cx), abs(y - cy)
                if dz >= 7 and dx == rx - 1 and dy < ry - 1:
                    # White Irimoya gable triangle on East/West ends!
                    g[z, y, x] = PAL["Plaster_L"]
                elif (dx >= rx - 2 and dy >= ry - 2) and dz < 3:
                    g[z, y, x] = PAL["Gold_M"]
                elif dy <= 1 and dz >= 12:
                    g[z, y, x] = PAL["Roof_L"]
                else:
                    rib = (x % 3 == 0)
                    g[z, y, x] = PAL["Roof_L" if rib else ("Roof_M" if dz % 2 == 0 else "Roof_D")]

    # Golden ridge ornaments (Shibi /鯱) at both ends of main roof ridge
    box(cx - 13, cx + 13, cy - 1, cy + 1, 53, 54, "Roof_L")
    box(cx - 13, cx - 11, cy - 1, cy + 1, 54, 57, "Gold_L")
    box(cx + 11, cx + 13, cy - 1, cy + 1, 54, 57, "Gold_L")
    box(cx - 1, cx + 1, cy - 1, cy + 1, 54, 56, "Gold_M")
    return export_strip(g, "hondo")


# 2) BELFRY (Shōrō) — Traditional Temple Bell Pavilion (44x44x52)
def build_belfry():
    W, H = 44, 52
    g = np.zeros((H, W, W, 4), dtype=np.float32)
    cx, cy = W // 2, W // 2

    def box(x0, x1, y0, y1, z0, z1, c):
        for z in range(max(0, z0), min(H, z1 + 1)):
            for y in range(max(0, y0), min(W, y1 + 1)):
                for x in range(max(0, x0), min(W, x1 + 1)):
                    g[z, y, x] = PAL[c]

    # Stone podium + steps
    box(cx - 14, cx + 14, cy - 14, cy + 14, 0, 4, "Stone_D")
    box(cx - 13, cx + 13, cy - 13, cy + 13, 1, 5, "Stone_M")
    box(cx - 12, cx + 12, cy - 12, cy + 12, 5, 6, "Stone_L")
    # 4 sturdy vermilion & cedar corner pillars
    for px in [cx - 10, cx + 10]:
        for py in [cy - 10, cy + 10]:
            box(px - 1, px + 1, py - 1, py + 1, 7, 27, "Red_M")
            box(px - 1, px + 1, py - 1, py + 1, 7, 9, "Wood_D")
            box(px - 1, px + 1, py - 1, py + 1, 25, 27, "Wood_D")
    # Top tie beams
    box(cx - 11, cx + 11, cy - 11, cy - 9, 25, 27, "Red_D")
    box(cx - 11, cx + 11, cy + 9, cy + 11, 25, 27, "Red_D")
    box(cx - 11, cx - 9, cy - 11, cy + 11, 25, 27, "Red_D")
    box(cx + 9, cx + 11, cy - 11, cy + 11, 25, 27, "Red_D")

    # Hanging Bronze Temple Bell (Bonshō) in center (z=12..24)
    for z in range(12, 24):
        rad = 5.2 if z < 15 else (4.5 if z < 21 else 3.0)
        for y in range(cy - 6, cy + 7):
            for x in range(cx - 6, cx + 7):
                d = math.hypot(x - cx, y - cy)
                if d <= rad:
                    c = "Gold_M" if z == 16 else ("Bronze_L" if x < cx else ("Bronze_M" if d < rad - 1 else "Bronze_D"))
                    g[z, y, x] = PAL[c]
    box(cx - 1, cx + 1, cy - 1, cy + 1, 24, 27, "Gold_D")  # bell hanger

    # Curved pyramidal slate roof (z=28..45)
    for dz in range(18):
        z = 28 + dz
        t = dz / 17.0
        r = int(round(18 * (1 - t * 0.85)))
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cy + r + 1):
                dx, dy = abs(x - cx), abs(y - cy)
                if (dx >= r - 1 and dy >= r - 1) and dz < 3:
                    g[z, y, x] = PAL["Gold_M"]
                else:
                    rib = ((x + y) % 2 == 0)
                    g[z, y, x] = PAL["Roof_L" if rib and dz % 2 == 0 else ("Roof_M" if rib else "Roof_D")]
    # Golden spire finial
    box(cx - 1, cx + 1, cy - 1, cy + 1, 45, 48, "Gold_M")
    box(cx, cx, cy, cy, 48, 51, "Gold_L")
    return export_strip(g, "belfry")


# 3) BRIDGE (Taiko-bashi) — Arched Red Japanese Wooden Bridge (54x54x24)
def build_bridge():
    W, H = 54, 24
    g = np.zeros((H, W, W, 4), dtype=np.float32)
    cx, cy = W // 2, W // 2

    # Bridge spans along X axis (x in cx-23..cx+23), width along Y (y in cy-10..cy+10)
    for x in range(cx - 24, cx + 25):
        nx = (x - cx) / 24.0
        arch_z = int(round((1.0 - nx * nx) * 8.5))
        # Stone abutment piers at both ends
        if abs(x - cx) >= 20:
            for z in range(0, arch_z + 3):
                for y in range(cy - 11, cy + 12):
                    g[z, y, x] = PAL["Stone_M" if z > 1 else "Stone_D"]
        # Under-arch support beams
        for y in [cy - 9, cy, cy + 9]:
            for z in range(max(0, arch_z), arch_z + 3):
                g[z, y, x] = PAL["Wood_D"]
        # Wooden plank deck
        plank_c = "Tan_L" if (x % 3 == 0) else ("Tan_M" if (x % 3 == 1) else "Wood_L")
        for y in range(cy - 9, cy + 10):
            g[arch_z + 3, y, x] = PAL["Wood_M"]
            g[arch_z + 4, y, x] = PAL[plank_c]
        # Vermilion side railings & posts
        for y in [cy - 10, cy + 10]:
            g[arch_z + 4, y, x] = PAL["Red_D"]
            g[arch_z + 7, y, x] = PAL["Red_M"]
            g[arch_z + 10, y, x] = PAL["Red_L"]
            if (x - cx) % 8 == 0 or abs(x - cx) == 23:
                for pz in range(arch_z + 4, arch_z + 12):
                    g[pz, y, x] = PAL["Red_M"]
                g[arch_z + 12, y, x] = PAL["Gold_M"]
                g[arch_z + 13, y, x] = PAL["Gold_L"]
    return export_strip(g, "bridge")


# 4) TSUKUBAI — Stone Water Basin + Bamboo Spout & Ladle (26x26x24)
def build_tsukubai():
    W, H = 26, 24
    g = np.zeros((H, W, W, 4), dtype=np.float32)
    cx, cy = W // 2, W // 2

    # Mossy base rocks & gravel
    for z in range(0, 4):
        for y in range(W):
            for x in range(W):
                d = math.hypot(x - cx, y - cy)
                if d <= 10.5 - z * 0.5:
                    g[z, y, x] = PAL["Moss_M" if (x + y) % 3 == 0 else ("Stone_D" if z < 2 else "Stone_M")]
    # Carved circular stone water basin (z=4..13)
    for z in range(4, 14):
        for y in range(W):
            for x in range(W):
                d = math.hypot(x - cx, y - (cy + 1))
                if d <= 6.8:
                    if z >= 11 and d <= 4.6:
                        g[z, y, x] = PAL["Water_L" if (x + y + z) % 3 == 0 else "Water_D"]
                    else:
                        g[z, y, x] = PAL["Stone_L" if z >= 12 else ("Stone_M" if x < cx else "Stone_D")]
    # Wooden ladle resting across top of basin
    for x in range(cx - 6, cx + 5):
        g[14, cy + 1, x] = PAL["Tan_L"]
    for y in range(cy, cy + 3):
        for x in range(cx - 3, cx):
            g[14, y, x] = PAL["Tan_M"]
    # Green bamboo upright post & water spout at back (cy - 6)
    for z in range(3, 21):
        for y in range(cy - 7, cy - 4):
            for x in range(cx - 1, cx + 2):
                g[z, y, x] = PAL["Moss_L" if z % 5 != 0 else "Moss_D"]
    # Spout reaching forward + falling water stream
    for y in range(cy - 5, cy):
        g[18, y, cx] = PAL["Moss_L"]
    for z in range(13, 18):
        g[z, cy - 1, cx] = PAL["Water_L" if z % 2 == 0 else "Water_D"]
    return export_strip(g, "tsukubai")


# 5) ZEN ROCK — Kyoto Karesansui Mossy Garden Boulder Cluster (30x30x26)
def build_zen_rock():
    W, H = 30, 26
    g = np.zeros((H, W, W, 4), dtype=np.float32)
    cx, cy = W // 2, W // 2

    # Rippled white zen gravel ring at base
    for z in range(0, 2):
        for y in range(W):
            for x in range(W):
                d = math.hypot(x - cx, y - cy)
                if d <= 13.5 - z:
                    g[z, y, x] = PAL["Sand_L" if int(d) % 2 == 0 else "Sand_D"]
    # 3 asymmetric Kyoto boulders (main tall stone + 2 companion stones)
    rocks = [
        (cx - 2, cy - 1, 7.2, 23),
        (cx + 5, cy + 3, 5.5, 14),
        (cx - 5, cy + 5, 4.5, 10),
    ]
    for rx, ry, rad0, hmax in rocks:
        for z in range(1, hmax):
            t = z / float(hmax)
            r = rad0 * (1.0 - t * 0.72)
            sx = rx + math.sin(z * 0.25) * 0.8
            for y in range(W):
                for x in range(W):
                    d = math.hypot((x - sx) * 1.05, (y - ry) * 0.95)
                    if d <= r:
                        if z >= hmax - 4 or (d < r * 0.65 and z > hmax * 0.55 and (x + y) % 2 == 0):
                            c = "Moss_L" if z > hmax - 3 else "Moss_M"
                        else:
                            c = "Stone_L" if (x < sx and y < ry) else ("Stone_M" if x < sx + 2 else "Stone_D")
                        g[z, y, x] = PAL[c]
    return export_strip(g, "zen_rock")


# 6) EMA RACK — Shrine Wooden Prayer Plaque & Fortune Stand (34x34x32)
def build_ema_rack():
    W, H = 34, 32
    g = np.zeros((H, W, W, 4), dtype=np.float32)
    cx, cy = W // 2, W // 2

    def box(x0, x1, y0, y1, z0, z1, c):
        for z in range(max(0, z0), min(H, z1 + 1)):
            for y in range(max(0, y0), min(W, y1 + 1)):
                for x in range(max(0, x0), min(W, x1 + 1)):
                    g[z, y, x] = PAL[c]

    # Stone base blocks & 2 tall dark timber posts
    box(cx - 12, cx - 8, cy - 3, cy + 3, 0, 2, "Stone_M")
    box(cx + 8, cx + 12, cy - 3, cy + 3, 0, 2, "Stone_M")
    box(cx - 11, cx - 9, cy - 1, cy + 1, 3, 24, "Wood_D")
    box(cx + 9, cx + 11, cy - 1, cy + 1, 3, 24, "Wood_D")
    # Vermilion crossbars
    for zb in [8, 15, 22]:
        box(cx - 11, cx + 11, cy - 1, cy + 1, zb, zb, "Red_M")
    # Hanging rows of wooden Ema prayer plaques + red ties
    for row_z in [10, 17]:
        for px in range(cx - 7, cx + 8, 4):
            box(px - 1, px + 1, cy - 1, cy + 1, row_z, row_z + 2, "Tan_L")
            box(px - 1, px + 1, cy - 1, cy + 1, row_z + 3, row_z + 3, "Red_L")
    # Mini pitched slate roof on top (z=24..30)
    for dz in range(7):
        z = 24 + dz
        ry = max(1, 5 - dz)
        box(cx - 14, cx + 14, cy - ry, cy + ry, z, z, "Roof_L" if dz % 2 == 0 else "Roof_D")
    box(cx - 14, cx + 14, cy, cy, 30, 31, "Gold_M")
    return export_strip(g, "ema_rack")


# 7) KOMAINU / KITSUNE — Stone Shrine Guardian Statue on Pedestal (24x24x30)
def build_komainu():
    W, H = 24, 30
    g = np.zeros((H, W, W, 4), dtype=np.float32)
    cx, cy = W // 2, W // 2

    def box(x0, x1, y0, y1, z0, z1, c):
        for z in range(max(0, z0), min(H, z1 + 1)):
            for y in range(max(0, y0), min(W, y1 + 1)):
                for x in range(max(0, x0), min(W, x1 + 1)):
                    g[z, y, x] = PAL[c]

    # Carved tiered stone pedestal (z=0..9)
    box(cx - 7, cx + 7, cy - 7, cy + 7, 0, 2, "Stone_D")
    box(cx - 5, cx + 5, cy - 5, cy + 5, 3, 7, "Stone_M")
    box(cx - 6, cx + 6, cy - 6, cy + 6, 8, 9, "Stone_L")
    # Seated guardian body (facing -Y)
    box(cx - 3, cx + 3, cy - 3, cy + 3, 10, 17, "Stone_M")
    box(cx - 2, cx + 2, cy - 4, cy + 2, 11, 18, "Stone_L")
    # Front legs
    box(cx - 3, cx - 2, cy - 4, cy - 2, 10, 15, "Stone_L")
    box(cx + 2, cx + 3, cy - 4, cy - 2, 10, 15, "Stone_L")
    # Sacred crimson bib (Maekake) across chest
    box(cx - 3, cx + 3, cy - 5, cy - 3, 15, 19, "Red_M")
    box(cx - 2, cx + 2, cy - 5, cy - 4, 14, 18, "Red_L")
    # Upright guardian head, snout & pointed fox/lion ears (z=19..28)
    box(cx - 3, cx + 3, cy - 4, cy + 1, 19, 24, "Stone_L")
    box(cx - 2, cx + 2, cy - 6, cy - 3, 20, 22, "Stone_L")  # snout
    box(cx - 2, cx - 2, cy - 5, cy - 5, 22, 22, "Gold_L")   # glowing eyes
    box(cx + 2, cx + 2, cy - 5, cy - 5, 22, 22, "Gold_L")
    box(cx - 3, cx - 2, cy - 2, cy, 25, 28, "Stone_M")      # left ear
    box(cx + 2, cx + 3, cy - 2, cy, 25, 28, "Stone_M")      # right ear
    # Upright bushy tail at back (+Y)
    box(cx - 2, cx + 2, cy + 3, cy + 5, 12, 22, "Stone_M")
    box(cx - 1, cx + 1, cy + 4, cy + 6, 18, 25, "Stone_L")
    return export_strip(g, "komainu")


# 8) BONSAI — Sculpted Courtyard Cloud-Pine in Planter (26x26x28)
def build_bonsai():
    W, H = 26, 28
    g = np.zeros((H, W, W, 4), dtype=np.float32)
    cx, cy = W // 2, W // 2

    # Glazed stone/ceramic bonsai pot (z=0..6)
    for z in range(0, 7):
        r = 6.5 if z < 5 else 7.5
        for y in range(W):
            for x in range(W):
                d = math.hypot(x - cx, y - cy)
                if d <= r:
                    c = "Moss_M" if (z == 6 and d < 5.8) else ("Roof_L" if z == 5 else ("Roof_M" if x < cx else "Roof_D"))
                    g[z, y, x] = PAL[c]
    # Winding gnarled bonsai trunk & branches (z=6..20)
    for z in range(6, 21):
        tx = cx + math.sin((z - 6) * 0.35) * 3.0
        ty = cy + math.cos((z - 6) * 0.25) * 1.5
        tr = max(1.4, 2.8 - (z - 6) * 0.08)
        for y in range(W):
            for x in range(W):
                if math.hypot(x - tx, y - ty) <= tr:
                    g[z, y, x] = PAL["Wood_L" if x < tx else "Wood_D"]
    # 3 Flat Cloud-Pruned Pine Canopy Pads
    pads = [
        (cx - 4, cy - 1, 14, 6.2, 4),
        (cx + 5, cy + 2, 17, 5.8, 4),
        (cx,     cy - 1, 22, 6.8, 5),
    ]
    for px, py, pz, prad, ph in pads:
        for dz in range(ph):
            z = pz + dz
            if z >= H:
                continue
            r = prad * (1.0 - abs(dz - ph * 0.4) / (ph * 0.85))
            for y in range(W):
                for x in range(W):
                    if math.hypot(x - px, y - py) <= r:
                        c = "Pine_L" if dz >= ph - 2 else ("Pine_M" if dz >= 1 else "Pine_D")
                        g[z, y, x] = PAL[c]
    return export_strip(g, "bonsai")


# 9) BANNER (Nobori) — Tall Shrine Flag Banner with Gold Crest (20x20x36)
def build_banner():
    W, H = 20, 36
    g = np.zeros((H, W, W, 4), dtype=np.float32)
    cx, cy = W // 2, W // 2

    def box(x0, x1, y0, y1, z0, z1, c):
        for z in range(max(0, z0), min(H, z1 + 1)):
            for y in range(max(0, y0), min(W, y1 + 1)):
                for x in range(max(0, x0), min(W, x1 + 1)):
                    g[z, y, x] = PAL[c]

    # Stone base weight
    box(cx - 4, cx + 2, cy - 3, cy + 3, 0, 3, "Stone_M")
    box(cx - 3, cx + 1, cy - 2, cy + 2, 4, 5, "Stone_L")
    # Tall black-lacquered pole & top arm
    box(cx - 3, cx - 2, cy, cy, 4, 34, "Wood_D")
    box(cx - 3, cx + 5, cy, cy, 33, 33, "Wood_D")
    box(cx - 3, cx - 2, cy, cy, 34, 35, "Gold_L")
    # Vertical fluttering crimson & gold-crested cloth banner (z=9..32)
    for z in range(9, 33):
        wave_y = cy + int(round(math.sin(z * 0.35) * 1.0))
        for x in range(cx - 1, cx + 6):
            is_border = (x == cx + 5) or (z < 12) or (z > 30)
            is_crest = (19 <= z <= 25) and (cx <= x <= cx + 3) and ((x + z) % 2 == 0)
            c = "Gold_L" if is_crest else ("Gold_M" if is_border else ("Red_L" if z % 4 == 0 else "Red_M"))
            g[z, wave_y, x] = PAL[c]
    return export_strip(g, "banner")


# 10) CHEST — 3D Sprite-Stacked Temple Treasure Chest (22x22x18)
def build_chest():
    W, H = 22, 18
    g = np.zeros((H, W, W, 4), dtype=np.float32)
    cx, cy = W // 2, W // 2

    def box(x0, x1, y0, y1, z0, z1, c):
        for z in range(max(0, z0), min(H, z1 + 1)):
            for y in range(max(0, y0), min(W, y1 + 1)):
                for x in range(max(0, x0), min(W, x1 + 1)):
                    g[z, y, x] = PAL[c]

    # Chest base box (z=0..9)
    box(cx - 7, cx + 7, cy - 5, cy + 5, 0, 9, "Red_D")
    box(cx - 6, cx + 6, cy - 4, cy + 4, 1, 9, "Red_M")
    # Gold corner straps & rim
    for px in [cx - 7, cx - 6, cx + 6, cx + 7]:
        box(px, px, cy - 5, cy + 5, 0, 10, "Gold_M")
    box(cx - 7, cx + 7, cy - 5, cy + 5, 9, 10, "Gold_M")
    # Curved arched chest lid (z=11..16)
    for dz in range(6):
        z = 11 + dz
        ry = max(2, 5 - dz // 2)
        box(cx - 7, cx + 7, cy - ry, cy + ry, z, z, "Red_L" if dz >= 3 else "Red_M")
        for px in [cx - 7, cx, cx + 7]:
            box(px, px, cy - ry, cy + ry, z, z, "Gold_L" if dz >= 3 else "Gold_M")
    # Front golden lock plate
    box(cx - 2, cx + 2, cy - 6, cy - 5, 7, 11, "Gold_L")
    return export_strip(g, "chest")


# 11) XPGEM — 3D Sprite-Stacked Spirit Crystal Orb (14x14x16)
def build_xpgem():
    W, H = 14, 16
    g = np.zeros((H, W, W, 4), dtype=np.float32)
    cx, cy, cz = W // 2, W // 2, 8
    for z in range(2, 15):
        for y in range(W):
            for x in range(W):
                # Octahedral diamond crystal distance
                d = abs(x - cx) * 0.9 + abs(y - cy) * 0.9 + abs(z - cz) * 0.75
                if d <= 5.2:
                    c = "Cyan_L" if (z > cz + 1 or (x < cx and y < cy)) else ("Cyan_M" if d < 4.0 else "Cyan_D")
                    g[z, y, x] = PAL[c]
    return export_strip(g, "xpgem")


# 12) GRASS TUFT — 3D Sprite-Stacked Interactive Tall Grass (16x16x12)
def build_grass_tuft():
    W, H = 16, 12
    g = np.zeros((H, W, W, 4), dtype=np.float32)
    cx, cy = W // 2, W // 2
    blades = [
        (cx - 3, cy - 1, -0.25, -0.10, 11),
        (cx + 3, cy - 1,  0.25, -0.10, 11),
        (cx,     cy + 2,  0.05,  0.22, 12),
        (cx - 2, cy + 2, -0.20,  0.18, 10),
        (cx + 2, cy - 2,  0.18, -0.22, 10),
        (cx,     cy - 1,  0.00,  0.00, 12),
    ]
    # Solid dark mossy root cluster at z=0..2
    for z in range(3):
        for y in range(cy - 3, cy + 4):
            for x in range(cx - 4, cx + 5):
                if math.hypot(x - cx, y - cy) <= 4.2 - z * 0.4:
                    g[z, y, x] = PAL["Moss_D" if z == 0 else "Moss_M"]
    # 3D upward curving grass blades
    for bx0, by0, dx, dy, bh in blades:
        for z in range(1, bh):
            bx = int(round(bx0 + dx * z))
            by = int(round(by0 + dy * z))
            r = 1 if z < bh - 3 else 0
            c = "Grass_L" if z >= bh - 3 else ("Moss_L" if z >= 5 else "Moss_M")
            for oy in range(-r, r + 1):
                for ox in range(-r, r + 1):
                    x, y = bx + ox, by + oy
                    if 0 <= x < W and 0 <= y < W:
                        g[z, y, x] = PAL[c]
    return export_strip(g, "grass_tuft")


build_hondo()
build_belfry()
build_bridge()
build_tsukubai()
build_zen_rock()
build_ema_rack()
build_komainu()
build_bonsai()
build_banner()
build_chest()
build_xpgem()
build_grass_tuft()
print("ALL_12_SHRINE_BIOME_SPRITE_STACKS_DONE")
