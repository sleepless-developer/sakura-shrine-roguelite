// ============================================================================
// Biome Flora & Natural Rock Varieties — Procedural 3D Voxel Sprite-Stacks
// Loaded by playground/index.html as window.SakuraBiomeNature
//
// Adds 6 new 3D voxel tree species (3 distinct varieties per biome = 9 total):
//   - Biome 0 (Sakura Grove): sakura (base) + sakura_weeping + bamboo_clump
//   - Biome 1 (Autumn Maple): autumn (base) + ginkgo + maple_burnt
//   - Biome 2 (Pine Highlands): pine (base) + cedar + pine_gnarled
//
// Adds 4 new natural 3D voxel rock/boulder formations (ZERO toy-soldier base discs!):
//   - rock_flat    : broad stepped mossy river/garden slate slab
//   - rock_crag    : tall split basalt/granite crag with warm highland lichen
//   - rock_mossy   : rounded forest granite boulder draped in plush 3-tone moss
//   - rock_pebbles : low natural cobble cluster with quartz highlights & spring moss
// ============================================================================
(function () {
  function makeCanvas(sw, nS) {
    const c = document.createElement('canvas');
    c.width = sw * nS;
    c.height = sw;
    return [c, c.getContext('2d')];
  }

  function hash3(x, y, z) {
    let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1442695041)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  // Shared organic boulder voxel-strip builder (zero flat disc base — anchored directly into earth/grass/sand!)
  function buildRockStrip(sw, nS, rocks, pal) {
    const [c, g] = makeCanvas(sw, nS);
    const mid = sw * 0.5;
    for (let z = 0; z < nS; z++) {
      const ox = z * sw;
      for (let y = 0; y < sw; y++) {
        for (let x = 0; x < sw; x++) {
          const wx = x + 0.5 - mid, wy = y + 0.5 - mid;
          let hit = null, bestDepth = -99, bestT = 0, bestLx = 0, bestLy = 0;
          for (let ri = 0; ri < rocks.length; ri++) {
            const rk = rocks[ri];
            if (z >= rk.h) continue;
            const t = z / rk.h;
            let taper;
            if (rk.flatTop) {
              taper = z === 0 ? 0.96 : (t < 0.72 ? (1.0 - t * 0.22) : (0.84 - (t - 0.72) * 0.95));
            } else if (rk.round) {
              const s = Math.min(1, t * 1.02);
              taper = z === 0 ? 0.88 : Math.sqrt(Math.max(0.04, 1.0 - s * s * 0.86));
            } else {
              taper = z === 0 ? 0.95 : (1.0 - Math.pow(t, rk.pow || 1.32) * (rk.shrink || 0.82));
            }
            const rcx = rk.cx + z * (rk.leanX || 0);
            const rcy = rk.cy + z * (rk.leanY || 0);
            const dx = wx - rcx, dy = wy - rcy;
            const ca = Math.cos(rk.ang || 0), sa = Math.sin(rk.ang || 0);
            const lx = dx * ca - dy * sa, ly = dx * sa + dy * ca;
            const th = Math.atan2(ly, lx);
            const facet = 1.0
              + Math.sin(th * (rk.lobes || 5) + (rk.ph || 0) + z * 0.13) * (rk.facetAmp || 0.13)
              + Math.cos(th * 3 - (rk.ph || 0)) * 0.07;
            const rx = Math.max(0.9, rk.rx * taper * facet);
            const ry = Math.max(0.9, rk.ry * taper * facet);
            const norm = Math.hypot(lx / rx, ly / ry);
            if (norm <= 1.0) {
              const depth = 1.0 - norm;
              if (depth > bestDepth) {
                bestDepth = depth; hit = rk; bestT = t; bestLx = lx; bestLy = ly;
              }
            }
          }
          if (!hit) continue;
          const strata = Math.sin(wx * 0.42 + wy * 0.34 + z * (pal.strataZ || 0.62));
          const grain = (x * 19 + y * 37 + z * 13) & 15;
          const sunBias = (-bestLx * 0.13 - bestLy * 0.11 + bestT * 0.44);
          let col;
          const mossThresh = pal.mossTop !== undefined ? pal.mossTop : 0.72;
          const isMoss = pal.moss && (
            (bestT > mossThresh && (bestLx < 3.5 || bestT > 0.84) && (strata > (pal.mossStrata || -0.15) || bestT > 0.88))
            || (pal.mossHeavy && bestT > 0.44 && bestLx < 2.2 && bestLy < 2.5 && strata > -0.05)
            || (z >= 3 && z <= 8 && bestDepth < 0.25 && wx < 2 && wy < 2 && strata > 0.48)
          );
          if (isMoss) {
            col = bestT > 0.82 ? pal.moss[2] : (sunBias > 0.14 ? pal.moss[1] : pal.moss[0]);
          } else if (z <= 1) {
            col = grain < 5 ? pal.foot[0] : pal.foot[1];
          } else if (strata < -0.78 && grain < 10) {
            col = pal.crack;
          } else if (sunBias > 0.40 && bestDepth < 0.55) {
            col = pal.hi;
          } else if (sunBias > 0.14) {
            col = grain < 3 ? pal.hi : pal.light;
          } else if (sunBias > -0.18) {
            col = grain < 4 ? pal.shadow : pal.mid;
          } else {
            col = grain < 4 ? pal.deep : pal.shadow;
          }
          g.fillStyle = col;
          g.fillRect(ox + x, y, 1, 1);
        }
      }
    }
    return c;
  }

  // ---- 4 NEW NATURAL ROCK FORMATIONS ----
  function makeRockFlat() {
    return buildRockStrip(32, 15, [
      { cx: -1.5, cy: 0.5, rx: 11.4, ry: 8.2, h: 11, flatTop: true, ang: 0.28, lobes: 5, ph: 0.8, facetAmp: 0.11 },
      { cx:  4.2, cy: -2.4, rx: 7.4, ry: 5.8, h: 14, flatTop: true, ang: -0.45, lobes: 4, ph: 2.1, facetAmp: 0.12 },
      { cx: -7.5, cy: 4.2, rx: 4.4, ry: 3.6, h: 6, round: true, ang: 0.9, lobes: 4, ph: 1.3 },
    ], {
      foot: ['#363e45', '#4c5660'],
      crack: '#3b444e',
      deep: '#4a535e',
      shadow: '#616c78',
      mid: '#7b8794',
      light: '#99a5b2',
      hi: '#bcc6d1',
      moss: ['#4a7026', '#6c9c3a', '#92c450'],
      mossTop: 0.78,
      mossStrata: 0.18,
      strataZ: 0.88,
    });
  }

  function makeRockCrag() {
    return buildRockStrip(30, 28, [
      { cx: -2.2, cy: -0.8, rx: 7.4, ry: 6.0, h: 27, leanX: -0.10, leanY: -0.04, ang: 0.42, lobes: 5, ph: 0.6, pow: 1.25, shrink: 0.86, facetAmp: 0.16 },
      { cx:  4.8, cy:  1.8, rx: 5.8, ry: 5.0, h: 19, leanX:  0.11, leanY:  0.04, ang: -0.62, lobes: 4, ph: 2.4, pow: 1.30, shrink: 0.84, facetAmp: 0.15 },
      { cx:  0.8, cy:  5.4, rx: 4.8, ry: 3.8, h: 10, leanX:  0.04, leanY:  0.09, ang: 1.1, lobes: 4, ph: 1.5 },
    ], {
      foot: ['#2b2e38', '#3c404c'],
      crack: '#262933',
      deep: '#393e4a',
      shadow: '#4e5462',
      mid: '#676d7c',
      light: '#848b99',
      hi: '#a7aebc',
      // Warm autumn/highland olive-amber lichen patches on dark basalt crags
      moss: ['#6b6e2f', '#928e3c', '#b7aa4e'],
      mossTop: 0.72,
      mossStrata: 0.15,
      strataZ: 0.55,
    });
  }

  function makeRockMossy() {
    return buildRockStrip(28, 18, [
      { cx: -0.8, cy: -0.5, rx: 8.8, ry: 7.4, h: 17, round: true, ang: 0.22, lobes: 5, ph: 1.2, facetAmp: 0.10 },
      { cx:  6.0, cy:  3.6, rx: 5.0, ry: 4.4, h: 10, round: true, ang: -0.6, lobes: 4, ph: 2.8, facetAmp: 0.10 },
      { cx: -6.2, cy:  4.2, rx: 3.8, ry: 3.4, h: 7, round: true, ang: 0.7, lobes: 3, ph: 0.5 },
    ], {
      foot: ['#2e3a32', '#425148'],
      crack: '#35403b',
      deep: '#475452',
      shadow: '#5e6d6c',
      mid: '#788886',
      light: '#93a3a1',
      hi: '#b3c1be',
      moss: ['#386426', '#568c34', '#82ba48'],
      mossTop: 0.56,
      mossHeavy: true,
      mossStrata: -0.25,
    });
  }

  function makeRockPebbles() {
    return buildRockStrip(26, 10, [
      { cx: -4.2, cy: -1.8, rx: 4.8, ry: 3.8, h: 9, round: true, ang: 0.4, lobes: 4, ph: 0.3, facetAmp: 0.09 },
      { cx:  4.4, cy: -0.8, rx: 4.2, ry: 3.4, h: 7, round: true, ang: -0.5, lobes: 4, ph: 1.9, facetAmp: 0.09 },
      { cx:  0.4, cy:  4.6, rx: 3.8, ry: 3.0, h: 6, round: true, ang: 0.8, lobes: 3, ph: 2.7, facetAmp: 0.08 },
      { cx: -5.4, cy:  4.2, rx: 2.8, ry: 2.4, h: 5, round: true, ang: -0.2, lobes: 3, ph: 1.1 },
    ], {
      foot: ['#3e4248', '#545a62'],
      crack: '#424852',
      deep: '#565d68',
      shadow: '#707884',
      mid: '#8c94a0',
      light: '#aab2bd',
      hi: '#ccd2da',
      moss: ['#4c7a2c', '#6ea43e', '#96ca56'],
      mossTop: 0.76,
      mossStrata: 0.25,
    });
  }

  // ---- 6 NEW 3D VOXEL TREE VARIETIES ----

  // Helper to paint an organic voxel foliage puff cloud on slice z
  function drawPuffSlice(g, ox, sw, cx, cy, rx, ry, z, zMin, zMax, pal, salt) {
    if (z < zMin || z > zMax) return;
    const t = (z - zMin) / Math.max(1, zMax - zMin);
    const dome = Math.sin(t * Math.PI);
    const rrX = rx * (0.36 + 0.64 * Math.pow(dome, 0.58));
    const rrY = ry * (0.36 + 0.64 * Math.pow(dome, 0.58));
    const x0 = Math.max(1, Math.floor(cx - rrX - 2));
    const x1 = Math.min(sw - 2, Math.ceil(cx + rrX + 2));
    const y0 = Math.max(1, Math.floor(cy - rrY - 2));
    const y1 = Math.min(sw - 2, Math.ceil(cy + rrY + 2));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx, dy = y - cy;
        const th = Math.atan2(dy, dx);
        const wob = 1.0 + Math.sin(th * 5 + salt + z * 0.22) * 0.12 + Math.cos(th * 3 - salt) * 0.08;
        const d = Math.hypot(dx / Math.max(1, rrX * wob), dy / Math.max(1, rrY * wob));
        if (d > 1.0) continue;
        const n = hash3(x, y, z + salt * 7);
        if (d > 0.84 && n < 0.28) continue; // airy pixel leaf edge
        const sun = (-dx / Math.max(1, rrX)) * 0.35 + (-dy / Math.max(1, rrY)) * 0.28 + t * 0.72 + (n - 0.5) * 0.22;
        let col;
        if (sun > 0.92) col = pal[4];
        else if (sun > 0.62) col = pal[3];
        else if (sun > 0.32) col = pal[2];
        else if (sun > 0.06) col = pal[1];
        else col = pal[0];
        g.fillStyle = col;
        g.fillRect(ox + x, y, 1, 1);
      }
    }
  }

  // 1) BIOME 0 — WEEPING SAKURA (Сидарэ-дзакура): gnarled trunk + cascading pale blush-pink blossom curtains!
  function makeSakuraWeeping() {
    const sw = 56, nS = 48, mid = 28;
    const [c, g] = makeCanvas(sw, nS);
    const barkPal = ['#2e1d24', '#462c36', '#5e3c48', '#754e5a'];
    const leafPal = ['#9b4464', '#c9688a', '#ee97b6', '#fbc7da', '#fff0f6'];
    const drapes = [
      { ang: 0.0, r: 16.5, len: 24 }, { ang: 0.75, r: 17.5, len: 22 },
      { ang: 1.5, r: 15.8, len: 25 }, { ang: 2.3, r: 17.2, len: 21 },
      { ang: 3.1, r: 16.4, len: 24 }, { ang: 3.9, r: 17.0, len: 23 },
      { ang: 4.7, r: 15.5, len: 22 }, { ang: 5.5, r: 17.4, len: 25 },
      { ang: 0.38, r: 12.2, len: 18 }, { ang: 1.95, r: 11.8, len: 19 },
      { ang: 3.55, r: 12.5, len: 18 }, { ang: 5.10, r: 12.0, len: 19 },
    ];
    const puffs = [
      { cx: mid,      cy: mid,      rx: 15, ry: 14, z0: 27, z1: 47, s: 1 },
      { cx: mid - 10, cy: mid - 6,  rx: 12, ry: 11, z0: 24, z1: 42, s: 2 },
      { cx: mid + 11, cy: mid - 5,  rx: 12, ry: 11, z0: 24, z1: 41, s: 3 },
      { cx: mid - 8,  cy: mid + 9,  rx: 12, ry: 11, z0: 23, z1: 40, s: 4 },
      { cx: mid + 9,  cy: mid + 8,  rx: 12, ry: 11, z0: 23, z1: 40, s: 5 },
    ];
    for (let z = 0; z < nS; z++) {
      const ox = z * sw;
      // Flared roots + gracefully curved gnarled trunk (z = 0..29)
      if (z <= 29) {
        const leanX = Math.sin(z * 0.11) * 2.4;
        const leanY = Math.cos(z * 0.09) * 1.4 - 0.8;
        const rad = z < 5 ? (5.8 - z * 0.45) : (3.6 - (z / 29) * 1.1);
        for (let y = mid - 9; y <= mid + 9; y++) {
          for (let x = mid - 9; x <= mid + 9; x++) {
            const dx = x - (mid + leanX), dy = y - (mid + leanY);
            const rootLobe = z < 5 ? (1.0 + Math.cos(Math.atan2(dy, dx) * 4 + 0.5) * 0.30 * (1 - z / 5)) : 1.0;
            if (Math.hypot(dx, dy) <= rad * rootLobe) {
              const bShade = dx < 0 ? (dy < 0 ? 3 : 2) : (dy > 1 ? 0 : 1);
              g.fillStyle = barkPal[bShade];
              g.fillRect(ox + x, y, 1, 1);
            }
          }
        }
        // Arching boughs splitting outward at z = 22..29
        if (z >= 22) {
          const bt = (z - 22) / 7;
          for (let bi = 0; bi < 4; bi++) {
            const ba = bi * 1.57 + 0.4;
            const bx = Math.round(mid + leanX + Math.cos(ba) * (4 + bt * 9));
            const by = Math.round(mid + leanY + Math.sin(ba) * (4 + bt * 9));
            g.fillStyle = barkPal[1];
            g.fillRect(ox + bx - 1, by - 1, 3, 3);
          }
        }
      }
      // Hanging willow-like cascading blossom tendrils (z = 11..35)
      if (z >= 11 && z <= 35) {
        for (let di = 0; di < drapes.length; di++) {
          const dr = drapes[di];
          const zStart = 35 - dr.len;
          if (z < zStart) continue;
          const dt = (z - zStart) / dr.len; // 0 at hanging tip -> 1 at crown
          const sway = Math.sin(z * 0.28 + di * 1.3) * 0.8;
          const rad = dr.r * (0.94 + 0.08 * Math.sin(dt * Math.PI));
          const cx = Math.round(mid + Math.cos(dr.ang) * rad + sway);
          const cy = Math.round(mid + Math.sin(dr.ang) * rad);
          const sz = dt < 0.20 ? 2 : (dt < 0.55 ? 3 : 4);
          for (let yy = -2; yy <= 2; yy++) {
            for (let xx = -2; xx <= 2; xx++) {
              if (Math.hypot(xx, yy) > sz * 0.52) continue;
              const px = cx + xx, py = cy + yy;
              if (px < 1 || px >= sw - 1 || py < 1 || py >= sw - 1) continue;
              const n = hash3(px, py, z + di * 11);
              if (n < 0.14) continue;
              const ci = dt > 0.72 ? (n > 0.55 ? 4 : 3) : (dt > 0.35 ? (n > 0.5 ? 3 : 2) : (n > 0.45 ? 2 : 1));
              g.fillStyle = leafPal[ci];
              g.fillRect(ox + px, py, 1, 1);
            }
          }
        }
      }
      // Crown blossom umbrella
      for (let pi = 0; pi < puffs.length; pi++) {
        const pf = puffs[pi];
        drawPuffSlice(g, ox, sw, pf.cx, pf.cy, pf.rx, pf.ry, z, pf.z0, pf.z1, leafPal, pf.s * 3);
      }
    }
    return c;
  }

  // 2) BIOME 0 — BAMBOO GROVE CLUMP (Такэбаяси): 5 segmented emerald-jade stalks + feathery sunlit leaf plumes!
  function makeBambooClump() {
    const sw = 42, nS = 54, mid = 21;
    const [c, g] = makeCanvas(sw, nS);
    const stalks = [
      { x0: -4.2, y0: -2.5, leanX: -0.05, leanY: -0.03, r: 2.1, h: 52, nodeOff: 0 },
      { x0:  3.8, y0: -1.8, leanX:  0.07, leanY: -0.02, r: 2.0, h: 49, nodeOff: 2 },
      { x0: -1.0, y0:  3.5, leanX: -0.02, leanY:  0.06, r: 2.2, h: 53, nodeOff: 4 },
      { x0:  5.5, y0:  3.2, leanX:  0.08, leanY:  0.05, r: 1.7, h: 43, nodeOff: 1 },
      { x0: -6.0, y0:  2.4, leanX: -0.08, leanY:  0.04, r: 1.7, h: 45, nodeOff: 3 },
    ];
    const leafPal = ['#234f2c', '#35743c', '#519a4c', '#7ac25c', '#aee074'];
    const puffs = [
      { cx: mid - 6, cy: mid - 4, rx: 10, ry: 8, z0: 32, z1: 52, s: 1 },
      { cx: mid + 7, cy: mid - 3, rx: 10, ry: 8, z0: 30, z1: 50, s: 2 },
      { cx: mid - 1, cy: mid + 6, rx: 11, ry: 9, z0: 34, z1: 53, s: 3 },
      { cx: mid + 5, cy: mid + 5, rx: 9,  ry: 8, z0: 25, z1: 42, s: 4 },
      { cx: mid - 7, cy: mid + 4, rx: 9,  ry: 7, z0: 27, z1: 44, s: 5 },
    ];
    for (let z = 0; z < nS; z++) {
      const ox = z * sw;
      for (let si = 0; si < stalks.length; si++) {
        const st = stalks[si];
        if (z >= st.h) continue;
        const sx = mid + st.x0 + z * st.leanX;
        const sy = mid + st.y0 + z * st.leanY;
        const isNode = ((z + st.nodeOff) % 6) === 0 && z > 2;
        const rad = st.r * (1.0 - (z / st.h) * 0.25) + (isNode ? 0.35 : 0);
        for (let y = Math.floor(sy - rad - 1); y <= Math.ceil(sy + rad + 1); y++) {
          for (let x = Math.floor(sx - rad - 1); x <= Math.ceil(sx + rad + 1); x++) {
            if (x < 1 || x >= sw - 1 || y < 1 || y >= sw - 1) continue;
            const dx = x - sx, dy = y - sy;
            if (Math.hypot(dx, dy) > rad) continue;
            if (isNode) {
              g.fillStyle = dx < 0 ? '#c8e08e' : '#739948';
            } else if (z <= 1) {
              g.fillStyle = '#2c4a26';
            } else {
              g.fillStyle = dx < -0.5 ? '#88c45e' : (dx < 0.7 ? '#5a9942' : '#386e2e');
            }
            g.fillRect(ox + x, y, 1, 1);
          }
        }
      }
      // Airy feathery bamboo leaf plumes in upper canopy (z >= 25)
      if (z >= 25) {
        for (let pi = 0; pi < puffs.length; pi++) {
          const pf = puffs[pi];
          drawPuffSlice(g, ox, sw, pf.cx, pf.cy, pf.rx, pf.ry, z, pf.z0, pf.z1, leafPal, pf.s * 5);
        }
      }
    }
    return c;
  }

  // 3) BIOME 1 — GOLDEN GINKGO (Золотой Гинкго / Итё): tall pale trunk + luminous golden-amber layered canopy!
  function makeGinkgo() {
    const sw = 52, nS = 48, mid = 26;
    const [c, g] = makeCanvas(sw, nS);
    const barkPal = ['#423832', '#5c4e46', '#78685c', '#948274'];
    const leafPal = ['#9c5a18', '#cc8422', '#eba82e', '#fbd04c', '#fff08c'];
    const puffs = [
      { cx: mid,      cy: mid,      rx: 13, ry: 12, z0: 30, z1: 47, s: 1 },
      { cx: mid - 9,  cy: mid - 5,  rx: 11, ry: 10, z0: 21, z1: 38, s: 2 },
      { cx: mid + 10, cy: mid - 4,  rx: 11, ry: 10, z0: 22, z1: 39, s: 3 },
      { cx: mid - 6,  cy: mid + 9,  rx: 11, ry: 10, z0: 20, z1: 37, s: 4 },
      { cx: mid + 8,  cy: mid + 8,  rx: 11, ry: 10, z0: 20, z1: 36, s: 5 },
      { cx: mid,      cy: mid - 10, rx: 10, ry: 9,  z0: 25, z1: 42, s: 6 },
    ];
    for (let z = 0; z < nS; z++) {
      const ox = z * sw;
      if (z <= 28) {
        const rad = z < 5 ? (5.2 - z * 0.42) : (3.3 - (z / 28) * 1.1);
        for (let y = mid - 8; y <= mid + 8; y++) {
          for (let x = mid - 8; x <= mid + 8; x++) {
            const dx = x - mid, dy = y - mid;
            const rootLobe = z < 5 ? (1.0 + Math.cos(Math.atan2(dy, dx) * 5) * 0.25 * (1 - z / 5)) : 1.0;
            if (Math.hypot(dx, dy) <= rad * rootLobe) {
              const bi = dx < -0.5 ? 3 : (dx < 0.8 ? 2 : (dy > 1 ? 0 : 1));
              g.fillStyle = barkPal[bi];
              g.fillRect(ox + x, y, 1, 1);
            }
          }
        }
      }
      for (let pi = 0; pi < puffs.length; pi++) {
        const pf = puffs[pi];
        drawPuffSlice(g, ox, sw, pf.cx, pf.cy, pf.rx, pf.ry, z, pf.z0, pf.z1, leafPal, pf.s * 4);
      }
    }
    return c;
  }

  // 4) BIOME 1 — BURNT MOUNTAIN MAPLE (Багряный клён Яма-момидзи): sculptural forked dark trunk + scarlet-vermilion cloud pads!
  function makeMapleBurnt() {
    const sw = 52, nS = 42, mid = 26;
    const [c, g] = makeCanvas(sw, nS);
    const barkPal = ['#26181c', '#3c252b', '#52343a', '#68444b'];
    const leafPal = ['#5c1722', '#8f242c', '#c73e2c', '#ea6a32', '#ff9d47'];
    const puffs = [
      { cx: mid - 11, cy: mid - 6,  rx: 12, ry: 10, z0: 21, z1: 35, s: 1 },
      { cx: mid + 11, cy: mid + 5,  rx: 12, ry: 10, z0: 18, z1: 32, s: 2 },
      { cx: mid + 6,  cy: mid - 9,  rx: 11, ry: 9,  z0: 24, z1: 39, s: 3 },
      { cx: mid - 7,  cy: mid + 9,  rx: 11, ry: 9,  z0: 17, z1: 30, s: 4 },
      { cx: mid,      cy: mid - 1,  rx: 12, ry: 11, z0: 27, z1: 41, s: 5 },
    ];
    for (let z = 0; z < nS; z++) {
      const ox = z * sw;
      if (z <= 25) {
        // Forking twin trunks from z = 11 upward for distinct wide sculptural silhouette
        const trunks = z < 11
          ? [{ x: mid, y: mid, r: z < 4 ? (5.4 - z * 0.45) : 3.4 }]
          : [
              { x: mid - (z - 10) * 0.55, y: mid - (z - 10) * 0.30, r: Math.max(1.5, 2.8 - (z - 10) * 0.08) },
              { x: mid + (z - 10) * 0.52, y: mid + (z - 10) * 0.25, r: Math.max(1.4, 2.5 - (z - 10) * 0.08) },
            ];
        for (const tr of trunks) {
          for (let y = Math.floor(tr.y - tr.r - 2); y <= Math.ceil(tr.y + tr.r + 2); y++) {
            for (let x = Math.floor(tr.x - tr.r - 2); x <= Math.ceil(tr.x + tr.r + 2); x++) {
              if (x < 1 || x >= sw - 1 || y < 1 || y >= sw - 1) continue;
              const dx = x - tr.x, dy = y - tr.y;
              if (Math.hypot(dx, dy) <= tr.r) {
                g.fillStyle = barkPal[dx < 0 ? 3 : (dy > 0 ? 0 : 1)];
                g.fillRect(ox + x, y, 1, 1);
              }
            }
          }
        }
      }
      for (let pi = 0; pi < puffs.length; pi++) {
        const pf = puffs[pi];
        drawPuffSlice(g, ox, sw, pf.cx, pf.cy, pf.rx, pf.ry, z, pf.z0, pf.z1, leafPal, pf.s * 6);
      }
    }
    return c;
  }

  // 5) BIOME 2 — JAPANESE CEDAR SUGI (Японский кедр Суги): tall slender spire + dense blue-spruce tiered boughs!
  function makeCedar() {
    const sw = 44, nS = 58, mid = 22;
    const [c, g] = makeCanvas(sw, nS);
    const barkPal = ['#381f1a', '#522e24', '#6c3e30', '#84503e'];
    const leafPal = ['#132d2d', '#1c4440', '#275e52', '#3a7d64', '#589e78'];
    for (let z = 0; z < nS; z++) {
      const ox = z * sw;
      // Straight stately reddish-cedar trunk (z = 0..48)
      if (z <= 48) {
        const rad = z < 6 ? (4.6 - z * 0.30) : Math.max(1.2, 3.0 - (z / 48) * 1.8);
        for (let y = mid - 6; y <= mid + 6; y++) {
          for (let x = mid - 6; x <= mid + 6; x++) {
            const dx = x - mid, dy = y - mid;
            if (Math.hypot(dx, dy) <= rad) {
              g.fillStyle = barkPal[dx < -0.5 ? 3 : (dx < 0.8 ? 2 : 1)];
              g.fillRect(ox + x, y, 1, 1);
            }
          }
        }
      }
      // Tiered feathery cedar whorls (z = 14..57)
      if (z >= 14) {
        const hNorm = (z - 14) / 43; // 0..1
        // 6 stacked conical tiers with crisp overhanging skirt waves
        const tierPhase = ((z - 14) % 7) / 7;
        const tierFlare = 1.0 - tierPhase * 0.42;
        const envR = (15.5 * Math.pow(1.0 - hNorm * 0.88, 0.82)) * tierFlare + 1.2;
        const nBoughs = 6;
        const rotTier = Math.floor((z - 14) / 7) * 0.55;
        const rMax = Math.ceil(envR) + 2;
        for (let y = Math.max(1, mid - rMax); y <= Math.min(sw - 2, mid + rMax); y++) {
          for (let x = Math.max(1, mid - rMax); x <= Math.min(sw - 2, mid + rMax); x++) {
            const dx = x - mid, dy = y - mid;
            const d = Math.hypot(dx, dy);
            const th = Math.atan2(dy, dx);
            const bough = 0.78 + 0.28 * Math.pow(Math.abs(Math.cos((th + rotTier) * nBoughs * 0.5)), 0.7);
            const limit = envR * bough;
            if (d > limit) continue;
            const n = hash3(x, y, z * 3);
            if (d > limit - 1.3 && n < 0.24) continue;
            const sun = (-dx / Math.max(1, envR)) * 0.35 + (-dy / Math.max(1, envR)) * 0.25 + hNorm * 0.45 + (1 - tierPhase) * 0.30 + (n - 0.5) * 0.2;
            let ci = sun > 0.82 ? 4 : (sun > 0.54 ? 3 : (sun > 0.26 ? 2 : (sun > 0.02 ? 1 : 0)));
            g.fillStyle = leafPal[ci];
            g.fillRect(ox + x, y, 1, 1);
          }
        }
      }
    }
    return c;
  }

  // 6) BIOME 2 — GNARLED WINDSWEPT BLACK PINE (Старая сосна Мацу): twisted trunk + horizontal niwaki cloud pads!
  function makePineGnarled() {
    const sw = 50, nS = 44, mid = 25;
    const [c, g] = makeCanvas(sw, nS);
    const barkPal = ['#2a272b', '#413c40', '#5a5356', '#726a6c'];
    const leafPal = ['#162c22', '#204532', '#2e6344', '#448256', '#66a46e'];
    const pads = [
      { cx: mid - 10, cy: mid + 4,  rx: 12, ry: 9,  z0: 17, z1: 27, s: 1 },
      { cx: mid + 11, cy: mid - 5,  rx: 12, ry: 9,  z0: 23, z1: 34, s: 2 },
      { cx: mid - 2,  cy: mid - 7,  rx: 13, ry: 10, z0: 31, z1: 43, s: 3 },
      { cx: mid + 6,  cy: mid + 7,  rx: 10, ry: 8,  z0: 20, z1: 29, s: 4 },
    ];
    for (let z = 0; z < nS; z++) {
      const ox = z * sw;
      if (z <= 32) {
        // S-curved windswept pine trunk
        const tx = mid + Math.sin(z * 0.14) * 4.5 - (z > 16 ? (z - 16) * 0.12 : 0);
        const ty = mid + Math.cos(z * 0.12) * 2.2 - 1.5;
        const rad = z < 5 ? (5.4 - z * 0.44) : Math.max(1.5, 3.4 - (z / 32) * 1.7);
        for (let y = Math.floor(ty - rad - 2); y <= Math.ceil(ty + rad + 2); y++) {
          for (let x = Math.floor(tx - rad - 2); x <= Math.ceil(tx + rad + 2); x++) {
            if (x < 1 || x >= sw - 1 || y < 1 || y >= sw - 1) continue;
            const dx = x - tx, dy = y - ty;
            if (Math.hypot(dx, dy) <= rad) {
              g.fillStyle = barkPal[dx < -0.4 ? 3 : (dx < 0.8 ? 2 : 1)];
              g.fillRect(ox + x, y, 1, 1);
            }
          }
        }
        // Horizontal reaching limbs toward the cloud pads
        if (z >= 15 && z <= 22) {
          const lt = (z - 15) / 7;
          const bx = Math.round(tx - lt * 9), by = Math.round(ty + lt * 5);
          g.fillStyle = barkPal[1]; g.fillRect(ox + bx - 1, by - 1, 3, 2);
        }
        if (z >= 21 && z <= 27) {
          const lt = (z - 21) / 6;
          const bx = Math.round(tx + lt * 10), by = Math.round(ty - lt * 4);
          g.fillStyle = barkPal[1]; g.fillRect(ox + bx - 1, by - 1, 3, 2);
        }
      }
      for (let pi = 0; pi < pads.length; pi++) {
        const pf = pads[pi];
        drawPuffSlice(g, ox, sw, pf.cx, pf.cy, pf.rx, pf.ry, z, pf.z0, pf.z1, leafPal, pf.s * 7);
      }
    }
    return c;
  }

  const EXTRA_PROP_META = {
    // 6 new biome tree varieties
    sakura_weeping: { sw: 56, slices: 48, outline: '#2b1224', r: 9.5, shR: 11, isTree: true,  canopyZ: 18, canDither: false, reflects: true },
    bamboo_clump:   { sw: 42, slices: 54, outline: '#14261a', r: 8.5, shR:  9, isTree: true,  canopyZ: 22, canDither: false, reflects: true },
    ginkgo:         { sw: 52, slices: 48, outline: '#2a1d10', r: 9.5, shR: 10, isTree: true,  canopyZ: 18, canDither: false, reflects: true },
    maple_burnt:    { sw: 52, slices: 42, outline: '#241218', r: 9.5, shR: 10, isTree: true,  canopyZ: 16, canDither: false, reflects: true },
    cedar:          { sw: 44, slices: 58, outline: '#101d24', r: 9.0, shR: 10, isTree: true,  canopyZ: 14, canDither: false, reflects: true },
    pine_gnarled:   { sw: 50, slices: 44, outline: '#11201a', r: 9.5, shR: 10, isTree: true,  canopyZ: 16, canDither: false, reflects: true },
    // 4 new natural rock formations
    rock_flat:      { sw: 32, slices: 15, outline: '#1c2026', r: 9.5, shR:  9, isTree: false, canDither: false, reflects: true },
    rock_crag:      { sw: 30, slices: 28, outline: '#1b1d24', r: 8.5, shR:  8, isTree: false, canDither: false, reflects: true },
    rock_mossy:     { sw: 28, slices: 18, outline: '#19221d', r: 8.0, shR:  8, isTree: false, canDither: false, reflects: true },
    rock_pebbles:   { sw: 26, slices: 10, outline: '#1e2228', r: 5.5, shR:  5, isTree: false, canDither: false, reflects: false },
  };

  function buildAll(IMGS) {
    IMGS.sakura_weeping = makeSakuraWeeping();
    IMGS.bamboo_clump   = makeBambooClump();
    IMGS.ginkgo         = makeGinkgo();
    IMGS.maple_burnt    = makeMapleBurnt();
    IMGS.cedar          = makeCedar();
    IMGS.pine_gnarled   = makePineGnarled();
    IMGS.rock_flat      = makeRockFlat();
    IMGS.rock_crag      = makeRockCrag();
    IMGS.rock_mossy     = makeRockMossy();
    IMGS.rock_pebbles   = makeRockPebbles();
  }

  function pickTreeForBiome(biome, rng) {
    const r = rng();
    if (biome === 0) {
      // Sakura Grove: classic Sakura + cascading Weeping Sakura + Emerald Bamboo Clumps!
      return r < 0.48 ? 'sakura' : (r < 0.78 ? 'sakura_weeping' : 'bamboo_clump');
    }
    if (biome === 1) {
      // Autumn Maple: classic Crimson Autumn + Radiant Golden Ginkgo + Sculptural Burnt Mountain Maple!
      return r < 0.42 ? 'autumn' : (r < 0.74 ? 'ginkgo' : 'maple_burnt');
    }
    // Pine Highlands: classic Alpine Pine + towering Sugi Cedar + Windswept Gnarled Black Pine!
    return r < 0.42 ? 'pine' : (r < 0.74 ? 'cedar' : 'pine_gnarled');
  }

  function pickRockForBiome(biome, rng) {
    const r = rng();
    if (biome === 0) {
      return r < 0.34 ? 'rock_flat' : (r < 0.64 ? 'rock_pebbles' : (r < 0.84 ? 'rock_mossy' : 'zen_rock'));
    }
    if (biome === 1) {
      return r < 0.38 ? 'rock_crag' : (r < 0.68 ? 'rock_flat' : (r < 0.88 ? 'rock_pebbles' : 'zen_rock'));
    }
    return r < 0.36 ? 'rock_mossy' : (r < 0.68 ? 'rock_crag' : (r < 0.86 ? 'zen_rock' : 'rock_flat'));
  }

  function treeDecalKind(kind) {
    if (kind === 'sakura' || kind === 'sakura_weeping') return 'sakura_petals';
    if (kind === 'autumn' || kind === 'ginkgo' || kind === 'maple_burnt') return 'autumn_leaves';
    return 'pine_moss';
  }

  window.SakuraBiomeNature = {
    EXTRA_PROP_META,
    buildAll,
    pickTreeForBiome,
    pickRockForBiome,
    treeDecalKind,
  };
})();
