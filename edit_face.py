import bpy, numpy as np

SRC = r"C:\Users\izxnxmi\Documents\CODEX CHAT LOGS\katana-zero-archer\base_native.png"
OUT = r"C:\Users\izxnxmi\Documents\CODEX CHAT LOGS\katana-zero-archer"

im = bpy.data.images.load(SRC)
w, h = im.size
orig = (np.array(im.pixels[:], np.float32).reshape(h, w, 4)[::-1, :, :3] * 255.0).round().astype(np.uint8)
g = orig.copy()

def hex3(s):
    s = s.lstrip("#")
    return np.array([int(s[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.uint8)

# Clean neutral feminine palette (harmonized with the sprite's exact colors!)
C = {
    "BG":  hex3("3e4148"),   # neutral grey bg
    "OUT": hex3("131223"),   # dark ink outline
    "H0":  hex3("1a1a29"),   # deep hair shadow
    "H1":  hex3("272834"),   # mid dark hair
    "H2":  hex3("434654"),   # soft hair highlight
    "H3":  hex3("646875"),   # bright hair sheen
    "S0":  hex3("b67459"),   # soft warm skin shadow
    "S1":  hex3("e4a27b"),   # clean warm peach skin
    "S2":  hex3("f3bf9b"),   # bright warm skin highlight
    "BL":  hex3("df847c"),   # subtle natural rosy cheek blush
    "LP":  hex3("c96b6b"),   # delicate rose lip pixel
    "EW":  hex3("faf4ef"),   # eye sclera white
    "EP":  hex3("181526"),   # dark pupil / lash
    "EI":  hex3("3c4e6b"),   # subtle cool slate-blue iris depth
    "C1":  hex3("545763"),   # cloak collar mid
    "C2":  hex3("70747f"),   # cloak collar highlight
}

# Hand-crafted pixel-by-pixel feminine face & framing hair (rows 17..26, cols 39..49)
# Original head box for reference:
#   r18..r25 had a wide blocky 5px jaw & tiny 1px squinty eye.
# New design:
#   - Soft swept bangs & delicate cheek-framing side-lock (c40..41)
#   - Expressive 2px-tall feminine eye with crisp dark upper eyelash + sclera + iris
#   - Lighter, cleaner peach skin + 1px soft cheek blush + tiny delicate nose + subtle rose lip
#   - Slender tapered chin (2px wide at r25) instead of square jaw!
patch = {
    # r17: sleek crown/forehead hair
    (17, 41): "H1", (17, 42): "H2", (17, 43): "H1", (17, 44): "H2", (17, 45): "H1", (17, 46): "H1", (17, 47): "OUT",
    # r18: swept bangs curving softly across forehead
    (18, 41): "H1", (18, 42): "H1", (18, 43): "H2", (18, 44): "H1", (18, 45): "S1", (18, 46): "H0", (18, 47): "OUT",
    # r19: forehead & soft brow arch
    (19, 40): "H0", (19, 41): "H1", (19, 42): "H0", (19, 43): "H0", (19, 44): "S1", (19, 45): "S2", (19, 46): "H0", (19, 47): "OUT",
    # r20: crisp curved upper eyelash + petite ear hint + slender side-lock
    (20, 39): "S1", (20, 40): "H0", (20, 41): "H1", (20, 42): "EP", (20, 43): "EP", (20, 44): "EP", (20, 45): "S2", (20, 46): "H0", (20, 47): "OUT", (20, 48): "BG",
    # r21: expressive feminine eye (white sclera + dark lash/pupil) + cheek lock
    (21, 39): "S0", (21, 40): "H0", (21, 41): "H1", (21, 42): "S1", (21, 43): "EW", (21, 44): "EP", (21, 45): "S2", (21, 46): "OUT", (21, 47): "BG",
    # r22: lower iris pixel (2px-tall eye!) + soft blush + delicate petite nose tip
    (22, 40): "OUT", (22, 41): "H0", (22, 42): "BL", (22, 43): "EW", (22, 44): "EI", (22, 45): "S2", (22, 46): "S1", (22, 47): "OUT",
    # r23: slender cheek + subtle blush + clean tucked profile under nose
    (23, 40): "H0", (23, 41): "H1", (23, 42): "S1", (23, 43): "S2", (23, 44): "S2", (23, 45): "S1", (23, 46): "OUT", (23, 47): "BG",
    # r24: tapered jawline + delicate rose lip + flowing cheek strand
    (24, 40): "C2", (24, 41): "OUT", (24, 42): "S0", (24, 43): "S1", (24, 44): "S1", (24, 45): "LP", (24, 46): "OUT",
    # r25: delicate narrow 2px feminine chin!
    (25, 41): "C2", (25, 42): "OUT", (25, 43): "S0", (25, 44): "S1", (25, 45): "OUT", (25, 46): "BG",
    # r26: clean dark collar separation under narrow chin (separates chin from drawing hand!)
    (26, 42): "OUT", (26, 43): "OUT", (26, 44): "H1", (26, 45): "OUT",
}

for (r, c), key in patch.items():
    g[r, c] = C[key]

# Harmonize hand skin tones ONLY (not the gold arrow collar at col >= 59!)
for r in range(26, 31):
    for c in range(42, 59):
        px = g[r, c].astype(int)
        if px[0] > 180 and px[1] > 110 and px[0] - px[2] > 55:
            g[r, c] = C["S2"] if px[0] > 215 else C["S1"]
        elif px[0] > 130 and px[1] > 70 and px[0] - px[2] > 40 and px[2] < 100:
            g[r, c] = C["S0"]

def save_png(arr, path):
    hh, ww = arr.shape[:2]
    if arr.shape[2] == 3:
        rgba = np.dstack([arr, np.full((hh, ww, 1), 255, np.uint8)])
    else:
        rgba = arr
    t = bpy.data.images.new("out", ww, hh, alpha=True)
    t.colorspace_settings.name = "sRGB"
    t.pixels.foreach_set((rgba[::-1].astype(np.float32) / 255.0).ravel())
    t.filepath_raw = path; t.file_format = "PNG"; t.save()
    bpy.data.images.remove(t)

# Save full native & 12x crisp PNG
save_png(g, OUT + r"\rogue_archer_feminine_1x.png")
save_png(g.repeat(12, 0).repeat(12, 1), OUT + r"\rogue_archer_feminine_12x.png")

# Save side-by-side face zoom (BEFORE vs AFTER, x20) so we can verify every pixel!
crop_a = orig[11:30, 32:54]
crop_b = g[11:30, 32:54]
sep = np.full((crop_a.shape[0], 2, 3), 240, np.uint8)
comp = np.concatenate([crop_a, sep, crop_b], axis=1).repeat(18, 0).repeat(18, 1)
save_png(comp, OUT + r"\face_compare.png")

# Also save transparent sprite (flood-fill remove background + optional remove floor)
# Remove outer background + enclosed bg pockets (inside bow & between legs)
bg = g[0, 0].astype(int)
is_bg = np.abs(g.astype(int) - bg).sum(-1) < 14
vis = np.zeros((h, w), bool)
stack = [(0, 0), (0, w - 1), (24, 52), (34, 53), (48, 40)]
while stack:
    r, c = stack.pop()
    if r < 0 or r >= h or c < 0 or c >= w or vis[r, c] or not is_bg[r, c]:
        continue
    vis[r, c] = True
    stack.extend([(r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)])
# Also mask floor strip (rows >= 51)
alpha = (~vis).astype(np.uint8) * 255
alpha[51:, :] = 0
# Tight crop around character with 2px padding
ys, xs = np.where(alpha > 0)
y0, y1 = max(0, ys.min() - 2), min(h, ys.max() + 3)
x0, x1 = max(0, xs.min() - 2), min(w, xs.max() + 3)
rgba_crop = np.dstack([g[y0:y1, x0:x1], alpha[y0:y1, x0:x1]])
save_png(rgba_crop, OUT + r"\rogue_archer_sprite_1x.png")
save_png(rgba_crop.repeat(12, 0).repeat(12, 1), OUT + r"\rogue_archer_sprite_12x.png")
print("SAVED_OK", f"sprite={rgba_crop.shape[1]}x{rgba_crop.shape[0]}")
