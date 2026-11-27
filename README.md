# Sakura Shrine — 2.5D Sprite-Stacking Pixel-Art Roguelite

A standalone browser-based 2.5D voxel **Sprite-Stacking** roguelite set in an infinite Kyoto Sakura Shrine world, featuring a custom Katana ZERO-inspired rogue archer rig, Megabonk-style build-crafting, and hand-crafted pixel-art shaders.

## Quick Start

No build step required — serve `playground/` over local HTTP so modular scripts (`playground/modules/*.js`) and fonts load cleanly:

```bash
python -m http.server 8765 --directory playground
# Open http://127.0.0.1:8765/
```

## Highlights

- **Split 3D Voxel Sprite-Stacking Archer (`sprite-stack/`)**: Separate animated lower/upper body rig (`idle`, `run`, `back`, `shoot`) with anatomical hip twist limits (`±55°`) and full 360° camera rotation.
- **Infinite Procedural World**:
  - Central Grand Courtyard (`680×680`) and procedural outer Sanctuary & Ruined Courtyards (`Двор Пагоды`, `Двор Хондо`, `Сад Дзэн`, `Руины`) with seamless wall bays (`wall_bay` + tiled corner/bay pillars), Pagoda, Hondō Hall, Chashitsu, Chozuya, Kura, Rokkakudo, Belfry, Karesansui Zen Rock Garden, and Distance-Field Koi Pond with real-time wavy pixel reflections.
  - Pure forests (`Роща Сакуры`, `Осенний Лес`, `Сосновый Бор`) with randomized large voxel-scaled trees (`1.14×–1.62×`) split into Y-sorted trunks and elevated overhanging canopies above characters, dense interactive tall-grass meadow patches, and terraced **Golden Wheat Fields** (`Пшеничное Поле`).
- **Pixel-Art Visual Tech**:
  - 5-layer LRU chunked Wang Tiles moss terrain (`256×256` RAM `Uint32Array` blender), 5-layer pixel-art courtyard & Voronoi Ranbari ruin floors (`playground/modules/courtyard-floor.js`), floor-embedded `0.000°`-locked 3D decor (`bridge`, `ruin_rubble`, `fallen_lantern`), pure-GPU Bayer 4×4 dither bubble for buildings, Outline-Based Normal Maps (`KeyN`), cohesive single-crown tree wind, sub-pixel camera lock, and interactive tall grass & wheat with spring physics.
  - Overhauled pixel-art combat VFX (`playground/modules/combat-vfx.js`): Samurai & Spirit Dragon arrows, Arrow Rain sky mandala & vibrating stuck arrows, Chronos Focus clockface aura, Shadow Dash wind bursts, 3D depth-sorted Iaido slash arcs, orbiting Sakura Blades, fractal Chain Lightning, Amaterasu solar pillars, and Kitsune fire bursts.
- **Megabonk-Style 3-Source Progression**:
  - **Level-Up → 10 Onigiri Tomes (`KeyO`)**: Uniform neutral Onigiri rarity in the HUD/inventory, while each Onigiri rolls across 5 strictly distinct stat tiers (`1.0×`–`2.0×`), including Damage, Cooldown, Quantity, Overcrit (`>100%` → `!!`), AoE Size, XP/Magnet, Luck/Gold, Vitality, Range, and **Wind Movement Speed** (`Онигири Ветра`).
  - **Chests → 12 Synergy Relics (`KeyU`)**: Passive procs, chains, and elemental triggers (`Фонарь Духов`, `Кровавый Кристалл`, `Мороз Юки-онны`, `Пламя Кицунэ`, `Молния Райдзина`, `Рикошет Синоби`, `Клинок Иайдо`, `Вихрь Сакуры`, `Светило Аматэрасу`, etc.).
  - **3D Voxel Altars**: `Каменная Хокора` (`Алтарь Силы` — permanent stat blessings & **+1 Shadow Dash Sprint Charge**), `Ступа Горинто` (`Алтарь Притяжения`), and `Стела Сэкихи` (`Алтарь Жадности`).
- **5 Enemy Archetypes, 3 Bosses & Multi-Vector Difficulty Scaling (`playground/modules/enemies.js`)**:
  - Progressive wave/time/depth/altar scaling unlocking `Ashigaru`, `Shinobi` lungers, ranged `Yumi` archers, explosive `Kitsunebi` wisps, heavy `Samurai`, and 3 rotating 3D voxel bosses (**Temple Oni-Golem**, **Spectral Shogun Kurogane**, and **Nine-Tailed Kitsune**) with telegraphed AoE attacks and dodgeable projectiles.

## Controls

| Key | Action |
|---|---|
| `WASD` / Arrows | Move / Strafe / Backpedal |
| `Shift` | Shadow Dash (invulnerability + Iaido slash) |
| `R` | Arrow Rain (manual or smart auto-cast) |
| `F` | Chronos Focus (slow-mo + Spirit Dragon Arrow) |
| `E` | Activate nearby Altar (`Алтарь Силы` / `Алтарь Притяжения`) or rotate 3D camera right |
| `Q` / `E` / RMB Drag | Rotate 3D camera 360° |
| `I` | Open Inventory (9 Onigiri + 12 Chest Relics with instant hover tooltips) |
| `O` / `U` | Open Onigiri / Chest test modals |
| `G` / `N` / `H` | New world seed / Toggle Normal Maps / Toggle HUD |

## Repository Structure

- `playground/index.html` — Main playable 2.5D sprite-stacking roguelite entry point.
- `playground/modules/` — Modular floor, ruin sprite, and combat VFX renderers (`courtyard-floor.js`, `ruin-floor.js`, `ruin-sprites.js`, `combat-vfx.js`).
- `playground/assets/` — Pixel font (`alagard-cyrillic.ttf`) and raw sprite assets.
- `mcp/sakura-studio-server.mjs` — Local zero-dependency MCP visual inspection server for headless sprite-sheet and courtyard previews.
- `sprite-stack/` — Archer 3D voxel stack scripts, Blender/Aseprite exporters, rotation sheets, and standalone 3D viewer (`sprite-stack/viewer/index.html`).
