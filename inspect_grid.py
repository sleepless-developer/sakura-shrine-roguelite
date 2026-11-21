import bpy, numpy as np

SRC = r"C:\Users\izxnxmi\.gemini\antigravity\brain\44289f9c-1e60-4a0e-8591-555e6fb4212b\female_rogue_archer_hoodless_neutral_1795212735561.jpg"
img = bpy.data.images.load(SRC)
w, h = img.size
a = (np.array(img.pixels[:], np.float32).reshape(h, w, 4)[::-1, :, :3] * 255.0)

# Find best grid phase (ox, oy) in [0..14] for step=15 by maximizing gradient energy on cell boundaries
gx = np.abs(np.diff(a, axis=1)).mean((0, 2))
gy = np.abs(np.diff(a, axis=0)).mean((1, 2))
step = 15.0
best_ox = max(np.linspace(0, step, 60, endpoint=False),
              key=lambda o: gx[np.clip(np.round(np.arange(o, w - 1, step)).astype(int), 0, w - 2)].mean())
best_oy = max(np.linspace(0, step, 60, endpoint=False),
              key=lambda o: gy[np.clip(np.round(np.arange(o, h - 1, step)).astype(int), 0, h - 2)].mean())
print(f"PHASE ox={best_ox:.2f} oy={best_oy:.2f}")

# Sample interior median of each 15x15 cell
xs = np.arange(best_ox, w - step + 1, step)
ys = np.arange(best_oy, h - step + 1, step)
gw, gh = len(xs), len(ys)
grid = np.zeros((gh, gw, 3), np.uint8)
for r, y0 in enumerate(ys):
    yi0, yi1 = int(round(y0)) + 3, int(round(y0 + step)) - 3
    for c, x0 in enumerate(xs):
        xi0, xi1 = int(round(x0)) + 3, int(round(x0 + step)) - 3
        grid[r, c] = np.median(a[yi0:yi1, xi0:xi1], axis=(0, 1)).round().astype(np.uint8)

# Save clean native 1x PNG and 12x preview
def save_png(arr, path):
    hh, ww = arr.shape[:2]
    rgba = np.dstack([arr, np.full((hh, ww, 1), 255, np.uint8)])
    im = bpy.data.images.new("t", ww, hh, alpha=True)
    im.colorspace_settings.name = "sRGB"
    im.pixels.foreach_set((rgba[::-1].astype(np.float32) / 255.0).ravel())
    im.filepath_raw = path; im.file_format = "PNG"; im.save()
    bpy.data.images.remove(im)

save_png(grid, r"C:\Users\izxnxmi\Documents\CODEX CHAT LOGS\katana-zero-archer\base_native.png")
save_png(grid.repeat(12, 0).repeat(12, 1), r"C:\Users\izxnxmi\Documents\CODEX CHAT LOGS\katana-zero-archer\base_12x.png")

# Print head/face zone (find skin pixels first!)
# Skin: warm orange-peach (R > 160, G > 100, R - B > 55)
R, G, B = grid[..., 0].astype(int), grid[..., 1].astype(int), grid[..., 2].astype(int)
skin = (R > 155) & (G > 90) & (R - B > 50) & (G < 190)
sr, sc = np.where(skin)
print(f"GRID {gw}x{gh} | SKIN rows {sr.min()}..{sr.max()} cols {sc.min()}..{sc.max()}")

# Print ASCII + palette table for head bounding box (rows r0..r1, cols c0..c1)
r0, r1 = max(0, int(sr.min()) - 8), min(gh, int(sr.min()) + 13)
c0, c1 = max(0, int(sc.min()) - 7), min(gw, int(sc.min()) + 10)
bg = grid[0, 0]
print("BG", "#%02x%02x%02x" % tuple(bg))
# Quantize unique colors inside head box (cluster within L1<14)
syms = " .:#@=+*oO%$&123456789abcdefABCDEF"
pal = [bg]
def get_id(rgb):
    for i, p in enumerate(pal):
        if np.abs(rgb.astype(int) - p.astype(int)).sum() < 22:
            return i
    pal.append(rgb)
    return len(pal) - 1

print(f"HEAD BOX rows={r0}..{r1-1} cols={c0}..{c1-1}")
print("    " + "".join(f"{c%10}" for c in range(c0, c1)))
for r in range(r0, r1):
    line = ""
    for c in range(c0, c1):
        idx = get_id(grid[r, c])
        line += syms[idx] if idx < len(syms) else "?"
    print(f"r{r:02d} {line}")
for i, p in enumerate(pal):
    if i < len(syms):
        print(f"  '{syms[i]}' = #{p[0]:02x}{p[1]:02x}{p[2]:02x}")
