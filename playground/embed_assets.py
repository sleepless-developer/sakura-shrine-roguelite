import base64
import os
import re

ROOT = r"C:\Users\izxnxmi\Documents\CODEX CHAT LOGS\katana-zero-archer"
HTML_PATH = os.path.join(ROOT, "playground", "index.html")

FILES = {
    "sakura":    os.path.join(ROOT, "playground", "assets", "tree_sakura_strip.png"),
    "pine":      os.path.join(ROOT, "playground", "assets", "tree_pine_strip.png"),
    "autumn":    os.path.join(ROOT, "playground", "assets", "tree_autumn_strip.png"),
    "pagoda":    os.path.join(ROOT, "playground", "assets", "pagoda_strip.png"),
    "hondo":     os.path.join(ROOT, "playground", "assets", "hondo_strip.png"),
    "belfry":    os.path.join(ROOT, "playground", "assets", "belfry_strip.png"),
    "bridge":    os.path.join(ROOT, "playground", "assets", "bridge_strip.png"),
    "wall":      os.path.join(ROOT, "playground", "assets", "wall_strip.png"),
    "pillar":    os.path.join(ROOT, "playground", "assets", "wall_pillar_strip.png"),
    "torii":     os.path.join(ROOT, "playground", "assets", "torii_strip.png"),
    "lantern":   os.path.join(ROOT, "playground", "assets", "lantern_strip.png"),
    "tsukubai":  os.path.join(ROOT, "playground", "assets", "tsukubai_strip.png"),
    "zen_rock":  os.path.join(ROOT, "playground", "assets", "zen_rock_strip.png"),
    "ema_rack":  os.path.join(ROOT, "playground", "assets", "ema_rack_strip.png"),
    "komainu":   os.path.join(ROOT, "playground", "assets", "komainu_strip.png"),
    "bonsai":    os.path.join(ROOT, "playground", "assets", "bonsai_strip.png"),
    "banner":    os.path.join(ROOT, "playground", "assets", "banner_strip.png"),
    "chest":        os.path.join(ROOT, "playground", "assets", "chest_strip.png"),
    "xpgem":        os.path.join(ROOT, "playground", "assets", "xpgem_strip.png"),
    "grass_lush":   os.path.join(ROOT, "playground", "assets", "grass_lush_strip.png"),
    "grass_wild":   os.path.join(ROOT, "playground", "assets", "grass_wild_strip.png"),
    "grass_fern":   os.path.join(ROOT, "playground", "assets", "grass_fern_strip.png"),
    "grass_clover": os.path.join(ROOT, "playground", "assets", "grass_clover_strip.png"),
    "grass_flower": os.path.join(ROOT, "playground", "assets", "grass_flower_strip.png"),
    "dummy":        os.path.join(ROOT, "playground", "assets", "enemy_dummy_strip.png"),
    "boss":      os.path.join(ROOT, "playground", "assets", "enemy_boss_strip.png"),
    "idle_lo":   os.path.join(ROOT, "sprite-stack", "out", "anim_strips", "archer_idle_lower.png"),
    "idle_hi":   os.path.join(ROOT, "sprite-stack", "out", "anim_strips", "archer_idle_upper.png"),
    "run_lo":    os.path.join(ROOT, "sprite-stack", "out", "anim_strips", "archer_run_lower.png"),
    "run_hi":    os.path.join(ROOT, "sprite-stack", "out", "anim_strips", "archer_run_upper.png"),
    "back_lo":   os.path.join(ROOT, "sprite-stack", "out", "anim_strips", "archer_back_lower.png"),
    "back_hi":   os.path.join(ROOT, "sprite-stack", "out", "anim_strips", "archer_back_upper.png"),
    "shoot_lo":  os.path.join(ROOT, "sprite-stack", "out", "anim_strips", "archer_shoot_lower.png"),
    "shoot_hi":  os.path.join(ROOT, "sprite-stack", "out", "anim_strips", "archer_shoot_upper.png"),
}

with open(HTML_PATH, "r", encoding="utf-8") as f:
    html = f.read()

lines = ["const IMAGES_SRC = {"]
for k, p in FILES.items():
    with open(p, "rb") as bf:
        b64 = base64.b64encode(bf.read()).decode("ascii")
    lines.append(f"  {k}: 'data:image/png;base64,{b64}',")
lines.append("};")
block = "\n".join(lines)

html, n = re.subn(r"const IMAGES_SRC\s*=\s*\{[\s\S]*?\};", block, html, count=1)
assert n == 1, "IMAGES_SRC block not found!"

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html)

print("EMBEDDED_V9_OK", len(html))
