// ============================================================================
// Sakura Shrine — Modular 3D Voxel Enemies, Bosses, Scaling & Telegraph VFX
// Exposes window.SakuraEnemies (zero dependencies, runs cleanly in browser & CI)
// ============================================================================
(function (global) {
  'use strict';

  const ENEMY_DEFS = {
    ashigaru: {
      id: 'ashigaru', name: 'Воин Асигару', spriteKey: 'dummy', sw: 28, nS: 26,
      hpMul: 1.0, dmgMul: 1.0, speed: 38, r: 8.0, kbRes: 0.0, xpMul: 1.0, goldMul: 1.0,
      outCol: '#1a1018',
    },
    shinobi: {
      id: 'shinobi', name: 'Тень-Синоби', spriteKey: 'en_shinobi', sw: 28, nS: 26,
      hpMul: 0.74, dmgMul: 1.12, speed: 58, r: 7.5, kbRes: 0.10, xpMul: 1.2, goldMul: 1.25,
      outCol: '#161129',
    },
    yumi: {
      id: 'yumi', name: 'Тэнгу-Лучник', spriteKey: 'en_yumi', sw: 28, nS: 26,
      hpMul: 0.85, dmgMul: 1.15, speed: 34, r: 8.0, kbRes: 0.05, xpMul: 1.35, goldMul: 1.35,
      outCol: '#241218', ranged: true,
    },
    kitsunebi: {
      id: 'kitsunebi', name: 'Огонёк Кицунэби', spriteKey: 'en_kitsunebi', sw: 28, nS: 26,
      hpMul: 0.68, dmgMul: 1.80, speed: 50, r: 8.0, kbRes: 0.15, xpMul: 1.35, goldMul: 1.3,
      outCol: '#2e120e', bomber: true,
    },
    samurai: {
      id: 'samurai', name: 'Тяжёлый Самурай', spriteKey: 'en_samurai', sw: 32, nS: 32,
      hpMul: 2.75, dmgMul: 1.50, speed: 28, r: 10.5, kbRes: 0.65, xpMul: 2.35, goldMul: 2.4,
      outCol: '#210c14', heavy: true,
    },
  };

  const BOSS_ROTATION = ['oni_golem', 'shogun', 'kitsune_boss'];
  const BOSS_DEFS = {
    oni_golem: {
      id: 'oni_golem', name: 'Храмовый О́ни-Голем', banner: 'ХРАМОВЫЙ О́НИ-ГОЛЕМ',
      spriteKey: 'boss', sw: 44, nS: 42,
      hpMul: 1.0, dmgMul: 1.0, speed: 38, r: 14, outCol: '#140b14', accent: '#ff5c6c',
    },
    shogun: {
      id: 'shogun', name: 'Призрачный Сёгун Куроганэ', banner: 'ПРИЗРАЧНЫЙ СЁГУН КУРОГАНЭ',
      spriteKey: 'boss_shogun', sw: 44, nS: 42,
      hpMul: 1.16, dmgMul: 1.12, speed: 41, r: 14, outCol: '#1a0f2e', accent: '#b87cff',
    },
    kitsune_boss: {
      id: 'kitsune_boss', name: 'Девятихвостая Кицунэ', banner: 'ДЕВЯТИХВОСТАЯ КИЦУНЭ',
      spriteKey: 'boss_kitsune', sw: 44, nS: 42,
      hpMul: 1.06, dmgMul: 1.08, speed: 44, r: 13.5, outCol: '#2e0f18', accent: '#ff9642',
    },
  };

  function pickEnemyArchetype(waveNum, stageTier, distFromOrigin) {
    const r = Math.random();
    const farBonus = Math.min(0.16, Math.max(0, (distFromOrigin - 380) / 2800));
    if (waveNum <= 1) {
      return r < 0.14 + farBonus ? 'shinobi' : 'ashigaru';
    }
    if (waveNum === 2) {
      if (r < 0.18) return 'yumi';
      if (r < 0.48) return 'shinobi';
      return 'ashigaru';
    }
    if (waveNum === 3) {
      if (r < 0.16) return 'kitsunebi';
      if (r < 0.36) return 'yumi';
      if (r < 0.62) return 'shinobi';
      return 'ashigaru';
    }
    const heavyCh = Math.min(0.24, 0.12 + (stageTier - 1) * 0.025 + farBonus * 0.5);
    const bombCh = 0.16;
    const yumiCh = 0.20;
    const shinCh = 0.24;
    if (r < heavyCh) return 'samurai';
    if (r < heavyCh + bombCh) return 'kitsunebi';
    if (r < heavyCh + bombCh + yumiCh) return 'yumi';
    if (r < heavyCh + bombCh + yumiCh + shinCh) return 'shinobi';
    return 'ashigaru';
  }

  function makeStripCanvas(sw, nS, nFrames, drawVoxelFn) {
    const c = document.createElement('canvas');
    c.width = sw * nS;
    c.height = sw * nFrames;
    const g = c.getContext('2d');
    const mid = sw * 0.5;
    for (let f = 0; f < nFrames; f++) {
      const fy = f * sw;
      const phase = (f / nFrames) * Math.PI * 2;
      const stride = Math.sin(phase);
      const bob = Math.round(Math.abs(Math.sin(phase)) * 1.4);
      for (let z = 0; z < nS; z++) {
        const ox = z * sw;
        drawVoxelFn(g, ox, fy, sw, nS, mid, z, f, stride, bob);
      }
    }
    return c;
  }

  function pfill(g, ox, fy, x, y, w, h, col) {
    g.fillStyle = col;
    g.fillRect(ox + Math.round(x), fy + Math.round(y), w, h);
  }

  function buildShinobiStrip() {
    // 28x26x4: Sleek dark-indigo shinobi, flowing crimson scarf, glowing eyes, twin silver blades
    return makeStripCanvas(28, 26, 4, (g, ox, fy, sw, nS, mid, z, f, stride, bob) => {
      const lFootY = mid + stride * 3.0;
      const rFootY = mid - stride * 3.0;
      if (z >= 0 && z <= 7) {
        // Tabi boots & agile legs
        pfill(g, ox, fy, mid - 4, lFootY - 1, 3, 3, z < 2 ? '#1c182c' : '#2d2847');
        pfill(g, ox, fy, mid + 1, rFootY - 1, 3, 3, z < 2 ? '#1c182c' : '#2d2847');
      }
      if (z >= 7 && z <= 16) {
        // Sleek tapered dark-indigo torso + crimson obi belt (z=9..10)
        const tw = z >= 13 ? 8 : 6;
        pfill(g, ox, fy, mid - tw * 0.5, mid - 2.5, tw, 5, z === 9 || z === 10 ? '#c4293d' : (z >= 14 ? '#3c3663' : '#282342'));
        // Flowing crimson scarf trailing behind (local -Y = back, +Y = front)
        if (z >= 13 && z <= 16) {
          const sway = Math.sin(f * 1.57 + z * 0.6) * 2.0;
          pfill(g, ox, fy, mid - 2 + sway, mid - 5 - (z - 13) * 1.2, 4, 3, z >= 15 ? '#ff4d64' : '#c4293d');
        }
        // Dual silver kunai/wakizashi blades held forward (+Y)
        if (z >= 10 && z <= 13) {
          pfill(g, ox, fy, mid - 6, mid + 1 + stride * 1.5, 2, 5, z === 12 ? '#e6f2ff' : '#8da4c2');
          pfill(g, ox, fy, mid + 4, mid + 1 - stride * 1.5, 2, 5, z === 12 ? '#e6f2ff' : '#8da4c2');
        }
      }
      if (z >= 17 + bob && z <= 23 + bob) {
        // Hooded head + crimson headband + bright cyan-white eyes
        const hz = z - (17 + bob);
        const rad = hz <= 1 || hz >= 5 ? 4 : 6;
        pfill(g, ox, fy, mid - rad * 0.5, mid - rad * 0.5, rad, rad, hz === 3 ? '#c4293d' : (hz >= 5 ? '#3e3866' : '#25213d'));
        if (hz === 2) {
          pfill(g, ox, fy, mid - 2, mid + 2, 1, 1, '#7cf7ff');
          pfill(g, ox, fy, mid + 1, mid + 2, 1, 1, '#7cf7ff');
        }
      }
    });
  }

  function buildYumiStrip() {
    // 28x26x4: Corrupted Yumi archer in wide conical straw kasa hat + dark lacquered armor + red spirit bow
    return makeStripCanvas(28, 26, 4, (g, ox, fy, sw, nS, mid, z, f, stride, bob) => {
      if (z >= 0 && z <= 6) {
        pfill(g, ox, fy, mid - 4, mid + stride * 2.2 - 1, 3, 3, '#2b1e24');
        pfill(g, ox, fy, mid + 1, mid - stride * 2.2 - 1, 3, 3, '#2b1e24');
      }
      if (z >= 6 && z <= 16) {
        // Lacquered dark crimson/charcoal armor + quiver on back (-Y)
        const w = z >= 12 ? 9 : 7;
        pfill(g, ox, fy, mid - w * 0.5, mid - 3, w, 6, z === 9 ? '#d9414e' : (z >= 13 ? '#592935' : '#3d222b'));
        if (z >= 10 && z <= 15) {
          pfill(g, ox, fy, mid - 2, mid - 5, 4, 2, z >= 14 ? '#f2d9b1' : '#734433'); // quiver + arrow fletchings
        }
        // Long crimson spirit bow held on right-front (+X, +Y)
        if (z >= 7 && z <= 16) {
          const curve = Math.abs(z - 11.5) * 0.4;
          pfill(g, ox, fy, mid + 4.5, mid + 3.5 - curve, 2, 2, z === 11 || z === 12 ? '#ff8090' : '#b82538');
        }
      }
      if (z >= 16 && z <= 18) {
        // Shadowed face + glowing red eyes under kasa hat
        pfill(g, ox, fy, mid - 2.5, mid - 2.5, 5, 5, '#261a20');
        if (z === 17) {
          pfill(g, ox, fy, mid - 2, mid + 2, 1, 1, '#ff596c');
          pfill(g, ox, fy, mid + 1, mid + 2, 1, 1, '#ff596c');
        }
      }
      if (z >= 19 + bob && z <= 24 + bob) {
        // Iconic wide conical woven bamboo Kasa hat!
        const kz = z - (19 + bob);
        const r = Math.max(1.5, 8.2 - kz * 1.45);
        for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) {
          for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) {
            const d = Math.hypot(x, y);
            if (d <= r) {
              const rib = ((x + y) & 1) === 0;
              const col = kz >= 4 ? '#e8cf8e' : (d > r - 1.3 ? '#8c693a' : (rib ? '#cfa866' : '#b38b4d'));
              pfill(g, ox, fy, mid + x, mid + y, 1, 1, col);
            }
          }
        }
      }
    });
  }

  function buildKitsunebiStrip() {
    // 28x26x4: Floating cursed spirit-fire lantern / explosive fox-fire yokai!
    return makeStripCanvas(28, 26, 4, (g, ox, fy, sw, nS, mid, z, f) => {
      const hover = Math.round(Math.sin((f / 4) * Math.PI * 2) * 2.0);
      const lz = z - (5 + hover);
      if (lz < 0 || lz > 18) return;
      if (lz <= 12) {
        // Blazing spirit fire orb core (teardrop shape)
        const t = lz / 12;
        const r = lz < 4 ? (2.5 + lz * 1.1) : Math.max(1.5, 6.2 - (lz - 4) * 0.55);
        for (let y = -7; y <= 7; y++) {
          for (let x = -7; x <= 7; x++) {
            const d = Math.hypot(x, y);
            if (d <= r) {
              let col = d < r * 0.45 ? '#fff7c2' : (d < r * 0.78 ? '#ff9d3b' : '#e03c28');
              // Cursed white-red fox mask faceplate on front (+Y)
              if (lz >= 4 && lz <= 9 && y >= r - 1.6 && Math.abs(x) <= 3) {
                col = (lz === 6 && (Math.abs(x) === 2)) ? '#1a0b12' : '#fff0e6';
              }
              pfill(g, ox, fy, mid + x, mid + y, 1, 1, col);
            }
          }
        }
        // Two orbiting fox-fire ember motes
        if (lz === 7 || lz === 8) {
          const ang = (f / 4) * Math.PI * 2;
          pfill(g, ox, fy, mid + Math.cos(ang) * 8.5, mid + Math.sin(ang) * 8.5, 2, 2, '#6ef2ff');
          pfill(g, ox, fy, mid - Math.cos(ang) * 8.5, mid - Math.sin(ang) * 8.5, 2, 2, '#ffe066');
        }
      } else {
        // Flickering flame tip & two horned wisps
        const sway = Math.sin(f * 1.57 + lz) * 1.2;
        const rTip = Math.max(1, 3.2 - (lz - 12) * 0.5);
        pfill(g, ox, fy, mid - rTip + sway, mid - rTip, Math.ceil(rTip * 2), Math.ceil(rTip * 2), lz >= 16 ? '#fff2a6' : '#ff6c2f');
      }
    });
  }

  function buildSamuraiStrip() {
    // 32x32x4: Heavy broad-shouldered Oni-Samurai in crimson-black oyoroi armor + golden horned kabuto!
    return makeStripCanvas(32, 32, 4, (g, ox, fy, sw, nS, mid, z, f, stride, bob) => {
      if (z >= 0 && z <= 7) {
        pfill(g, ox, fy, mid - 5.5, mid + stride * 2.0 - 1.5, 4, 4, z < 2 ? '#1e1924' : '#3a222b');
        pfill(g, ox, fy, mid + 1.5, mid - stride * 2.0 - 1.5, 4, 4, z < 2 ? '#1e1924' : '#3a222b');
      }
      if (z >= 8 && z <= 19) {
        // Armored lamellar skirt & broad crimson-lacquered chestplate + shoulder sode plates
        const bw = z >= 14 ? 14 : 11;
        const bh = z >= 14 ? 8 : 7;
        pfill(g, ox, fy, mid - bw * 0.5, mid - bh * 0.5, bw, bh, (z % 3 === 0) ? '#b82538' : '#2d2333');
        // Golden trim on shoulders & chest
        if (z === 13 || z === 17) {
          pfill(g, ox, fy, mid - bw * 0.5, mid - bh * 0.5, bw, 1, '#f2c14e');
          pfill(g, ox, fy, mid - bw * 0.5, mid + bh * 0.5 - 1, bw, 1, '#f2c14e');
        }
        // Heavy Odachi blade carried on right (+X)
        if (z >= 10 && z <= 16) {
          pfill(g, ox, fy, mid + 7, mid - 1 + (z - 10) * 1.1, 2, 5, z >= 14 ? '#edf5ff' : '#96a9bf');
        }
      }
      if (z >= 20 + bob && z <= 28 + bob) {
        const hz = z - (20 + bob);
        if (hz <= 4) {
          // Dark iron kabuto bowl + menacing glowing golden visor eyes
          const hw = hz === 0 ? 9 : (hz <= 2 ? 10 : 8);
          pfill(g, ox, fy, mid - hw * 0.5, mid - hw * 0.5, hw, hw, hz === 0 ? '#5c1f2b' : '#282236');
          if (hz === 1) {
            pfill(g, ox, fy, mid - 2.5, mid + 3.5, 2, 1, '#ffe066');
            pfill(g, ox, fy, mid + 0.5, mid + 3.5, 2, 1, '#ffe066');
          }
        } else {
          // Sweeping golden kuwagata kabuto horns!
          const spread = 2 + (hz - 4) * 1.8;
          pfill(g, ox, fy, mid - spread - 1, mid + 2, 2, 2, '#fae04b');
          pfill(g, ox, fy, mid + spread - 1, mid + 2, 2, 2, '#fae04b');
          if (hz === 5) pfill(g, ox, fy, mid - 2, mid - 2, 4, 4, '#362e47');
        }
      }
    });
  }

  function buildShogunBossStrip() {
    // 44x42x4: Towering Spectral Shogun Kurogane — violet-obsidian armor, billowing crimson cloak, huge golden crescent kabuto & blazing nodachi!
    return makeStripCanvas(44, 42, 4, (g, ox, fy, sw, nS, mid, z, f, stride, bob) => {
      if (z >= 0 && z <= 9) {
        pfill(g, ox, fy, mid - 7, mid + stride * 2.5 - 2, 5, 5, z < 3 ? '#1c1429' : '#35264d');
        pfill(g, ox, fy, mid + 2, mid - stride * 2.5 - 2, 5, 5, z < 3 ? '#1c1429' : '#35264d');
      }
      if (z >= 10 && z <= 26) {
        // Wide armored oyoroi torso + spectral violet core seams
        const bw = z >= 18 ? 19 : 14;
        const bh = z >= 18 ? 11 : 9;
        const col = (z % 4 === 0) ? '#6c42a8' : (z >= 21 ? '#3b2b59' : '#261b3b');
        pfill(g, ox, fy, mid - bw * 0.5, mid - bh * 0.5, bw, bh, col);
        if (z === 15 || z === 22) {
          pfill(g, ox, fy, mid - bw * 0.5, mid + bh * 0.5 - 1, bw, 2, '#f7c552');
        }
        // Billowing crimson-violet war cloak on back (-Y)
        if (z >= 10 && z <= 24) {
          const fl = Math.sin(f * 1.57 + z * 0.35) * 2.2;
          pfill(g, ox, fy, mid - 7 + fl, mid - bh * 0.5 - 4, 14, 4, z >= 20 ? '#c42b47' : '#781931');
        }
        // Blazing spectral Nodachi sword held out (+X, +Y)
        if (z >= 14 && z <= 24) {
          const swing = stride * 2.0;
          pfill(g, ox, fy, mid + 9, mid + swing + (z - 14) * 0.9, 3, 7, z >= 20 ? '#e3c4ff' : '#a866ff');
        }
      }
      if (z >= 27 + bob && z <= 39 + bob) {
        const hz = z - (27 + bob);
        if (hz <= 5) {
          const hw = hz <= 2 ? 12 : 9;
          pfill(g, ox, fy, mid - hw * 0.5, mid - hw * 0.5, hw, hw, hz === 0 ? '#5c1f35' : '#261a3d');
          if (hz === 2) {
            pfill(g, ox, fy, mid - 3.5, mid + 5, 2, 1, '#6ef2ff');
            pfill(g, ox, fy, mid + 1.5, mid + 5, 2, 1, '#6ef2ff');
          }
        } else {
          // Huge sweeping golden crescent moon kabuto crest!
          const spread = 3 + (hz - 5) * 2.1;
          pfill(g, ox, fy, mid - spread - 1, mid + 3, 3, 2, '#ffe066');
          pfill(g, ox, fy, mid + spread - 2, mid + 3, 3, 2, '#ffe066');
          if (hz <= 8) pfill(g, ox, fy, mid - 3, mid - 3, 6, 6, '#3b295c');
        }
      }
    });
  }

  function buildKitsuneBossStrip() {
    // 44x42x4: Nine-Tailed Celestial Kitsune Boss — snow-white & crimson fox spirit, 5 fanned fiery tails & spirit halo!
    return makeStripCanvas(44, 42, 4, (g, ox, fy, sw, nS, mid, z, f) => {
      const hover = Math.round(Math.sin((f / 4) * Math.PI * 2) * 1.8);
      const lz = z - (3 + hover);
      if (lz < 0 || lz > 36) return;
      // 5 Fanned Fiery Fox Tails curving up behind (-Y)!
      if (lz >= 4 && lz <= 31) {
        const t = (lz - 4) / 27;
        for (let ti = -2; ti <= 2; ti++) {
          const spreadX = ti * (4.2 + t * 4.5) + Math.sin(f * 1.57 + ti) * 1.2;
          const tailY = mid - 5 - Math.sin(t * Math.PI) * 9.5;
          const tw = t > 0.72 ? 3 : 4;
          const col = t > 0.78 ? '#ff5938' : (t > 0.55 ? '#ff9d3b' : '#fff5f2');
          pfill(g, ox, fy, mid + spreadX - tw * 0.5, tailY - tw * 0.5, tw, tw, col);
        }
      }
      // Graceful snow-white & vermilion shrine kimono body
      if (lz >= 2 && lz <= 22) {
        const r = lz < 8 ? (8.5 - lz * 0.25) : (6.8 - (lz - 8) * 0.14);
        for (let y = -9; y <= 9; y++) {
          for (let x = -9; x <= 9; x++) {
            if (x * x + y * y <= r * r) {
              const isSash = lz >= 10 && lz <= 13;
              const isCollar = lz === 19 || lz === 20;
              const col = isCollar ? '#f7c552' : (isSash ? '#d42c3f' : (y > 2 ? '#ffffff' : '#f2dce0'));
              pfill(g, ox, fy, mid + x, mid + y, 1, 1, col);
            }
          }
        }
      }
      // Sculpted Fox Head + pointed crimson-tipped fox ears + glowing amber eyes
      if (lz >= 23 && lz <= 33) {
        const hz = lz - 23;
        if (hz <= 5) {
          const rw = hz <= 2 ? 10 : 8;
          pfill(g, ox, fy, mid - rw * 0.5, mid - rw * 0.5, rw, rw, '#fff7f5');
          // Fox snout projecting +Y
          if (hz <= 3) pfill(g, ox, fy, mid - 2, mid + rw * 0.5 - 1, 4, 4, hz === 1 ? '#ff4d64' : '#ffffff');
          if (hz === 2) {
            pfill(g, ox, fy, mid - 3, mid + 3.5, 2, 1, '#ff9d3b');
            pfill(g, ox, fy, mid + 1, mid + 3.5, 2, 1, '#ff9d3b');
          }
        } else {
          // Twin tall pointed fox ears with vermilion tips
          const eh = hz - 5; // 1..5
          const ew = Math.max(2, 4 - Math.floor(eh * 0.6));
          const col = eh >= 3 ? '#d93044' : '#fff7f5';
          pfill(g, ox, fy, mid - 5.5, mid - 1, ew, ew, col);
          pfill(g, ox, fy, mid + 5.5 - ew, mid - 1, ew, ew, col);
        }
      }
      // Orbiting Fox-Fire Spirit Orbs at z=20..22
      if (lz === 18 || lz === 19) {
        for (let k = 0; k < 3; k++) {
          const a = (f / 4) * Math.PI * 2 + (k * Math.PI * 2) / 3;
          pfill(g, ox, fy, mid + Math.cos(a) * 14, mid + Math.sin(a) * 14, 3, 3, lz === 19 ? '#fff2a6' : '#ff7b29');
        }
      }
    });
  }

  function buildAll(IMGS) {
    IMGS.en_shinobi   = buildShinobiStrip();
    IMGS.en_yumi      = buildYumiStrip();
    IMGS.en_kitsunebi = buildKitsunebiStrip();
    IMGS.en_samurai   = buildSamuraiStrip();
    IMGS.boss_shogun  = buildShogunBossStrip();
    IMGS.boss_kitsune = buildKitsuneBossStrip();
  }

  // Crisp pixel-art ground telegraph rings + enemy projectiles (arrows, shogun crescents, foxfire orbs)
  function drawTelegraphs(g, telegraphs, w2s, W, H, tilt, shkX, shkY, tSec) {
    if (!telegraphs.length) return;
    for (let i = 0; i < telegraphs.length; i++) {
      const tg = telegraphs[i];
      const [sx, sy] = w2s(tg.x, tg.y, W, H, tilt);
      if (sx < -tg.r - 12 || sx > W + tg.r + 12 || sy < -tg.r - 12 || sy > H + tg.r + 12) continue;
      const prog = Math.max(0, Math.min(1, 1 - tg.timer / tg.maxTimer));
      const rx = tg.r, ry = Math.max(3, tg.r * tilt);
      const px = Math.round(sx + shkX), py = Math.round(sy + shkY);
      const col = tg.color || '#ff4d5e';
      // Soft danger fill
      g.fillStyle = tg.fillCol || 'rgba(255, 62, 82, 0.16)';
      g.beginPath(); g.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); g.fill();
      // Expanding inner charge fill showing exact detonation timing
      g.fillStyle = tg.chargeCol || 'rgba(255, 92, 92, 0.28)';
      g.beginPath(); g.ellipse(px, py, Math.max(2, rx * prog), Math.max(1.5, ry * prog), 0, 0, Math.PI * 2); g.fill();
      // Crisp outer dotted perimeter ring (flashes white right before impact!)
      const flash = prog > 0.82 && ((Math.floor(tSec * 24) & 1) === 0);
      g.fillStyle = flash ? '#ffffff' : col;
      const dots = Math.max(14, Math.round(rx * 0.85));
      for (let d = 0; d < dots; d++) {
        const a = (d / dots) * Math.PI * 2 + tSec * 1.4;
        g.fillRect(Math.round(px + Math.cos(a) * rx), Math.round(py + Math.sin(a) * ry), 2, 1);
      }
    }
  }

  function drawEnemyProjectiles(g, projs, w2s, W, H, tilt, camAngle, shkX, shkY, tSec) {
    if (!projs.length) return;
    for (let i = 0; i < projs.length; i++) {
      const pr = projs[i];
      const [sx, sy] = w2s(pr.x, pr.y, W, H, tilt);
      if (sx < -24 || sx > W + 24 || sy < -24 || sy > H + 24) continue;
      const px = Math.round(sx + shkX), py = Math.round(sy + shkY - (pr.z || 12));
      if (pr.kind === 'shogun_wave') {
        // Purple glowing spectral crescent blade wave!
        const ang = pr.angle + camAngle;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        g.fillStyle = '#1d0d2e';
        for (let k = -4; k <= 4; k++) {
          const ox = -sa * k * 1.8 - ca * Math.abs(k) * 0.55;
          const oy = (ca * k * 1.8 - sa * Math.abs(k) * 0.55) * tilt;
          g.fillRect(Math.round(px + ox) - 2, Math.round(py + oy) - 2, 5, 5);
        }
        g.fillStyle = '#b86eff';
        for (let k = -4; k <= 4; k++) {
          const ox = -sa * k * 1.8 - ca * Math.abs(k) * 0.55;
          const oy = (ca * k * 1.8 - sa * Math.abs(k) * 0.55) * tilt;
          g.fillRect(Math.round(px + ox) - 1, Math.round(py + oy) - 1, 3, 3);
        }
        g.fillStyle = '#ffffff';
        g.fillRect(px - 1, py - 1, 2, 2);
      } else if (pr.kind === 'foxfire') {
        // Radiant Kitsune fox-fire orb with dark outline & bright ember core
        const pulse = (Math.sin(tSec * 16 + i) > 0) ? 1 : 0;
        g.fillStyle = '#290d12'; g.fillRect(px - 4, py - 4, 9, 9);
        g.fillStyle = '#ff5929'; g.fillRect(px - 3, py - 3, 7, 7);
        g.fillStyle = '#ffc947'; g.fillRect(px - 2, py - 2, 5 + pulse, 5);
        g.fillStyle = '#ffffff'; g.fillRect(px - 1, py - 1, 2, 2);
      } else {
        // High-contrast crimson Yumi enemy spirit arrow
        const ang = pr.angle + camAngle;
        const dx = Math.cos(ang), dy = Math.sin(ang) * tilt;
        g.fillStyle = '#1f0b12';
        for (let s = -4; s <= 4; s += 2) {
          g.fillRect(Math.round(px + dx * s) - 1, Math.round(py + dy * s) - 1, 3, 3);
        }
        g.fillStyle = '#ff425b';
        for (let s = -4; s <= 4; s += 2) {
          g.fillRect(Math.round(px + dx * s), Math.round(py + dy * s), 2, 2);
        }
        g.fillStyle = '#fff5d6';
        g.fillRect(Math.round(px + dx * 4), Math.round(py + dy * 4), 2, 2);
      }
    }
  }

  global.SakuraEnemies = {
    ENEMY_DEFS,
    BOSS_ROTATION,
    BOSS_DEFS,
    pickEnemyArchetype,
    buildAll,
    drawTelegraphs,
    drawEnemyProjectiles,
  };
})(window);
