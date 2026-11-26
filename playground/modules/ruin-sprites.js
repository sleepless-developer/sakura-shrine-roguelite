// Modular 3D Voxel Sprite-Stack Builders for Ancient Japanese Ruins
// Loaded by playground/index.html as window.SakuraRuinSprites
(function () {
  // Deterministic crisp pixel hash for organic weathering (moss, cracks, tile chips)
  function h3(x, y, z) {
    let n = (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  // 1) RUIN RUBBLE: Clustered fallen granite coping blocks, broken cedar rafter beam, shattered dark slate tiles & moss cushions (32x32x18)
  function makeRuinRubbleStrip() {
    const sw = 32, nS = 18;
    const c = document.createElement('canvas'); c.width = sw * nS; c.height = sw;
    const g = c.getContext('2d');
    const blocks = [
      { cx: 11, cy: 15, rx: 7.2, ry: 5.0, h: 12, colA: '#6c7482', colB: '#959fad' }, // large fallen stone block
      { cx: 21, cy: 18, rx: 5.8, ry: 4.4, h: 9,  colA: '#5f6875', colB: '#858f9e' }, // cracked granite slab
      { cx: 15, cy: 10, rx: 4.0, ry: 3.6, h: 16, colA: '#666f7d', colB: '#909aa8' }, // jagged pillar stump
      { cx: 7,  cy: 21, rx: 4.5, ry: 3.1, h: 6,  colA: '#323a48', colB: '#54627a' }, // shattered dark kawara tiles
      { cx: 24, cy: 12, rx: 4.1, ry: 3.0, h: 5,  colA: '#384152', colB: '#5e6d87' }, // shattered tile debris
      { cx: 18, cy: 23, rx: 6.8, ry: 2.1, h: 5,  colA: '#4a3422', colB: '#6e4e34' }, // snapped aged cedar beam
    ];
    for (let z = 0; z < nS; z++) {
      const ox = z * sw;
      for (let y = 2; y < sw - 2; y++) {
        for (let x = 2; x < sw - 2; x++) {
          let col = null;
          for (const b of blocks) {
            if (z >= b.h) continue;
            const t = z / b.h;
            const nx = (x - b.cx) / (b.rx * (1 - t * 0.22));
            const ny = (y - b.cy) / (b.ry * (1 - t * 0.22));
            if (nx * nx + ny * ny <= 1.0) {
              const nv = h3(x, y, z);
              const moss = (z >= b.h - 2 && nv < 0.42) || (z <= 2 && nv < 0.25);
              col = moss ? (z >= b.h - 2 ? '#78983b' : '#4d6b26') : (x < b.cx ? b.colB : b.colA);
            }
          }
          if (col) { g.fillStyle = col; g.fillRect(ox + x, y, 1, 1); }
        }
      }
    }
    return c;
  }

  // 2) FALLEN STONE LANTERN: Toppled mossy Ishidoro stone lantern lying sideways (32x32x16)
  function makeFallenLanternStrip() {
    const sw = 32, nS = 16;
    const c = document.createElement('canvas'); c.width = sw * nS; c.height = sw;
    const g = c.getContext('2d');
    for (let z = 0; z < nS; z++) {
      const ox = z * sw;
      if (z <= 8) {
        const rad = 4.2 - z * 0.14;
        for (let y = 10; y <= 22; y++) for (let x = 3; x <= 12; x++) {
          if (Math.hypot(x - 7, y - 16) <= rad) {
            const moss = (z >= 6 && h3(x, y, z) < 0.65) || (z <= 2 && h3(x, y, z) < 0.28);
            g.fillStyle = moss ? '#5c7a2d' : (y < 16 ? '#96a0ae' : '#68717f');
            g.fillRect(ox + x, y, 1, 1);
          }
        }
      }
      if (z >= 1 && z <= 7) {
        const halfY = (z === 1 || z === 7) ? 1 : 2;
        for (let x = 10; x <= 19; x++) {
          for (let y = 16 - halfY; y <= 16 + halfY; y++) {
            const moss = z >= 6 && h3(x, y, z) < 0.58;
            g.fillStyle = moss ? '#6d8d35' : (z >= 5 ? '#acb5c2' : '#78818f');
            g.fillRect(ox + x, y, 1, 1);
          }
        }
      }
      if (z <= 14) {
        const capRad = z <= 2 ? 4.6 : (z <= 9 ? 5.9 - Math.abs(z - 5.5) * 0.34 : Math.max(1.2, 4.9 - (z - 9) * 0.72));
        for (let y = 9; y <= 23; y++) for (let x = 18; x <= 29; x++) {
          const d = Math.hypot((x - 23.5) * 0.9, y - 16);
          if (d <= capRad) {
            const isHollow = z >= 3 && z <= 6 && x >= 19 && x <= 21 && Math.abs(y - 16) <= 1;
            const moss = !isHollow && ((z >= 9 && h3(x, y, z) < 0.68) || (z <= 3 && h3(x, y, z) < 0.22));
            g.fillStyle = isHollow ? '#232832' : (moss ? (z >= 11 ? '#80a140' : '#557329') : (y < 16 ? '#a2abb8' : '#6c7583'));
            g.fillRect(ox + x, y, 1, 1);
          }
        }
      }
    }
    return c;
  }

  // 3) SHATTERED RUIN WALL STUB: Jagged broken temple wall end with exposed wooden lath, collapsed roof tiles & moss (44x44x25)
  function makeRuinWallStubStrip() {
    const sw = 44, nS = 25;
    const c = document.createElement('canvas'); c.width = sw * nS; c.height = sw;
    const g = c.getContext('2d');
    for (let z = 0; z < nS; z++) {
      const ox = z * sw;
      const maxX = Math.round(37 - z * 0.85 + Math.sin(z * 1.15) * 1.8);
      if (z <= 5) {
        for (let x = 6; x <= Math.min(38, maxX + 2); x++) {
          for (let y = 18; y <= 26; y++) {
            const moss = (z <= 2 || z === 5) && h3(x, y, z) < 0.34;
            g.fillStyle = moss ? '#547329' : (y < 21 ? '#8c95a3' : '#5c6472');
            g.fillRect(ox + x, y, 1, 1);
          }
        }
        if (z <= 3) {
          g.fillStyle = z === 3 ? '#58667e' : '#333c4c';
          g.fillRect(ox + 26, 27, 6, 3); g.fillRect(ox + 33, 15, 5, 3);
        }
      } else if (z >= 6 && z <= 18) {
        for (let x = 7; x <= maxX; x++) {
          const nearBreak = x >= maxX - 3;
          for (let y = 19; y <= 25; y++) {
            if (nearBreak && ((z % 3 === 0) || (y === 22))) {
              g.fillStyle = '#4c3522'; // exposed bamboo/cedar lath (komai)
            } else if (nearBreak) {
              g.fillStyle = '#898377'; // raw earthen wall core
            } else {
              const nv = h3(x, y, z);
              const moss = z <= 9 && nv < 0.26;
              g.fillStyle = moss ? '#607f30' : (nv > 0.84 ? '#b4b1a6' : (y <= 21 ? '#dfddd2' : '#c7c4b9'));
            }
            g.fillRect(ox + x, y, 1, 1);
          }
        }
        g.fillStyle = '#423022'; g.fillRect(ox + 6, 18, 3, 8);
      } else if (z >= 19 && z <= 24) {
        const rMaxX = Math.max(11, Math.min(26, maxX + 3));
        const halfY = Math.max(1, 5 - (z - 19));
        for (let x = 5; x <= rMaxX; x++) {
          for (let y = 22 - halfY; y <= 22 + halfY; y++) {
            const moss = z >= 21 && x > rMaxX - 6 && h3(x, y, z) < 0.52;
            g.fillStyle = moss ? '#6c8c37' : (z >= 23 ? '#8692a6' : (z >= 21 ? '#505c71' : '#333c4c'));
            g.fillRect(ox + x, y, 1, 1);
          }
        }
      }
    }
    return c;
  }

  // 4) BROKEN WEATHERED TORII GATE: Faded vermilion, snapped right Kasagi beam, moss clumps (52x52x44)
  function makeBrokenToriiStrip() {
    const sw = 52, nS = 44;
    const c = document.createElement('canvas'); c.width = sw * nS; c.height = sw;
    const g = c.getContext('2d');
    for (let z = 0; z < nS; z++) {
      const ox = z * sw;
      const rLean = z > 14 ? Math.round((z - 14) * 0.08) : 0;
      if (z <= 6) {
        for (const px of [13, 38]) {
          for (let y = 22; y <= 30; y++) for (let x = px - 4; x <= px + 4; x++) {
            if (Math.hypot(x - px, y - 26) <= (z <= 2 ? 4.2 : 3.5)) {
              const moss = z >= 4 || h3(x, y, z) < 0.32;
              g.fillStyle = moss ? '#547329' : (z >= 5 ? '#727b89' : '#414855');
              g.fillRect(ox + x, y, 1, 1);
            }
          }
        }
      } else if (z <= 35) {
        for (const [px, lean] of [[13, 0], [38, rLean]]) {
          for (let y = 24; y <= 28; y++) for (let x = px - 2 + lean; x <= px + 2 + lean; x++) {
            if (Math.hypot(x - (px + lean), y - 26) <= 2.5) {
              const nv = h3(x, y, z);
              const moss = z <= 14 && nv < 0.30;
              g.fillStyle = moss ? '#5c7b2d' : (nv > 0.80 ? '#694b35' : (x < px + lean ? '#ae392c' : '#80261e'));
              g.fillRect(ox + x, y, 1, 1);
            }
          }
        }
      }
      if (z >= 27 && z <= 30) {
        g.fillStyle = z === 30 ? '#ab3a2e' : '#7d261e';
        g.fillRect(ox + 7, 25, 34, 3);
        g.fillStyle = '#664933'; g.fillRect(ox + 39, 25, 3, 3);
      }
      if (z >= 30 && z <= 35) {
        g.fillStyle = '#313643'; g.fillRect(ox + 24, 24, 4, 4);
        if (z >= 32 && z <= 34) { g.fillStyle = '#ba9c4f'; g.fillRect(ox + 25, 25, 2, 2); }
      }
      if (z >= 36 && z <= 43) {
        const rz = z - 36;
        const leftX = Math.max(3, 6 - Math.floor(rz * 0.45));
        const rightX = 41 - Math.floor(rz * 0.35);
        const halfY = z >= 40 ? 3 : 2;
        for (let x = leftX; x <= rightX; x++) {
          const isBreak = x >= rightX - 2;
          for (let y = 26 - halfY; y <= 26 + halfY; y++) {
            const moss = z >= 41 && h3(x, y, z) < 0.42;
            if (isBreak) g.fillStyle = '#644832';
            else if (moss) g.fillStyle = z === 43 ? '#7ea03e' : '#56762a';
            else if (z >= 40) g.fillStyle = z === 43 ? '#495264' : '#252b37';
            else g.fillStyle = '#943026';
            g.fillRect(ox + x, y, 1, 1);
          }
        }
      }
    }
    return c;
  }

  // 5) RUIN FOUNDATION (NEW! Разрушенный фундамент павильона без крыши: каменный цоколь, 2 обломанные колонны, упавшие балки и битая черепица, 56x56x28)
  function makeRuinFoundationStrip() {
    const sw = 56, nS = 28;
    const c = document.createElement('canvas'); c.width = sw * nS; c.height = sw;
    const g = c.getContext('2d');
    for (let z = 0; z < nS; z++) {
      const ox = z * sw;
      if (z <= 5) {
        // Cracked cut-stone temple plinth with collapsed SE corner & mossy cracks
        for (let y = 12; y <= 44; y++) {
          for (let x = 10; x <= 46; x++) {
            // Cut away collapsed SE corner organically
            if (x > 34 && y > 32 && (x - 34) + (y - 32) > 10) continue;
            const onEdge = x <= 12 || x >= 44 || y <= 14 || y >= 42;
            const nv = h3(x, y, z);
            let col;
            if (z === 5 && !onEdge) {
              // Dark weathered interior earth/ashes & mossy cracks on top of ruined plinth
              col = nv < 0.28 ? '#56732a' : (nv < 0.48 ? '#5c4b33' : (nv < 0.78 ? '#7b828e' : '#969da8'));
            } else {
              col = (onEdge && nv < 0.30) ? '#506d27' : (z >= 4 ? '#97a0ad' : (x < 28 ? '#7d8694' : '#5d6573'));
            }
            g.fillStyle = col; g.fillRect(ox + x, y, 1, 1);
          }
        }
        // Fallen broken dark slate roof tiles & snapped beam lying across the ruined foundation floor
        if (z >= 4 && z <= 6) {
          g.fillStyle = '#333b4a'; g.fillRect(ox + 26, 22, 11, 7); g.fillRect(ox + 16, 33, 9, 5);
          g.fillStyle = '#56647d'; g.fillRect(ox + 27, 23, 5, 2); g.fillRect(ox + 17, 34, 4, 2);
        }
      }
      // Fallen diagonal charred/aged cedar crossbeam resting across the plinth (z=5..10)
      if (z >= 5 && z <= 9) {
        for (let t = 0; t < 24; t++) {
          const bx = Math.round(16 + t * 0.95);
          const by = Math.round(36 - t * 0.65);
          if (z <= 8 - Math.floor(t / 12)) {
            g.fillStyle = (z >= 7) ? '#6e5036' : '#4a3422';
            g.fillRect(ox + bx, by, 3, 2);
          }
        }
      }
      // 4 Foundation corner pillars at DIFFERENT broken heights (NW intact tall, NE snapped mid, SW snapped low, SE collapsed!)
      const cols = [
        { x: 13, y: 15, h: 27, verm: true },  // NW pillar + broken eaves stub
        { x: 42, y: 15, h: 19, verm: true },  // NE pillar snapped mid-shaft
        { x: 13, y: 40, h: 13, verm: false }, // SW snapped low stub
      ];
      for (const p of cols) {
        if (z >= 5 && z < p.h) {
          const jagged = z >= p.h - 3;
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            if (Math.abs(dx) + Math.abs(dy) > 3) continue;
            if (jagged && dx > 0 && z >= p.h - 1) continue;
            const nv = h3(p.x + dx, p.y + dy, z);
            const moss = z <= 9 && nv < 0.35;
            g.fillStyle = moss ? '#5a782c' : (jagged ? '#6b4e35' : (p.verm ? (dx < 0 ? '#9e3529' : '#74241c') : '#59402c'));
            g.fillRect(ox + p.x + dx, p.y + dy, 1, 1);
          }
        }
      }
      // Surviving broken corner plaster wall & tile cap clinging to the NW corner (x=13..28, y=14..18, z=6..23)
      if (z >= 6 && z <= 22) {
        const wallEnd = Math.round(31 - (z - 6) * 0.95);
        if (wallEnd > 14) {
          for (let x = 14; x <= wallEnd; x++) {
            for (let y = 14; y <= 17; y++) {
              const nearBreak = x >= wallEnd - 2;
              const nv = h3(x, y, z);
              g.fillStyle = nearBreak ? ((z % 3 === 0) ? '#4a3321' : '#857f74') : (z >= 19 ? '#465164' : (nv < 0.22 ? '#618031' : '#dcd9ce'));
              g.fillRect(ox + x, y, 1, 1);
            }
          }
        }
      }
    }
    return c;
  }

  // 6) BROKEN PILLAR & DRUMS (NEW! Сломленный каменный столб с поваленным обломком и мхом, 28x28x24)
  function makeBrokenPillarStrip() {
    const sw = 28, nS = 24;
    const c = document.createElement('canvas'); c.width = sw * nS; c.height = sw;
    const g = c.getContext('2d');
    for (let z = 0; z < nS; z++) {
      const ox = z * sw;
      // Upright snapped mossy granite pillar on left (cx=10, cy=13, h=22 with slanted jagged break!)
      if (z <= 22) {
        const rad = z <= 3 ? 5.2 : 3.6;
        for (let y = 7; y <= 19; y++) for (let x = 4; x <= 16; x++) {
          if (Math.hypot(x - 10, y - 13) <= rad) {
            if (z > 16 && (x - 10) * 0.9 + (z - 16) > 4.2) continue; // diagonal snapped fracture plane!
            const nv = h3(x, y, z);
            const moss = (z <= 3 && nv < 0.35) || (z > 15 && nv < 0.42);
            g.fillStyle = moss ? '#648332' : (x < 10 ? '#a2abb8' : '#717a88');
            g.fillRect(ox + x, y, 1, 1);
          }
        }
      }
      // Fallen broken stone pillar drum lying on the right (x=15..24, y=15..20, z=0..6)
      if (z <= 6) {
        const halfY = (z === 0 || z === 6) ? 1.5 : 2.8;
        for (let x = 15; x <= 23; x++) for (let y = Math.round(17 - halfY); y <= Math.round(17 + halfY); y++) {
          const nv = h3(x, y, z);
          g.fillStyle = (z >= 5 && nv < 0.5) ? '#739339' : (z >= 4 ? '#9ea7b4' : '#6a7381');
          g.fillRect(ox + x, y, 1, 1);
        }
      }
    }
    return c;
  }

  window.SakuraRuinSprites = {
    buildAll(IMGS) {
      IMGS.ruin_rubble     = makeRuinRubbleStrip();
      IMGS.fallen_lantern  = makeFallenLanternStrip();
      IMGS.ruin_wall_stub  = makeRuinWallStubStrip();
      IMGS.broken_torii    = makeBrokenToriiStrip();
      IMGS.ruin_foundation = makeRuinFoundationStrip();
      IMGS.broken_pillar   = makeBrokenPillarStrip();
    },
  };
})();
