import bpy, numpy as np

SRC = r"C:\Users\izxnxmi\Documents\CODEX CHAT LOGS\katana-zero-archer\base_native.png"
OUT = r"C:\Users\izxnxmi\Documents\CODEX CHAT LOGS\katana-zero-archer"

im = bpy.data.images.load(SRC)
w, h = im.size
orig = (np.array(im.pixels[:], np.float32).reshape(h, w, 4)[::-1, :, :3] * 255.0).round().astype(np.uint8)

def hex3(s):
    s = s.lstrip("#")
    return np.array([int(s[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.uint8)

C = {
    "BG":  hex3("3e4148"),
    "OUT": hex3("131223"),
    "H0":  hex3("1a1a29"),
    "H1":  hex3("272834"),
    "H2":  hex3("434654"),
    "H3":  hex3("646875"),
    # Clean warm peach skin (inspired by user's eye refs, zero pink lips!)
    "S0":  hex3("c67a63"),   # warm salmon-tan skin shadow (matches ref border tone)
    "S1":  hex3("e8a882"),   # clean warm peach mid
    "S2":  hex3("f6c8a2"),   # bright warm peach highlight
    # Eye palette directly from user's references
    "EL":  hex3("221c2c"),   # dark lash / pupil
    "ES":  hex3("9aa1bc"),   # lavender-grey upper sclera shadow (from ref!)
    "EW":  hex3("ffffff"),   # crisp white lower sclera
    "ER":  hex3("843b3e"),   # dark crimson-brown lower iris accent (from ref #1)
    "EB1": hex3("1f49c4"),   # deep sapphire iris (from ref #2)
    "EB2": hex3("33aeff"),   # bright cyan-blue lower iris (from ref #2)
    "EA1": hex3("a65c14"),   # deep amber iris
    "EA2": hex3("f4c944"),   # bright gold lower iris
    "C2":  hex3("70747f"),
    "G1":  hex3("f9dd44"),
    "G2":  hex3("d29b26"),
}

# Common refined hoodless feminine head/jaw base (NO lips, NO blush, clean tapered chin)
BASE_HEAD = {
    (17, 41): "H1", (17, 42): "H2", (17, 43): "H1", (17, 44): "H2", (17, 45): "H1", (17, 46): "H1", (17, 47): "OUT",
    (18, 41): "H1", (18, 42): "H1", (18, 43): "H2", (18, 44): "H1", (18, 45): "S1", (18, 46): "H0", (18, 47): "OUT",
    (19, 40): "H0", (19, 41): "H1", (19, 42): "H0", (19, 43): "H0", (19, 44): "S1", (19, 45): "S2", (19, 46): "H0", (19, 47): "OUT",
    (20, 39): "S1", (20, 40): "H0", (20, 41): "H1", (20, 45): "S2", (20, 46): "H0", (20, 47): "OUT", (20, 48): "BG",
    (21, 39): "S0", (21, 40): "H0", (21, 41): "H1", (21, 45): "S2", (21, 46): "OUT", (21, 47): "BG",
    (22, 40): "OUT", (22, 41): "H0", (22, 45): "S2", (22, 46): "S1", (22, 47): "OUT",
    # Clean lower face — NO lips, NO blush, crisp serious jawline
    (23, 40): "H0", (23, 41): "H1", (23, 42): "S0", (23, 43): "S1", (23, 44): "S2", (23, 45): "S1", (23, 46): "OUT", (23, 47): "BG",
    (24, 40): "C2", (24, 41): "OUT", (24, 42): "S0", (24, 43): "S1", (24, 44): "S2", (24, 45): "S1", (24, 46): "OUT",
    (25, 41): "C2", (25, 42): "OUT", (25, 43): "S0", (25, 44): "S1", (25, 45): "OUT", (25, 46): "BG",
    (26, 42): "OUT", (26, 43): "OUT", (26, 44): "H1", (26, 45): "OUT",
}

def make_sprite(eye_patch):
    g = orig.copy()
    for (r, c), k in BASE_HEAD.items():
        g[r, c] = C[k]
    for (r, c), k in eye_patch.items():
        g[r, c] = C[k]
    # Harmonize hand skin tones (not gold arrow at col >= 59)
    for r in range(26, 31):
        for c in range(42, 59):
            px = g[r, c].astype(int)
            if px[0] > 180 and px[1] > 110 and px[0] - px[2] > 55:
                g[r, c] = C["S2"] if px[0] > 215 else C["S1"]
            elif px[0] > 130 and px[1] > 70 and px[0] - px[2] > 40 and px[2] < 100:
                g[r, c] = C["S0"]
    return g

# 4 distinct serious combat-gaze eye variants (NO lips!):
VARIANTS = [
    # 1: Ref #1 exact grammar — flat heavy dark lash, lavender upper sclera, white lower, dark pupil + crimson-brown iris
    ("1", {
        (20, 42): "EL", (20, 43): "EL", (20, 44): "S0",
        (21, 42): "ER", (21, 43): "ES", (21, 44): "EL",
        (22, 42): "S0", (22, 43): "EW", (22, 44): "ER",
    }, {
        # Front-view eye pattern (11x8 face block): left eye cols 2..4, right eye cols 6..8
        "L": [("EL","EL","S0"), ("ER","ES","EL"), ("S0","EW","ER")],
        "R": [("S0","EL","EL"), ("EL","ES","ER"), ("ER","EW","S0")],
    }),
    # 2: Winged feline rogue gaze + piercing sapphire/cyan iris (from Ref #2 bottom row + winged lash)
    ("2", {
        (19, 43): "H0", (19, 44): "H0",
        (20, 41): "EL", (20, 42): "EL", (20, 43): "EL", (20, 44): "S0",
        (21, 42): "ES", (21, 43): "EB1", (21, 44): "EL",
        (22, 42): "EW", (22, 43): "EB2", (22, 44): "EB1",
    }, {
        "L": [("EL","EL","S0"), ("ES","EB1","EL"), ("EW","EB2","EB1")],
        "R": [("S0","EL","EL"), ("EL","EB1","ES"), ("EB1","EB2","EW")],
        "wing": True,
    }),
    # 3: Fierce furrowed combat brow + amber-gold predator iris (matches gold cloak trim!)
    ("3", {
        (19, 42): "H0", (19, 43): "EL", (19, 44): "EL",
        (20, 42): "S0", (20, 43): "EL", (20, 44): "EL",
        (21, 42): "ES", (21, 43): "EA1", (21, 44): "EL",
        (22, 42): "EW", (22, 43): "EA2", (22, 44): "S0",
    }, {
        "L": [("S0","EL","EL"), ("ES","EA1","EL"), ("EW","EA2","S0")],
        "R": [("EL","EL","S0"), ("EL","EA1","ES"), ("S0","EA2","EW")],
        "angry_brow": True,
    }),
    # 4: Cold narrowed assassin squint (compact 2px-tall intense stare, Ref #2 top-right)
    ("4", {
        (19, 42): "H0", (19, 43): "H0", (19, 44): "S1",
        (20, 42): "S1", (20, 43): "S2", (20, 44): "S2",
        (21, 41): "EL", (21, 42): "EL", (21, 43): "EL", (21, 44): "S0",
        (22, 42): "ES", (22, 43): "EW", (22, 44): "EL",
        (23, 42): "S0", (23, 43): "S1", (23, 44): "S0",
    }, {
        "L": [("S2","S2","S2"), ("EL","EL","S0"), ("ES","EW","EL")],
        "R": [("S2","S2","S2"), ("S0","EL","EL"), ("EL","EW","ES")],
        "squint": True,
    }),
]

def make_front_head(fspec):
    """Build a crisp 18x18 front-view rogue head preview matching our archer & eye refs."""
    H_f, W_f = 18, 18
    im_f = np.broadcast_to(C["BG"], (H_f, W_f, 3)).copy()
    # Silhouette of dark hair + gold hair-tie peeking behind + lowered cloak collar
    hair_rows = [
        (2,  5, 13, "OUT"),
        (3,  4, 14, "H1"),
        (4,  3, 15, "H1"),
        (5,  3, 15, "H1"),
        (6,  3, 15, "H0"),
        (7,  3, 15, "H0"),
        (8,  3, 15, "H0"),
        (9,  3, 15, "H0"),
        (10, 3, 15, "H0"),
        (11, 3, 15, "H0"),
        (12, 4, 14, "H0"),
        (13, 4, 14, "OUT"),
    ]
    for r, c0, c1, k in hair_rows:
        im_f[r, c0:c1] = C[k]
    # Dark outer hair outline
    for r in range(3, 13):
        im_f[r, 3 if r < 12 else 4] = C["OUT"]
        im_f[r, 14 if r < 12 else 13] = C["OUT"]
    # Hair highlights & swept bangs
    im_f[3, 6:12] = C["H2"]; im_f[4, 5:7] = C["H2"]; im_f[4, 11:13] = C["H2"]
    im_f[1, 8:10] = C["G1"]; im_f[2, 7:11] = C["G2"]  # gold tie peek at crown
    # Face skin area (cols 5..12, rows 7..13 — clean tapered chin at row 13!)
    for r in range(7, 13):
        im_f[r, 5:13] = C["S2"]
        im_f[r, 5] = C["S0"]; im_f[r, 12] = C["S0"]
    # Tapered chin (row 13)
    im_f[13, 6:12] = C["S1"]; im_f[13, 7:11] = C["S2"]
    im_f[14, 7:11] = C["OUT"]
    # Lowered dark cloak collar (rows 14..17)
    for r in range(14, 18):
        im_f[r, 3:15] = C["H1"]
        im_f[r, 3] = C["OUT"]; im_f[r, 14] = C["OUT"]
    im_f[14, 5:13] = C["C2"]; im_f[14, 7:11] = C["OUT"]
    im_f[15, 6:12] = C["H0"]; im_f[15, 8:10] = C["S0"]  # neck shadow
    # Bangs hanging into forehead (rows 6..7)
    im_f[6, 5:13] = C["H1"]; im_f[6, 8:10] = C["H0"]
    im_f[7, 5:7] = C["H0"]; im_f[7, 8:10] = C["H0"]; im_f[7, 11:13] = C["H0"]
    # Place left eye (cols 5..7, rows 8..10) & right eye (cols 10..12, rows 8..10)
    for dr in range(3):
        for dc in range(3):
            im_f[8 + dr, 5 + dc] = C[fspec["L"][dr][dc]]
            im_f[8 + dr, 10 + dc] = C[fspec["R"][dr][dc]]
    if fspec.get("wing"):
        im_f[8, 4] = C["EL"]; im_f[8, 13] = C["EL"]
    if fspec.get("angry_brow"):
        im_f[7, 6:8] = C["EL"]; im_f[7, 10:12] = C["EL"]
    # Side hair locks framing cheeks (cols 4 & 13)
    im_f[9:13, 4] = C["H1"]; im_f[9:13, 13] = C["H1"]
    return im_f

# Tiny crisp 3x5 pixel numerals for labels 1..4
DIGITS = {
    "1": ["010","110","010","010","111"],
    "2": ["111","001","111","100","111"],
    "3": ["111","001","111","001","111"],
    "4": ["101","101","111","001","001"],
}
def stamp_digit(canvas, d, r0, c0, scale=4, col=(249, 221, 68)):
    pat = DIGITS[d]
    for r, row in enumerate(pat):
        for c, ch in enumerate(row):
            if ch == "1":
                canvas[r0 + r*scale:r0 + (r+1)*scale, c0 + c*scale:c0 + (c+1)*scale] = col

def save_png(arr, path):
    hh, ww = arr.shape[:2]
    rgba = np.dstack([arr, np.full((hh, ww, 1), 255, np.uint8)])
    t = bpy.data.images.new("out", ww, hh, alpha=True)
    t.colorspace_settings.name = "sRGB"
    t.pixels.foreach_set((rgba[::-1].astype(np.float32) / 255.0).ravel())
    t.filepath_raw = path; t.file_format = "PNG"; t.save()
    bpy.data.images.remove(t)

# Build 4-column showcase card:
#   Each column = 320px wide:
#     Row 1 (side face zoom x14): 20x18 -> 280x252
#     Row 2 (front face zoom x14): 18x18 -> 252x252
#     Row 3 (full side sprite x5): 54x46 -> 270x230
COL_W = 320
CARD_W = COL_W * 4 + 24
CARD_H = 38 + 260 + 260 + 244 + 20
card = np.full((CARD_H, CARD_W, 3), (38, 40, 47), np.uint8)

for idx, (label, ep, fspec) in enumerate(VARIANTS):
    sp = make_sprite(ep)
    save_png(sp, OUT + f"\\variant_{label}_1x.png")
    save_png(sp.repeat(12, 0).repeat(12, 1), OUT + f"\\variant_{label}_12x.png")

    x_col = 12 + idx * COL_W
    # Subtle card frame per column
    card[8:CARD_H - 8, x_col + 4:x_col + COL_W - 4] = (50, 53, 62)
    stamp_digit(card, label, 16, x_col + COL_W // 2 - 8, scale=4)

    # Row 1: side-view face closeup (rows 11..29, cols 33..53) x13
    side_z = sp[11:29, 33:53].repeat(13, 0).repeat(13, 1)
    sh, sw = side_z.shape[:2]
    y1 = 44
    x1 = x_col + (COL_W - sw) // 2
    card[y1:y1 + sh, x1:x1 + sw] = side_z

    # Row 2: front-view face closeup (18x18) x13
    front_z = make_front_head(fspec).repeat(13, 0).repeat(13, 1)
    fh, fw = front_z.shape[:2]
    y2 = y1 + sh + 16
    x2 = x_col + (COL_W - fw) // 2
    card[y2:y2 + fh, x2:x2 + fw] = front_z

    # Row 3: full side sprite (rows 8..54, cols 14..68) x5
    full_z = sp[8:54, 14:68].repeat(5, 0).repeat(5, 1)
    uh, uw = full_z.shape[:2]
    y3 = y2 + fh + 16
    x3 = x_col + (COL_W - uw) // 2
    card[y3:y3 + uh, x3:x3 + uw] = full_z

save_png(card, OUT + r"\face_4_variants.png")
print("VARIANTS_OK", card.shape)
