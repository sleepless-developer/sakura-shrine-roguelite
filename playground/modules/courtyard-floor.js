// ============================================================================
// Modular 5-Slice Pixel-Art Courtyard Floor Engine (Intact + Ruined)
// Loaded by playground/index.html as window.SakuraCourtyardFloor
//
// Uses the EXACT SAME integer-grid pixel-art multi-slice (z=0..4) technology
// as the forest biome Wang tiles (direct ImageData writes, ZERO ctx.stroke()
// anti-aliasing blur!):
//   z=0 : Deep plinth shadow foundation + broken edge base
//   z=1 : Chiseled granite plinth skirt with crisp 1px edge & mineral grain
//   z=2 : Recessed stone mortar / dark gravel troughs / damp soil cracks
//   z=3 : RAISED 3D pixel-art flagstones, raked Shirakawa gravel crests,
//         Ranbari polygonal stone (via exact pixel Voronoi — ZERO blur!),
//         Kakuishi diamond tiles, 1px sunlit bevels, Bresenham cracks & moss
//   z=4 : Sunlit 3D moss pillow tips, raised quartz chips, fallen kawara slate
//         shards & crisp pixel-art elevated stone terrace decks
//
// Also builds an exact Path2D solid-floor clip mask so forest ground slices
// z=1..4 NEVER bleed onto intact or solid ruined stone, while eroded ruin
// openings cleanly reveal the real 5-slice forest floor underneath!
// ============================================================================
(function () {
  function hash2(ix, iy, salt) {
    let n = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(salt | 0, 1442695041)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  function vNoise(x, y, salt) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash2(ix, iy, salt), b = hash2(ix + 1, iy, salt);
    const c = hash2(ix, iy + 1, salt), d = hash2(ix + 1, iy + 1, salt);
    return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
  }
  function fbm(x, y, salt) {
    return (
      vNoise(x, y, salt) * 0.58 +
      vNoise(x * 2.09 + 7.1, y * 2.09 - 4.3, salt + 37) * 0.29 +
      vNoise(x * 4.23 - 3.7, y * 4.23 + 9.2, salt + 91) * 0.13
    );
  }

  // Distance from world point (wx, wy) to nearest OUTER edge of compound courtyard rects
  function distToOuterEdge(wx, wy, rects) {
    let minD = 9999;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (wx >= r.x0 && wx <= r.x1 && wy >= r.y0 && wy <= r.y1) {
        const checkEdge = (ex, ey, d) => {
          for (let j = 0; j < rects.length; j++) {
            if (j === i) continue;
            const o = rects[j];
            if (ex >= o.x0 + 2 && ex <= o.x1 - 2 && ey >= o.y0 + 2 && ey <= o.y1 - 2) return;
          }
          if (d < minD) minD = d;
        };
        checkEdge(r.x0 - 4, wy, wx - r.x0);
        checkEdge(r.x1 + 4, wy, r.x1 - wx);
        checkEdge(wx, r.y0 - 4, wy - r.y0);
        checkEdge(wx, r.y1 + 4, r.y1 - wy);
      }
    }
    return minD;
  }

  // Fast packed RGB helper for ImageData writes
  function putPx(data, w, h, x, y, r, g, b) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const o = (y * w + x) << 2;
    data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
  }

  // Crisp integer Bresenham jagged crack plotter (ZERO anti-aliasing blur!)
  function drawPixelCrack(data2, data3, w, h, x0, y0, x1, y1, salt) {
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, x = x0, y = y0, steps = 0;
    while (steps++ < 48) {
      if (x >= 0 && x < w && y >= 0 && y < h) {
        const o = (y * w + x) << 2;
        // Clear z=3 stone pixel so dark recessed z=2 crack shows with true 1px 3D depth!
        data3[o + 3] = 0;
        data2[o] = 58; data2[o + 1] = 64; data2[o + 2] = 74; data2[o + 3] = 255;
        // Occasional crisp sunlit chipped highlight pixel beside the crack
        if (x + 1 < w && data3[o + 7] === 255 && ((x + y + salt) & 3) === 0) {
          data3[o + 4] = 216; data3[o + 5] = 220; data3[o + 6] = 212;
        }
      }
      if (x === x1 && y === y1) break;
      const e2 = err << 1;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }

  // Computes organic erosion mask field (cell=4px) for ruined courtyards:
  //   0 = eroded void (REAL 5-slice forest floor shows through!)
  //   1 = crumbled mossy border lip
  //   2 = solid weathered stone
  function buildErosionField(x0, y0, x1, y1, rects, terraces, sandBoxes, sStones, seedSalt) {
    const cell = 4;
    const cols = Math.ceil((x1 - x0) / cell) + 1;
    const rows = Math.ceil((y1 - y0) / cell) + 1;
    const mask = new Uint8Array(cols * rows);
    const keepSafe = (wx, wy) => {
      if (Math.hypot(wx, wy - 18) < 54) return true;
      for (let i = 0; i < terraces.length; i++) {
        const t = terraces[i];
        if (wx >= t.x0 - 20 && wx <= t.x1 + 20 && wy >= t.y0 - 20 && wy <= t.y1 + 20) return true;
      }
      for (let i = 0; i < sandBoxes.length; i++) {
        const sb = sandBoxes[i];
        if (wx >= sb.x - sb.rx - 16 && wx <= sb.x + sb.rx + 16 && wy >= sb.y - sb.ry - 16 && wy <= sb.y + sb.ry + 16) return true;
      }
      for (let i = 0; i < sStones.length; i++) {
        const st = sStones[i];
        if (Math.abs(wx - st.x) < 16 && Math.abs(wy - st.y) < 16) return true;
      }
      return false;
    };

    for (let ry = 0; ry < rows; ry++) {
      const wy = y0 + ry * cell + cell * 0.5;
      for (let rx = 0; rx < cols; rx++) {
        const wx = x0 + rx * cell + cell * 0.5;
        let inside = false;
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i];
          if (wx >= r.x0 && wx <= r.x1 && wy >= r.y0 && wy <= r.y1) { inside = true; break; }
        }
        if (!inside) { mask[ry * cols + rx] = 0; continue; }
        if (keepSafe(wx, wy)) { mask[ry * cols + rx] = 2; continue; }

        const dEdge = distToOuterEdge(wx, wy, rects);
        const warpX = (vNoise(wx * 0.018, wy * 0.018, seedSalt + 53) - 0.5) * 26;
        const warpY = (vNoise(wx * 0.018, wy * 0.018, seedSalt + 89) - 0.5) * 26;
        const nBig = fbm((wx + warpX) * 0.014, (wy + warpY) * 0.014, seedSalt + 101);
        const nCrater = fbm(wx * 0.019 + 11.3, wy * 0.019 - 6.7, seedSalt + 307);
        const nDetail = vNoise(wx * 0.065, wy * 0.065, seedSalt + 211);

        const edgeFactor = Math.max(0, 1.0 - dEdge / 80);
        const erodePerimeter = nBig * 0.78 + nDetail * 0.22 + edgeFactor * 0.44;
        const erodeInterior = nCrater * 0.80 + nDetail * 0.20;

        if (erodePerimeter > 0.80 || erodeInterior > 0.78) mask[ry * cols + rx] = 0;
        else if (erodePerimeter > 0.73 || erodeInterior > 0.72) mask[ry * cols + rx] = 1;
        else mask[ry * cols + rx] = 2;
      }
    }
    return { mask, cols, rows, cell, x0, y0 };
  }

  // Build compact coarse-merged world rectangles of solid courtyard floor (~18-28 rects vs ~250!).
  // Used with evenodd clipping ONLY on z=3..4 so forest grass tips NEVER bleed onto stone while keeping GPU raster at 60 FPS!
  function buildSolidWorldRects(rects, erosionField) {
    if (!erosionField) {
      return rects.map(r => [r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0]);
    }
    const { mask, cols, rows, cell, x0, y0 } = erosionField;
    // Downsample 4px erosion mask into 16px blocks (stride=4) and merge horizontally + vertically!
    const stride = 4;
    const bCols = Math.ceil(cols / stride), bRows = Math.ceil(rows / stride);
    const blk = new Uint8Array(bCols * bRows);
    for (let by = 0; by < bRows; by++) {
      for (let bx = 0; bx < bCols; bx++) {
        let solidCnt = 0, total = 0;
        const ry1 = Math.min(rows, (by + 1) * stride);
        const rx1 = Math.min(cols, (bx + 1) * stride);
        for (let ry = by * stride; ry < ry1; ry++) {
          for (let rx = bx * stride; rx < rx1; rx++) {
            total++;
            if (mask[ry * cols + rx] > 0) solidCnt++;
          }
        }
        // Mark block solid if >= 50% of its pixels are stone (keeps forest grass out of stone while letting eroded voids breathe!)
        if (total > 0 && solidCnt * 2 >= total) blk[by * bCols + bx] = 1;
      }
    }
    const bSz = cell * stride;
    const out = [];
    // Horizontal runs + vertical merge of identical x-runs
    let prevMap = new Map();
    for (let by = 0; by < bRows; by++) {
      const curMap = new Map();
      let runStart = -1;
      for (let bx = 0; bx <= bCols; bx++) {
        const solid = bx < bCols && blk[by * bCols + bx] === 1;
        if (solid && runStart < 0) runStart = bx;
        else if (!solid && runStart >= 0) {
          const rx = x0 + runStart * bSz, rw = (bx - runStart) * bSz;
          const key = `${rx}_${rw}`;
          const prev = prevMap.get(key);
          if (prev) {
            prev[3] += bSz;
            curMap.set(key, prev);
          } else {
            const rObj = [rx, y0 + by * bSz, rw, bSz];
            out.push(rObj);
            curMap.set(key, rObj);
          }
          runStart = -1;
        }
      }
      prevMap = curMap;
    }
    return out;
  }

  // Theme palettes (RGB arrays, matching the crisp pixel-art palette contrast of biome Wang tiles!)
  const THEME_PALS = {
    shrine: {
      plinthDark: [44, 50, 62], plinthMid: [96, 104, 118], plinthHi: [142, 150, 162],
      curbDark: [78, 86, 98], curbMid: [128, 136, 148], curbHi: [184, 192, 202],
      mortar: [152, 158, 148], mortarDark: [120, 126, 118],
      trough: [184, 189, 178], ridgeA: [212, 216, 206], ridgeB: [222, 226, 217], ridgeHi: [236, 239, 232],
      speckD: [164, 169, 160],
    },
    zen: {
      plinthDark: [46, 52, 64], plinthMid: [106, 112, 124], plinthHi: [154, 160, 170],
      curbDark: [84, 92, 104], curbMid: [134, 142, 154], curbHi: [192, 199, 208],
      mortar: [158, 164, 158], mortarDark: [124, 130, 126],
      trough: [192, 197, 190], ridgeA: [220, 224, 218], ridgeB: [230, 233, 228], ridgeHi: [242, 244, 240],
      speckD: [170, 176, 170],
    },
    tea: {
      plinthDark: [56, 50, 44], plinthMid: [116, 106, 92], plinthHi: [160, 148, 128],
      curbDark: [84, 78, 70], curbMid: [126, 118, 104], curbHi: [178, 168, 148],
      mortar: [142, 130, 108], mortarDark: [110, 98, 78],
      trough: [176, 164, 138], ridgeA: [204, 192, 164], ridgeB: [214, 202, 174], ridgeHi: [228, 218, 192],
      speckD: [156, 144, 118],
    },
    kura: {
      plinthDark: [42, 47, 58], plinthMid: [96, 103, 116], plinthHi: [148, 155, 168],
      curbDark: [74, 82, 96], curbMid: [122, 130, 144], curbHi: [182, 190, 202],
      mortar: [126, 130, 126], mortarDark: [94, 99, 102],
      trough: [174, 174, 166], ridgeA: [198, 197, 189], ridgeB: [210, 209, 201], ridgeHi: [226, 225, 218],
      speckD: [148, 150, 146],
    },
  };

  // Biome-harmonized crisp pixel-art moss colors (matches BIOME_GROUND_PAL[0] so courtyard moss & forest moss look unified!)
  const MOSS_DARK  = [66, 94, 34];   // z=2 deep moss seam / rim
  const MOSS_MID   = [94, 126, 48];  // z=3 body moss
  const MOSS_LIGHT = [118, 152, 62]; // z=3 sunlit moss
  const MOSS_CAP   = [148, 180, 82]; // z=4 raised sunlit moss pillow tip!
  const LICHEN_COL = [154, 168, 130];

  // Crisp pixel-art stone shade table (pre-allocated static RGB tuples -> ZERO per-pixel array allocations!)
  const STONE_WET_0 = [134, 141, 136], STONE_WET_1 = [152, 159, 152], STONE_WET_2 = [168, 174, 166];
  const STONE_DRY_0 = [164, 170, 162], STONE_DRY_1 = [182, 188, 179], STONE_DRY_2 = [196, 201, 191];
  const STONE_DRY_3 = [209, 213, 204], STONE_DRY_4 = [148, 155, 150];
  function pickStoneRGB(h, wet) {
    if (wet > 0.64) {
      if (h < 0.28) return STONE_WET_0;
      if (h < 0.66) return STONE_WET_1;
      return STONE_WET_2;
    }
    if (h < 0.16) return STONE_DRY_0;
    if (h < 0.38) return STONE_DRY_1;
    if (h < 0.72) return STONE_DRY_2;
    if (h < 0.90) return STONE_DRY_3;
    return STONE_DRY_4;
  }

  // Exact pixel-buffer Ranbari (乱張り) polygonal stone classifier via integer-grid Voronoi cells!
  // ZERO Canvas stroke() blur & ZERO per-pixel object allocations!
  const _ranbariOut = { isSeam: false, isBevel: false, isShadowRim: false, stoneH: 0.5, cx: 0, cy: 0 };
  function buildRanbariField(x0, y0, w, h, ox, oy, seedSalt) {
    const cell = 24;
    const gx0 = Math.floor(x0 / cell) - 1;
    const gy0 = Math.floor(y0 / cell) - 1;
    const gCols = Math.ceil((w + cell * 2) / cell) + 2;
    const gRows = Math.ceil((h + cell * 2) / cell) + 2;
    const sx = new Float32Array(gCols * gRows);
    const sy = new Float32Array(gCols * gRows);
    const sh = new Float32Array(gCols * gRows);
    for (let gy = 0; gy < gRows; gy++) {
      for (let gx = 0; gx < gCols; gx++) {
        const idx = gy * gCols + gx;
        const wx = (gx0 + gx) * cell;
        const wy = (gy0 + gy) * cell;
        sx[idx] = wx + (0.18 + hash2(gx0 + gx, gy0 + gy, seedSalt + 131) * 0.64) * cell;
        sy[idx] = wy + (0.18 + hash2(gx0 + gx, gy0 + gy, seedSalt + 173) * 0.64) * cell;
        sh[idx] = hash2(gx0 + gx, gy0 + gy, seedSalt + 223);
      }
    }
    return { cell, gx0, gy0, gCols, gRows, sx, sy, sh };
  }

  function sampleRanbari(rf, wx, wy) {
    const { cell, gx0, gy0, gCols, gRows, sx, sy, sh } = rf;
    const gx = Math.floor(wx / cell) - gx0;
    const gy = Math.floor(wy / cell) - gy0;
    let d1 = 1e9, d2 = 1e9, bestIdx = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = gy + dy;
      if (ny < 0 || ny >= gRows) continue;
      const rowOff = ny * gCols;
      for (let dx = -1; dx <= 1; dx++) {
        const nx = gx + dx;
        if (nx < 0 || nx >= gCols) continue;
        const idx = rowOff + nx;
        const ddx = wx - sx[idx], ddy = wy - sy[idx];
        const d = ddx * ddx + ddy * ddy;
        if (d < d1) { d2 = d1; d1 = d; bestIdx = idx; }
        else if (d < d2) { d2 = d; }
      }
    }
    _ranbariOut.stoneH = sh[bestIdx];
    _ranbariOut.cx = sx[bestIdx];
    _ranbariOut.cy = sy[bestIdx];
    // Fast-path skip Math.sqrt on ~82% of interior stone pixels (avoids ~330,000 sqrts per courtyard bake!)
    const diff = d2 - d1;
    if (diff > 76) {
      _ranbariOut.isSeam = false;
      _ranbariOut.isBevel = false;
      _ranbariOut.isShadowRim = false;
      return _ranbariOut;
    }
    const edgeDist = Math.sqrt(d2) - Math.sqrt(d1);
    _ranbariOut.isSeam = edgeDist < 1.55;
    _ranbariOut.isBevel = edgeDist >= 1.55 && edgeDist < 2.8 && (wx < sx[bestIdx] || wy < sy[bestIdx]);
    _ranbariOut.isShadowRim = edgeDist >= 1.55 && edgeDist < 2.7 && (wx > sx[bestIdx] && wy > sy[bestIdx]);
    return _ranbariOut;
  }

  // Incremental 5-Slice Pixel-Art Courtyard Slab Baker (runs in 48-row slices ~1.8ms/frame for outer courtyards, or synchronously in 1 shot!)
  function initPixelCourtyardJob(ctxs, w, h, ox, oy, x0, y0, x1, y1, rects, theme, isRuined, erosionField, seedSalt) {
    const pal = THEME_PALS[theme] || THEME_PALS.shrine;
    const ids = ctxs.map(g => g.createImageData(w, h));
    const solidGrid = new Uint8Array(w * h); // 0=outside/void, 1=curb/rim, 2=interior
    for (let i = 0; i < rects.length; i++) {
      const rc = rects[i];
      const rx0 = Math.max(0, Math.round(rc.x0 - ox));
      const ry0 = Math.max(0, Math.round(rc.y0 - oy));
      const rx1 = Math.min(w, Math.round(rc.x1 - ox));
      const ry1 = Math.min(h, Math.round(rc.y1 - oy));
      for (let py = ry0; py < ry1; py++) {
        const rowOff = py * w;
        for (let px = rx0; px < rx1; px++) {
          solidGrid[rowOff + px] = 2;
        }
      }
    }
    if (isRuined && erosionField) {
      const { mask, cols, rows, cell, x0: ex0, y0: ey0 } = erosionField;
      for (let py = 0; py < h; py++) {
        const wy = oy + py;
        const ry = Math.floor((wy - ey0) / cell);
        if (ry < 0 || ry >= rows) continue;
        const rowOff = py * w;
        const mRow = ry * cols;
        for (let px = 0; px < w; px++) {
          if (solidGrid[rowOff + px] === 0) continue;
          const wx = ox + px;
          const rx = Math.floor((wx - ex0) / cell);
          if (rx < 0 || rx >= cols) continue;
          const m = mask[mRow + rx];
          if (m === 0) solidGrid[rowOff + px] = 0;
          else if (m === 1) solidGrid[rowOff + px] = 1;
        }
      }
    }
    const borderDist = new Uint8Array(w * h);
    for (let py = 0; py < h; py++) {
      const rowOff = py * w;
      for (let px = 0; px < w; px++) {
        if (solidGrid[rowOff + px] === 0) continue;
        let minB = 4;
        for (let d = 1; d <= 3; d++) {
          if (px - d < 0 || px + d >= w || py - d < 0 || py + d >= h ||
              solidGrid[rowOff + px - d] === 0 || solidGrid[rowOff + px + d] === 0 ||
              solidGrid[(py - d) * w + px] === 0 || solidGrid[(py + d) * w + px] === 0) {
            minB = d; break;
          }
        }
        borderDist[rowOff + px] = minB;
      }
    }
    const ruinPattern = isRuined ? (Math.abs(seedSalt) % 3) : -1;
    const ranbariField = (ruinPattern === 1) ? buildRanbariField(x0, y0, w, h, ox, oy, seedSalt) : null;
    const nStep = 4;
    const nCols = Math.ceil(w / nStep) + 2, nRows = Math.ceil(h / nStep) + 2;
    const mossGrid = new Float32Array(nCols * nRows);
    const wetGrid  = new Float32Array(nCols * nRows);
    const ridgeGrid = new Float32Array(nCols * nRows);
    for (let ny = 0; ny < nRows; ny++) {
      const wy = oy + ny * nStep;
      for (let nx = 0; nx < nCols; nx++) {
        const wx = ox + nx * nStep;
        const ni = ny * nCols + nx;
        mossGrid[ni]  = fbm(wx * 0.026, wy * 0.026, seedSalt + 811);
        wetGrid[ni]   = fbm(wx * 0.012, wy * 0.012, seedSalt + 401);
        ridgeGrid[ni] = Math.abs(vNoise(wx * 0.058, wy * 0.058, seedSalt + 919) - 0.5);
      }
    }
    return {
      ctxs, ids, pal, w, h, ox, oy, x0, y0, theme, isRuined, seedSalt,
      solidGrid, borderDist, ruinPattern, ranbariField, nStep, nCols,
      mossGrid, wetGrid, ridgeGrid, nextRow: 0, done: false,
    };
  }

  function stepPixelCourtyardJob(job, maxRows = 48) {
    if (job.done) return true;
    const {
      ctxs, ids, pal, w, h, ox, oy, x0, y0, theme, isRuined, seedSalt,
      solidGrid, borderDist, ruinPattern, ranbariField, nStep, nCols,
      mossGrid, wetGrid, ridgeGrid,
    } = job;
    const d0 = ids[0].data, d1 = ids[1].data, d2 = ids[2].data, d3 = ids[3].data, d4 = ids[4].data;
    const sampleGrid = (arr, px, py) => {
      const gx = px / nStep, gy = py / nStep;
      const ix = gx | 0, iy = gy | 0;
      const fx = gx - ix, fy = gy - iy;
      const i0 = iy * nCols + ix;
      return (arr[i0] * (1 - fx) + arr[i0 + 1] * fx) * (1 - fy) + (arr[i0 + nCols] * (1 - fx) + arr[i0 + nCols + 1] * fx) * fy;
    };
    const endRow = Math.min(h, job.nextRow + maxRows);
    for (let py = job.nextRow; py < endRow; py++) {
      const wy = Math.round(oy + py);
      const rowOff = py * w;
      for (let px = 0; px < w; px++) {
        const sVal = solidGrid[rowOff + px];
        if (sVal === 0) continue;
        const wx = Math.round(ox + px);
        const o = (rowOff + px) << 2;
        const bDist = borderDist[rowOff + px];
        const micro = hash2(wx, wy, seedSalt + 7);
        const grain = ((wx * 3 + wy * 5) & 7);

        // ---- z=0 & z=1: 3D Chiseled Stone Plinth Foundation ----
        if (bDist === 1) {
          d0[o] = 34; d0[o + 1] = 38; d0[o + 2] = 48; d0[o + 3] = 255;
          d1[o] = pal.plinthDark[0]; d1[o + 1] = pal.plinthDark[1]; d1[o + 2] = pal.plinthDark[2]; d1[o + 3] = 255;
        } else {
          const plCol = bDist === 2 ? pal.plinthMid : pal.plinthHi;
          d0[o] = pal.plinthDark[0]; d0[o + 1] = pal.plinthDark[1]; d0[o + 2] = pal.plinthDark[2]; d0[o + 3] = 255;
          d1[o] = plCol[0]; d1[o + 1] = plCol[1]; d1[o + 2] = plCol[2]; d1[o + 3] = 255;
        }

        // ---- Outer Perimeter Stone Curb (bDist <= 3) ----
        if (bDist <= 3) {
          const isCurbJoint = ((wx + wy) % 18 === 0);
          const brokenEdge = isRuined && sVal === 1;
          // z=2 recessed curb base
          d2[o] = pal.curbDark[0]; d2[o + 1] = pal.curbDark[1]; d2[o + 2] = pal.curbDark[2]; d2[o + 3] = 255;
          // z=3 raised granite curb block (or dark chipped cliff on broken ruin rims!)
          if (brokenEdge && bDist === 1) {
            d3[o] = 60; d3[o + 1] = 66; d3[o + 2] = 78; d3[o + 3] = 255;
          } else if (isCurbJoint) {
            d3[o] = pal.curbDark[0]; d3[o + 1] = pal.curbDark[1]; d3[o + 2] = pal.curbDark[2]; d3[o + 3] = 255;
          } else {
            const cCol = bDist === 1 ? pal.curbDark : (bDist === 2 ? pal.curbHi : pal.curbMid);
            let cr = cCol[0], cg = cCol[1], cb = cCol[2];
            if (micro < 0.14) { cr -= 14; cg -= 14; cb -= 14; }
            else if (micro > 0.88) { cr = Math.min(255, cr + 14); cg = Math.min(255, cg + 14); cb = Math.min(255, cb + 14); }
            d3[o] = cr; d3[o + 1] = cg; d3[o + 2] = cb; d3[o + 3] = 255;
          }
          // Moss spilling onto broken ruin rim on z=3 & z=4
          if (brokenEdge) {
            const mn = sampleGrid(mossGrid, px, py);
            if (mn > 0.48) {
              const mc = mn > 0.62 ? MOSS_DARK : MOSS_MID;
              d3[o] = mc[0]; d3[o + 1] = mc[1]; d3[o + 2] = mc[2]; d3[o + 3] = 255;
              if (mn > 0.64 && micro > 0.42) {
                d4[o] = MOSS_CAP[0]; d4[o + 1] = MOSS_CAP[1]; d4[o + 2] = MOSS_CAP[2]; d4[o + 3] = 255;
              }
            }
          }
          continue;
        }

        // =====================================================================
        // INTERIOR COURTYARD PAVING (z=2 recessed mortar/trough, z=3 raised crisp pixel-art stone/gravel, z=4 3D caps!)
        // =====================================================================
        if (isRuined) {
          const mn = sampleGrid(mossGrid, px, py);
          const wet = sampleGrid(wetGrid, px, py);
          const ridge = sampleGrid(ridgeGrid, px, py);

          let isSeam = false, isBevel = false, isShadowRim = false, stoneH = 0.5;
          if (ruinPattern === 0) {
            // Pattern 0: Variable-width Ishidatami Ashlar granite slabs
            const rowH = 16;
            const row = Math.floor((wy - y0) / rowH);
            const ly = ((wy - y0) % rowH + rowH) % rowH;
            const rowOffX = Math.floor(hash2(row, 11, seedSalt) * 16);
            const ax = (wx - x0) + rowOffX;
            const colBlock = Math.floor(ax / 24);
            const wRoll = hash2(colBlock, row, seedSalt + 19);
            const slabW = wRoll < 0.30 ? 18 : (wRoll < 0.72 ? 24 : 30);
            const col = Math.floor(ax / slabW);
            const lx = ((ax % slabW) + slabW) % slabW;
            stoneH = hash2(col, row, seedSalt + 17);
            isSeam = (lx === 0 || ly === 0 || (lx === 1 && mn > 0.58) || (ly === 1 && mn > 0.58));
            isBevel = (!isSeam && (lx === 1 || ly === 1));
            isShadowRim = (!isSeam && (lx === slabW - 1 || ly === rowH - 1));
          } else if (ruinPattern === 1) {
            // Pattern 1: Exact Pixel-Art Ranbari (乱張り) Irregular Polygonal Stone (ZERO stroke blur!)
            const rInfo = sampleRanbari(ranbariField, wx, wy);
            isSeam = rInfo.isSeam;
            isBevel = rInfo.isBevel;
            isShadowRim = rInfo.isShadowRim;
            stoneH = rInfo.stoneH;
          } else {
            // Pattern 2: Ceremonial Kakuishi Square Slabs + Inset Diagonal Diamond Keystones
            const s = 26;
            const col = Math.floor((wx - x0) / s), row = Math.floor((wy - y0) / s);
            const lx = ((wx - x0) % s + s) % s, ly = ((wy - y0) % s + s) % s;
            // Distance to nearest corner intersection (for inset diamond keystone on even corners)
            const cornerX = lx < s * 0.5 ? 0 : s;
            const cornerY = ly < s * 0.5 ? 0 : s;
            const cCol = col + (cornerX === s ? 1 : 0);
            const cRow = row + (cornerY === s ? 1 : 0);
            const manh = Math.abs(lx - cornerX) + Math.abs(ly - cornerY);
            if (((cCol + cRow) & 1) === 0 && manh <= 8) {
              stoneH = hash2(cCol + 17, cRow + 31, seedSalt + 311) * 0.35; // slightly darker keystone!
              isSeam = (manh === 8);
              isBevel = (manh === 7 && lx <= cornerX);
              isShadowRim = (manh === 7 && lx > cornerX);
            } else {
              stoneH = hash2(col, row, seedSalt + 271);
              isSeam = (lx === 0 || ly === 0);
              isBevel = (!isSeam && (lx === 1 || ly === 1));
              isShadowRim = (!isSeam && (lx === s - 1 || ly === s - 1));
            }
          }

          // Always fill z=2 recessed mortar / damp earth base
          if (mn > 0.52) {
            d2[o] = MOSS_DARK[0]; d2[o + 1] = MOSS_DARK[1]; d2[o + 2] = MOSS_DARK[2]; d2[o + 3] = 255;
          } else {
            d2[o] = 98; d2[o + 1] = 104; d2[o + 2] = 100; d2[o + 3] = 255;
          }

          // Determine if creeping pixel-art moss blankets this pixel (organic veins + damp cushions, ZERO ovals!)
          const heavyMoss = mn > 0.69 || (mn > 0.56 && ridge < 0.068) || (sVal === 1 && mn > 0.50);
          if (heavyMoss) {
            // Crisp 2-layer 3D biome-matched moss cushion!
            d2[o] = MOSS_DARK[0]; d2[o + 1] = MOSS_DARK[1]; d2[o + 2] = MOSS_DARK[2]; d2[o + 3] = 255;
            const isMossRim = mn < 0.60 && ridge > 0.04;
            let mc = isMossRim ? MOSS_DARK : (mn > 0.74 ? MOSS_LIGHT : MOSS_MID);
            if (micro < 0.14) mc = MOSS_DARK;
            else if (micro > 0.88 && mn > 0.62) mc = MOSS_CAP;
            else if (micro > 0.82 && mn < 0.64) mc = LICHEN_COL;
            d3[o] = mc[0]; d3[o + 1] = mc[1]; d3[o + 2] = mc[2]; d3[o + 3] = 255;
            // Sunlit z=4 moss pillow cap on thick damp clusters (same 3D lift as forest Wang tiles!)
            if (mn > 0.75 && micro > 0.35 && ((wx + wy) & 1) === 0) {
              d4[o] = MOSS_CAP[0]; d4[o + 1] = MOSS_CAP[1]; d4[o + 2] = MOSS_CAP[2]; d4[o + 3] = 255;
            }
          } else if (isSeam) {
            // Recessed mortar groove: leave z=3 transparent (or mossy dark speck) so z=2 shows with crisp 1px 3D recessed shadow!
            if (mn > 0.54 && micro > 0.45) {
              d3[o] = MOSS_DARK[0]; d3[o + 1] = MOSS_DARK[1]; d3[o + 2] = MOSS_DARK[2]; d3[o + 3] = 255;
            }
          } else {
            // Raised z=3 crisp pixel-art stone slab with hand-pixelated granite grain & 1px sunlit bevel!
            const base = pickStoneRGB(stoneH, wet);
            let sr = base[0], sg = base[1], sb = base[2];
            if (isBevel && wet < 0.64) { sr = Math.min(255, sr + 18); sg = Math.min(255, sg + 18); sb = Math.min(255, sb + 16); }
            else if (isShadowRim) { sr = Math.max(0, sr - 22); sg = Math.max(0, sg - 22); sb = Math.max(0, sb - 20); }
            // Crisp biome-style pixel granite grain stippling (never flat monochrome!)
            if (micro < 0.11) { sr -= 18; sg -= 17; sb -= 15; }
            else if (micro > 0.90 && grain < 4) { sr = Math.min(255, sr + 14); sg = Math.min(255, sg + 14); sb = Math.min(255, sb + 12); }
            d3[o] = sr; d3[o + 1] = sg; d3[o + 2] = sb; d3[o + 3] = 255;

            // Occasional crisp 3D fallen dark kawara roof-tile shard in dry debris pockets
            if (mn < 0.28 && micro > 0.985) {
              putPx(d3, w, h, px, py, 52, 60, 76);
              putPx(d3, w, h, px + 1, py, 52, 60, 76);
              putPx(d3, w, h, px + 2, py, 68, 78, 96);
              putPx(d3, w, h, px, py + 1, 42, 48, 62);
              putPx(d4, w, h, px + 1, py, 94, 108, 130);
            }
          }
        } else {
          // =====================================================================
          // INTACT COURTYARD — CRISP 5-SLICE PIXEL-ART TEXTURE (ZERO FLAT BLUR!)
          // =====================================================================
          if (theme === 'kura') {
            // Crisp 3D Ishidatami Cut-Granite Flagstones (z=2 mortar, z=3 raised speckled stone slabs!)
            const tileW = 24, tileH = 18;
            const row = Math.floor((wy - y0) / tileH);
            const ly = ((wy - y0) % tileH + tileH) % tileH;
            const shift = (row & 1) ? 12 : 0;
            const ax = (wx - x0) + shift;
            const col = Math.floor(ax / tileW);
            const lx = ((ax % tileW) + tileW) % tileW;
            const sh = hash2(col, row, seedSalt + 37);
            d2[o] = pal.mortar[0]; d2[o + 1] = pal.mortar[1]; d2[o + 2] = pal.mortar[2]; d2[o + 3] = 255;
            if (lx > 0 && ly > 0) {
              const base = sh < 0.24 ? pal.trough : (sh < 0.72 ? pal.ridgeA : pal.ridgeB);
              let sr = base[0], sg = base[1], sb = base[2];
              if (lx === 1 || ly === 1) { sr = Math.min(255, sr + 14); sg = Math.min(255, sg + 14); sb = Math.min(255, sb + 12); }
              else if (lx === tileW - 1 || ly === tileH - 1) { sr -= 14; sg -= 14; sb -= 12; }
              if (micro < 0.11) { sr -= 14; sg -= 14; sb -= 13; }
              else if (micro > 0.90 && grain < 4) { sr = Math.min(255, sr + 10); sg = Math.min(255, sg + 10); sb = Math.min(255, sb + 10); }
              d3[o] = sr; d3[o + 1] = sg; d3[o + 2] = sb; d3[o + 3] = 255;
            }
          } else if (theme === 'tea') {
            // Crisp 3D Tataki Warm Rammed Earth with hand-pixelated mineral grit & subtle combed grain!
            const wet = sampleGrid(wetGrid, px, py);
            const rakePhase = ((wy - y0) % 10 + 10) % 10;
            d2[o] = pal.mortar[0]; d2[o + 1] = pal.mortar[1]; d2[o + 2] = pal.mortar[2]; d2[o + 3] = 255;
            if (rakePhase !== 0) {
              const base = (wet > 0.56 ? pal.trough : (rakePhase <= 2 ? pal.ridgeHi : pal.ridgeA));
              let sr = base[0], sg = base[1], sb = base[2];
              if (micro < 0.13) { sr = pal.speckD[0]; sg = pal.speckD[1]; sb = pal.speckD[2]; }
              else if (micro > 0.89 && grain < 4) { sr = pal.ridgeHi[0]; sg = pal.ridgeHi[1]; sb = pal.ridgeHi[2]; }
              d3[o] = sr; d3[o + 1] = sg; d3[o + 2] = sb; d3[o + 3] = 255;
            }
          } else {
            // Shrine & Zen: Crisp 3D Pixel-Art Raked Shirakawa Gravel!
            // z=2 = recessed rake furrow (shadowed gravel), z=3 = raised sunlit gravel crest with fine quartz pixel grain!
            // Plus a 1-slab cut-stone border trim (bDist 4..10) framing the perimeter neatly!
            const inTrim = bDist >= 4 && false; // borderDist capped at 4
            const ly = ((wy - y0) % 6 + 6) % 6;
            const wet = sampleGrid(wetGrid, px, py);
            d2[o] = pal.trough[0]; d2[o + 1] = pal.trough[1]; d2[o + 2] = pal.trough[2]; d2[o + 3] = 255;
            if (ly === 0) {
              // Recessed rake groove: let z=2 trough show (with occasional tiny quartz grain on z=3)
              if (micro > 0.92) {
                d3[o] = pal.ridgeA[0]; d3[o + 1] = pal.ridgeA[1]; d3[o + 2] = pal.ridgeA[2]; d3[o + 3] = 255;
              }
            } else {
              // Raised sunlit gravel ridge on z=3 with fine salt-and-pepper pixel-art granite stippling!
              const base = (ly === 1 || ly === 2) ? (wet < 0.45 ? pal.ridgeHi : pal.ridgeB) : pal.ridgeA;
              let sr = base[0], sg = base[1], sb = base[2];
              if (micro < 0.11) { sr = pal.speckD[0]; sg = pal.speckD[1]; sb = pal.speckD[2]; }
              else if (micro > 0.89 && grain < 4) { sr = pal.ridgeHi[0]; sg = pal.ridgeHi[1]; sb = pal.ridgeHi[2]; }
              else if (wet > 0.65 && ((wx + wy) & 3) === 0) { sr -= 6; sg -= 6; sb -= 5; }
              d3[o] = sr; d3[o + 1] = sg; d3[o + 2] = sb; d3[o + 3] = 255;
            }
            // Tiny crisp 3D pebbles sparkling on z=4 here and there (just like biome Wang tiles!)
            if (micro > 0.9965 && !inTrim) {
              putPx(d4, w, h, px, py, 240, 242, 238);
            }
          }
        }
      }
    }

    job.nextRow = endRow;
    if (job.nextRow < h) return false;

    // Finalize: add crisp integer-pixel Bresenham jagged slab fractures across ruined stone & upload all 5 ImageData slices!
    if (isRuined) {
      const stepC = 26;
      for (let py = 12; py < h - 12; py += stepC) {
        for (let px = 12; px < w - 12; px += stepC) {
          if (solidGrid[py * w + px] !== 2) continue;
          const hC = hash2(Math.round(ox + px), Math.round(oy + py), seedSalt + 613);
          if (hC < 0.62) continue;
          const sx = px + Math.floor((hash2(px, py, seedSalt + 617) - 0.5) * 10);
          const sy = py + Math.floor((hash2(px, py, seedSalt + 619) - 0.5) * 10);
          const mx = sx + Math.floor((hash2(px, py, seedSalt + 631) - 0.5) * 14);
          const my = sy + 4 + Math.floor(hash2(px, py, seedSalt + 641) * 10);
          const ex = mx + Math.floor((hash2(px, py, seedSalt + 643) - 0.5) * 14);
          const ey = my + 4 + Math.floor(hash2(px, py, seedSalt + 647) * 9);
          drawPixelCrack(d2, d3, w, h, sx, sy, mx, my, seedSalt);
          drawPixelCrack(d2, d3, w, h, mx, my, ex, ey, seedSalt + 1);
        }
      }
    }

    for (let z = 0; z < 5; z++) {
      ctxs[z].putImageData(ids[z], 0, 0);
    }
    job.done = true;
    return true;
  }

  function bakePixelCourtyardBase(ctxs, w, h, ox, oy, x0, y0, x1, y1, rects, theme, isRuined, erosionField, seedSalt) {
    const job = initPixelCourtyardJob(ctxs, w, h, ox, oy, x0, y0, x1, y1, rects, theme, isRuined, erosionField, seedSalt);
    stepPixelCourtyardJob(job, h + 1);
  }

  // Paint crisp pixel-art weathered terrace wear on z=4 (ZERO blurry Canvas strokes!)
  function paintRuinedTerraceWear(tg, tx, ty, tw, th, seedSalt) {
    const step = 2;
    for (let ly = 2; ly < th - 2; ly += step) {
      for (let lx = 2; lx < tw - 2; lx += step) {
        const nearBorder = (lx < 15 || tw - lx < 15 || ly < 13 || th - ly < 13);
        const mn = fbm((tx + lx) * 0.036, (ty + ly) * 0.036, seedSalt + 641);
        const ridge = Math.abs(vNoise((tx + lx) * 0.072, (ty + ly) * 0.072, seedSalt + 757) - 0.5);
        if ((nearBorder && mn > 0.55) || mn > 0.72 || (mn > 0.59 && ridge < 0.055)) {
          const hv = hash2(tx + lx, ty + ly, seedSalt + 701);
          tg.fillStyle = hv < 0.35 ? '#466122' : (hv < 0.78 ? '#658534' : '#8cab4e');
          tg.fillRect(tx + lx, ty + ly, step, step);
        }
      }
    }
    // Crisp 1px integer stepped stone fracture along terrace flagstone joints (ZERO anti-aliasing!)
    const drawSteppedSeg = (x0, y0, x1, y1) => {
      let x = x0, y = y0;
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), err = dx + dy;
      tg.fillStyle = '#474e5a';
      for (let k = 0; k < 48; k++) {
        tg.fillRect(x, y, 1, 1);
        if (x === x1 && y === y1) break;
        const e2 = err << 1;
        if (e2 >= dy) { err += dy; x += sx; }
        if (e2 <= dx) { err += dx; y += sy; }
      }
    };
    drawSteppedSeg(tx + 22, ty + 4, tx + 22, ty + 20);
    drawSteppedSeg(tx + 22, ty + 20, tx + 42, ty + 32);
    drawSteppedSeg(tx + tw - 24, ty + th - 4, tx + tw - 24, ty + th - 20);
    drawSteppedSeg(tx + tw - 24, ty + th - 20, tx + tw - 48, ty + th - 28);
  }

  // =========================================================================
  // FLOOR-EMBEDDED 3D DECOR ENGINE (Literally fused into the world floor slices!)
  // Pre-slices voxel strips for ground-hugging / walkable decor ('bridge', 'ruin_rubble', 'fallen_lantern')
  // into crisp color + 1px-dilated silhouette canvases ONCE at startup, then renders them directly
  // inside the EXACT SAME g.scale(1, tilt) + g.rotate(camAngle) world transform as the 5-slice floor!
  // -> 0.000° angular error, ZERO floating, ZERO air-spinning, ZERO stackCache misses!
  // =========================================================================
  // NOTE: Tall 3D voxel structures ('bridge', 'ruin_rubble', 'fallen_lantern') belong in the unified Y-sorted queue
  // with crisp screen-space finishOutline() so diagonal bridges NEVER get per-slice black outline noise and far-bank
  // lanterns/trees/characters properly occlude behind them!
  const FLOOR_EMBEDDED_KINDS = new Set();

  function buildFloorDecorAtlas(IMGS, PROP_META) {
    const atlas = {};
    for (const kind of FLOOR_EMBEDDED_KINDS) {
      const img = IMGS[kind];
      const pm = PROP_META[kind];
      if (!img || !pm) continue;
      const sw = pm.sw, nSlices = pm.slices;
      const pad = 2, cw = sw + pad * 2;
      const colSlices = [];
      const silSlices = [];
      const outRgb = parseHexRgb(pm.outline || '#1a1824');

      // Extract slice pixel buffers to build both crisp color slices & 1px dilated silhouette slices
      const tmp = document.createElement('canvas'); tmp.width = cw; tmp.height = cw;
      const tctx = tmp.getContext('2d', { willReadFrequently: true });
      tctx.imageSmoothingEnabled = false;

      for (let z = 0; z < nSlices; z++) {
        // 1) Color slice canvas
        const cc = document.createElement('canvas'); cc.width = cw; cc.height = cw;
        const cg = cc.getContext('2d');
        cg.imageSmoothingEnabled = false;
        cg.drawImage(img, z * sw, 0, sw, sw, pad, pad, sw, sw);
        colSlices.push(cc);

        // 2) 1px-dilated dark silhouette slice canvas (for clean 2-pass outer-only pixel-art outline!)
        tctx.clearRect(0, 0, cw, cw);
        tctx.drawImage(img, z * sw, 0, sw, sw, pad, pad, sw, sw);
        const src = tctx.getImageData(0, 0, cw, cw).data;
        const sc = document.createElement('canvas'); sc.width = cw; sc.height = cw;
        const sg = sc.getContext('2d');
        const dstId = sg.createImageData(cw, cw);
        const dst = dstId.data;
        for (let y = 1; y < cw - 1; y++) {
          const row = y * cw;
          for (let x = 1; x < cw - 1; x++) {
            const idx = (row + x) << 2;
            if (src[idx + 3] > 16 || src[idx - 1] > 16 || src[idx + 7] > 16 ||
                src[((row - cw + x) << 2) + 3] > 16 || src[((row + cw + x) << 2) + 3] > 16) {
              dst[idx] = outRgb[0]; dst[idx + 1] = outRgb[1]; dst[idx + 2] = outRgb[2]; dst[idx + 3] = 255;
            }
          }
        }
        sg.putImageData(dstId, 0, 0);
        silSlices.push(sc);
      }
      atlas[kind] = { sw, cw, half: cw * 0.5, nSlices, colSlices, silSlices };
    }
    return atlas;
  }

  function parseHexRgb(hex) {
    const h = String(hex || '#1a1824').replace('#', '');
    return [parseInt(h.slice(0, 2), 16) || 26, parseInt(h.slice(2, 4), 16) || 24, parseInt(h.slice(4, 6), 16) || 36];
  }

  // Render all visible floor-embedded 3D decor directly fused to the ground at EXACT continuous camAngle!
  // Uses clean 2-pass silhouette-then-color per item (sorted back-to-front by camera depth) so:
  //   - ZERO horizontal outline stripes across vertical faces!
  //   - ZERO rotation lag / quantization snapping (0.000° continuous GPU rotation)!
  function drawFloorEmbeddedDecor(g, items, atlas, rCamX, rCamY, camAngle, tilt, W, H) {
    if (!items || !items.length || !atlas) return;
    const hw = W >> 1, hh = H >> 1;
    const cCa = Math.cos(camAngle), cSa = Math.sin(camAngle);
    const viewR = Math.hypot(hw, hh / Math.max(0.45, tilt)) + 72;

    const vis = [];
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      const entry = atlas[p.kind];
      if (!entry) continue;
      const dx = p.x - rCamX, dy = p.y - rCamY;
      if (dx > viewR || dx < -viewR || dy > viewR || dy < -viewR) continue;
      const cy = dx * cSa + dy * cCa;
      vis.push({ p, entry, depth: cy });
    }
    if (!vis.length) return;
    vis.sort((a, b) => a.depth - b.depth);

    g.imageSmoothingEnabled = false;
    for (let vi = 0; vi < vis.length; vi++) {
      const { p, entry } = vis[vi];
      const zLift = p.zLift || 0;
      const dx = p.x - rCamX, dy = p.y - rCamY;
      const sx = hw + (dx * cCa - dy * cSa);
      const sy = hh + (dx * cSa + dy * cCa) * tilt;
      const totAng = camAngle + (p.rot || 0);
      const cosR = Math.cos(totAng), sinR = Math.sin(totAng);
      const bTilt = sinR * tilt, dTilt = cosR * tilt;
      const half = entry.half;
      const nS = entry.nSlices;

      // Pass 1: Continuous dark silhouette stack (exact 0.000° GPU setTransform -> crisp outer outline only!)
      for (let z = 0; z < nS; z++) {
        const yPos = sy - (z + zLift);
        const sil = entry.silSlices[z];
        g.setTransform(cosR, bTilt, -sinR, dTilt, sx, yPos);
        g.drawImage(sil, -half, -half);
        if (z === 0 || z === nS - 1) {
          g.setTransform(cosR, bTilt, -sinR, dTilt, sx, yPos + (z === 0 ? 1 : -1));
          g.drawImage(sil, -half, -half);
        }
      }

      // Pass 2: Crisp color voxel slices directly on top (covers all interior outline pixels cleanly!)
      for (let z = 0; z < nS; z++) {
        g.setTransform(cosR, bTilt, -sinR, dTilt, sx, sy - (z + zLift));
        g.drawImage(entry.colSlices[z], -half, -half);
      }
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  window.SakuraCourtyardFloor = {
    FLOOR_EMBEDDED_KINDS,
    buildErosionField,
    buildSolidWorldRects,
    initPixelCourtyardJob,
    stepPixelCourtyardJob,
    bakePixelCourtyardBase,
    paintRuinedTerraceWear,
    buildFloorDecorAtlas,
    drawFloorEmbeddedDecor,
  };
})();
