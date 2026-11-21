# Sakura Shrine — 2.5D Sprite-Stacking Pixel-Art Roguelite

A standalone browser-based 2.5D voxel **Sprite-Stacking** roguelite set in an infinite Kyoto Sakura Shrine world, featuring a custom Katana ZERO-inspired rogue archer rig, Megabonk-style build-crafting, and hand-crafted pixel-art shaders.

## Quick Start

No build step required — `playground/index.html` is fully self-contained (all sprite-stack sheets are embedded as data URIs):

```bash
python -m http.server 8765 --directory playground
# Open http://127.0.0.1:8765/
```

Or open `playground/index.html` directly in any modern browser.

## Highlights

- **Split 3D Voxel Sprite-Stacking Archer (`sprite-stack/`)**: Separate animated lower/upper body rig (`idle`, `run`, `back`, `shoot`) with anatomical hip twist limits (`±55°`) and full 360° camera rotation.
- **Infinite Procedural World**:
  - Central Grand Courtyard (`680×680`) with seamless wall bays (`wall_bay` + tiled corner/bay pillars), Pagoda, Hondō Hall, Belfry, Karesansui Zen Rock Garden, and Distance-Field Koi Pond with real-time wavy pixel reflections.
  - Non-repeating Macro-Region (`3×3` chunks) generator producing procedural walled outer Courtyard Biomes (`Двор Пагоды`, `Двор Хондо`, `Сад Дзэн`), pure forests (`Роща Сакуры`, `Осенний Лес`, `Сосновый Бор`), dense interactive tall-grass meadow patches, and terraced **Golden Wheat Fields** (`Пшеничное Поле`).
- **Pixel-Art Visual Tech**:
  - Wang Tiles seamless moss terrain, Bayer 4×4 dither bubble, Outline-Based Normal Maps (`KeyN`) with true directional lantern & sun lighting, cohesive single-crown tree wind, sub-pixel camera lock (zero decor jitter), and interactive tall grass & wheat with diagonal wind waves, spring physics, and trampled regrowth trails.
  - Heavy combat juice: hit-stop freeze frames, 2-stage hit-flash, squash & stretch, impulse knockback, and pop-scale damage numbers with zero world/building shake.
- **Megabonk-Style 3-Source Progression**:
  - **Level-Up → 8 Onigiri Tomes (`KeyO`)**: Pure stat scaling with 5-tier Luck-weighted rarity (`1.0×`–`2.2×`), including Overcrit (`>100%` → `!!`), AoE Size, Quantity, Cooldown, XP/Magnet, Luck/Gold, and Vitality/Agility.
  - **Chests → 12 Synergy Relics (`KeyU`)**: Passive procs, chains, and elemental triggers (`Фонарь Духов` / Overpowered Lamp, `Кровавый Кристалл` / Leeching Crystal + Kevin save, `Мороз Юки-онны`, `Пламя Кицунэ`, `Молния Райдзина`, `Рикошет Синоби`, `Клинок Иайдо`, `Вихрь Сакуры`, `Светило Аматэрасу`, etc.).
  - **3D Voxel Altars**: `Алтарь Силы` (`[E]` → drops a random permanent blessing orb, no pause/no chest), `Алтарь Притяжения` (`[E]` → global XP vacuum + Magnet, no chest), and `Алтарь Жадности` (capture circle → `+15%` Difficulty, ambush pack, Gold, and Rare Chest).

## Controls

| Key | Action |
|---|---|
| `WASD` / Arrows | Move / Strafe / Backpedal |
| `Shift` | Shadow Dash (invulnerability + Iaido slash) |
| `R` | Arrow Rain (manual or smart auto-cast) |
| `F` | Chronos Focus (slow-mo + Spirit Dragon Arrow) |
| `E` | Activate nearby Altar (`Алтарь Силы` / `Алтарь Притяжения`) or rotate 3D camera right |
| `Q` / `E` / RMB Drag | Rotate 3D camera 360° |
| `I` | Open Inventory (8 Onigiri + 12 Chest Relics with instant hover tooltips) |
| `O` / `U` | Open Onigiri / Chest test modals |
| `G` / `N` / `H` | New world seed / Toggle Normal Maps / Toggle HUD |

## Repository Structure

- `playground/index.html` — Complete playable standalone 2.5D roguelite.
- `playground/build_*.py` & `playground/assets/` — Procedural voxel sprite-stack asset generators and raw strips.
- `sprite-stack/` — Archer 3D voxel stack scripts, Blender/Aseprite exporters, rotation sheets, and standalone 3D viewer (`sprite-stack/viewer/index.html`).
