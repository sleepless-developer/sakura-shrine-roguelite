// Modular Organic Ruin Floor Erosion & Weathered Paving Engine
// Loaded by playground/index.html as window.SakuraRuinFloor
// Features:
//  - Multi-octave FBM noise slab erosion punching cleanly through z=0,1,2 to expose the REAL 5-slice forest floor
//  - 3 authentic traditional Japanese ruined stone paving patterns (selected per seed):
//      0) Ishidatami Ashlar — variable-width staggered weathered granite slabs
//      1) Ranbari Crazy Paving (乱張り) — irregular polygonal temple stones with mossy joints
//      2) Kakuishi Diamond Courtyard — ceremonial square slabs with inset diagonal flagstones
//  - Macro rain-stain weathering, per-slab diagonal fractures, clustered dark kawara roof-tile shards,
//    and organic pixel-aligned creeping moss & lichen veins (ZERO polka-dot ovals!).
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

  // Distance from point (wx, wy) to the nearest outer boundary edge of compound courtyard rects
  function distToOuterEdge(wx, wy, rects) {
    let minD = 9999;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (wx >= r.x0 && wx <= r.x1 && wy >= r.y0 && wy <= r.y1) {
        const dL = wx - r.x0, dR = r.x1 - wx, dT = wy - r.y0, dB = r.y1 - wy;
        const checkEdge = (ex, ey, d) => {
          for (let j = 0; j < rects.length; j++) {
            if (j === i) continue;
            const o = rects[j];
            if (ex >= o.x0 + 2 && ex <= o.x1 - 2 && ey >= o.y0 + 2 && ey <= o.y1 - 2) return;
          }
          if (d < minD) minD = d;
        };
        checkEdge(r.x0 - 4, wy, dL);
        checkEdge(r.x1 + 4, wy, dR);
        checkEdge(wx, r.y0 - 4, dT);
        checkEdge(wx, r.y1 + 4, dB);
      }
    }
    return minD;
  }

  // Computes organic erosion mask field (cell=4px) so z=0,1,2 share the EXACT broken stone silhouette with ZERO stripes!
  //   0 = completely eroded away (REAL 5-slice forest floor shows through!)
  //   1 = crumbled mossy border lip (dark broken edge stone)
  //   2 = intact weathered paving stone
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
        // Domain-warped multi-octave noise for authentic crumbling perimeter tongues + sunken interior forest pockets!
        const warpX = (vNoise(wx * 0.018, wy * 0.018, seedSalt + 53) - 0.5) * 26;
        const warpY = (vNoise(wx * 0.018, wy * 0.018, seedSalt + 89) - 0.5) * 26;
        const nBig = fbm((wx + warpX) * 0.014, (wy + warpY) * 0.014, seedSalt + 101);
        const nCrater = fbm(wx * 0.019 + 11.3, wy * 0.019 - 6.7, seedSalt + 307);
        const nDetail = vNoise(wx * 0.065, wy * 0.065, seedSalt + 211);

        const edgeFactor = Math.max(0, 1.0 - dEdge / 80); // strong inward erosion from outer perimeter
        const erodePerimeter = nBig * 0.78 + nDetail * 0.22 + edgeFactor * 0.44;
        const erodeInterior = nCrater * 0.80 + nDetail * 0.20;

        if (erodePerimeter > 0.80 || erodeInterior > 0.775) {
          mask[ry * cols + rx] = 0;
        } else if (erodePerimeter > 0.73 || erodeInterior > 0.715) {
          mask[ry * cols + rx] = 1;
        } else {
          mask[ry * cols + rx] = 2;
        }
      }
    }
    return { mask, cols, rows, cell, x0, y0 };
  }

  // Carve eroded cells 100% cleanly out of z=0,1,2 (ZERO horizontal stripe artifacts!)
  // and dress broken slab rims with 3D dark granite fracture edges + fallen tile debris!
  function applyErosionCutout(tg, ef, ox, oy, z) {
    const { mask, cols, rows, cell, x0, y0 } = ef;
    // 1) Punch void cells cleanly with pad=0 so consecutive rows fuse seamlessly!
    tg.save();
    tg.globalCompositeOperation = 'destination-out';
    for (let ry = 0; ry < rows; ry++) {
      let runStart = -1;
      for (let rx = 0; rx <= cols; rx++) {
        const isVoid = rx < cols && mask[ry * cols + rx] === 0;
        if (isVoid && runStart < 0) runStart = rx;
        else if (!isVoid && runStart >= 0) {
          const px = Math.round(x0 + runStart * cell - ox);
          const py = Math.round(y0 + ry * cell - oy);
          const pw = (rx - runStart) * cell;
          tg.fillRect(px, py, pw, cell);
          runStart = -1;
        }
      }
    }
    tg.restore();

    // 2) Dress the intact broken rim (mask === 1) with dark 3D stone cliff cross-sections & moss overhang!
    for (let ry = 0; ry < rows; ry++) {
      for (let rx = 0; rx < cols; rx++) {
        if (mask[ry * cols + rx] !== 1) continue;
        const bDown  = (ry + 1 < rows && mask[(ry + 1) * cols + rx] === 0);
        const bUp    = (ry > 0 && mask[(ry - 1) * cols + rx] === 0);
        const bRight = (rx + 1 < cols && mask[ry * cols + rx + 1] === 0);
        const bLeft  = (rx > 0 && mask[ry * cols + rx - 1] === 0);
        const px = Math.round(x0 + rx * cell - ox);
        const py = Math.round(y0 + ry * cell - oy);
        if (z < 2) {
          if (bDown || bUp || bRight || bLeft) {
            tg.fillStyle = z === 0 ? '#2b303a' : '#58606e';
            tg.fillRect(px, py, cell, cell);
          }
        } else {
          const hv = hash2(rx, ry, 733);
          if (hv < 0.45) {
            tg.fillStyle = hv < 0.22 ? '#4d6725' : '#637f32';
            tg.fillRect(px, py, cell, cell);
          } else if (hv < 0.76) {
            tg.fillStyle = '#8b929c';
            tg.fillRect(px, py, cell, cell);
          }
          // Crisp broken granite edge where stone meets the eroded forest floor
          tg.fillStyle = '#3c424e';
          if (bDown)  tg.fillRect(px, py + cell - 2, cell, 2);
          if (bRight) tg.fillRect(px + cell - 2, py, 2, cell);
          if (bUp)    tg.fillRect(px, py, cell, 1);
          if (bLeft)  tg.fillRect(px, py, 1, cell);
        }
      }
    }
  }

  function pickStoneTone(h, wet) {
    if (wet > 0.64) {
      if (h < 0.25) return '#8d938c';
      if (h < 0.65) return '#9fa59c';
      return '#adb2a8';
    }
    if (h < 0.16) return '#a8aea5';
    if (h < 0.36) return '#b7bcb2';
    if (h < 0.70) return '#c4c8be';
    if (h < 0.90) return '#d0d3c9';
    return '#969d98';
  }

  // Pattern 0: Variable-width Ishidatami cut-stone ashlar flagstones
  function paintAshlarPattern(tg, x0, y0, x1, y1, ox, oy, seedSalt) {
    const rowH = 16;
    for (let ty = y0 + 2, row = 0; ty < y1 - 2; ty += rowH, row++) {
      let tx = x0 + 2 - Math.floor(hash2(row, 11, seedSalt) * 14);
      let col = 0;
      while (tx < x1 - 2) {
        const wRoll = hash2(col, row, seedSalt + 19);
        const slabW = wRoll < 0.28 ? 16 : (wRoll < 0.72 ? 24 : 32);
        const sx = Math.max(x0 + 2, tx);
        const ex = Math.min(x1 - 2, tx + slabW - 1);
        const sy = ty;
        const ey = Math.min(y1 - 2, ty + rowH - 1);
        const tw = ex - sx, th = ey - sy;
        tx += slabW;
        col++;
        if (tw < 2 || th < 2) continue;

        const h = hash2(sx, sy, seedSalt + 17);
        const wet = fbm((sx + tw * 0.5) * 0.012, (sy + th * 0.5) * 0.012, seedSalt + 401);
        const mossN = fbm((sx + tw * 0.5) * 0.025, (sy + th * 0.5) * 0.025, seedSalt + 509);
        const px = Math.round(sx - ox), py = Math.round(sy - oy);

        tg.fillStyle = pickStoneTone(h, wet);
        tg.fillRect(px, py, tw, th);

        // Mortar seam (moss-filled in damp patches, weathered grey elsewhere)
        tg.fillStyle = mossN > 0.56 ? '#4e6827' : '#858b84';
        tg.fillRect(px, py, tw, 1);
        tg.fillRect(px, py, 1, th);

        if (h > 0.42 && wet < 0.62) {
          tg.fillStyle = '#d9dcd3';
          tg.fillRect(px + 1, py + 1, Math.max(1, tw - 2), 1);
        }

        // Per-slab diagonal fracture (never repeating identical stamps!)
        if (h > 0.73 && tw >= 12 && th >= 10) {
          const cx0 = px + 3 + Math.floor(hash2(sx, sy, seedSalt + 31) * (tw - 6));
          const cy0 = py + 2 + Math.floor(hash2(sx, sy, seedSalt + 47) * (th - 4));
          const dir = hash2(sx, sy, seedSalt + 61) < 0.5 ? 1 : -1;
          tg.strokeStyle = '#474d58'; tg.lineWidth = 1;
          tg.beginPath();
          tg.moveTo(cx0, py);
          tg.lineTo(cx0 + dir * 3, cy0);
          tg.lineTo(cx0 + dir * 6, py + th);
          tg.stroke();
        }
      }
    }
  }

  // Pattern 1: Authentic Japanese Ranbari (乱張り) irregular polygonal stone paving!
  function paintRanbariPattern(tg, x0, y0, x1, y1, ox, oy, seedSalt) {
    const cell = 24;
    const cols = Math.ceil((x1 - x0) / cell) + 2;
    const rows = Math.ceil((y1 - y0) / cell) + 2;
    // Generate jittered dual-grid vertices so adjacent stones interlock cleanly as organic irregular quads/polygons!
    const vx = new Float32Array((cols + 1) * (rows + 1));
    const vy = new Float32Array((cols + 1) * (rows + 1));
    for (let gy = 0; gy <= rows; gy++) {
      for (let gx = 0; gx <= cols; gx++) {
        const idx = gy * (cols + 1) + gx;
        const jx = (hash2(gx, gy, seedSalt + 131) - 0.5) * cell * 0.58;
        const jy = (hash2(gx, gy, seedSalt + 173) - 0.5) * cell * 0.58;
        vx[idx] = x0 - cell * 0.5 + gx * cell + jx;
        vy[idx] = y0 - cell * 0.5 + gy * cell + jy;
      }
    }
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const i00 = gy * (cols + 1) + gx;
        const i10 = i00 + 1;
        const i01 = i00 + (cols + 1);
        const i11 = i01 + 1;
        const cx = (vx[i00] + vx[i10] + vx[i01] + vx[i11]) * 0.25;
        const cy = (vy[i00] + vy[i10] + vy[i01] + vy[i11]) * 0.25;
        const h = hash2(gx, gy, seedSalt + 223);
        const wet = fbm(cx * 0.012, cy * 0.012, seedSalt + 401);
        const mossN = fbm(cx * 0.025, cy * 0.025, seedSalt + 509);

        // Occasional split diagonally into 2 triangular/trapezoidal filler stones for true crazy-paving variety!
        const split = h > 0.68;
        const drawPoly = (pts, shadeH) => {
          tg.beginPath();
          tg.moveTo(Math.round(pts[0][0] - ox), Math.round(pts[0][1] - oy));
          for (let k = 1; k < pts.length; k++) tg.lineTo(Math.round(pts[k][0] - ox), Math.round(pts[k][1] - oy));
          tg.closePath();
          tg.fillStyle = pickStoneTone(shadeH, wet);
          tg.fill();
          tg.strokeStyle = mossN > 0.54 ? '#4d6726' : '#7b827b';
          tg.lineWidth = mossN > 0.60 ? 2 : 1.2;
          tg.stroke();
        };

        const p00 = [vx[i00], vy[i00]], p10 = [vx[i10], vy[i10]];
        const p11 = [vx[i11], vy[i11]], p01 = [vx[i01], vy[i01]];
        if (split) {
          drawPoly([p00, p10, p11], h * 0.85);
          drawPoly([p00, p11, p01], (h * 1.37) % 1);
        } else {
          drawPoly([p00, p10, p11, p01], h);
        }
      }
    }
  }

  // Pattern 2: Ceremonial Kakuishi square flagstones with inset diagonal diamond stones!
  function paintKakuishiDiamondPattern(tg, x0, y0, x1, y1, ox, oy, seedSalt) {
    const s = 26;
    for (let ty = y0 + 2, row = 0; ty < y1 - 2; ty += s, row++) {
      for (let tx = x0 + 2, col = 0; tx < x1 - 2; tx += s, col++) {
        const px = Math.round(tx - ox), py = Math.round(ty - oy);
        const h = hash2(col, row, seedSalt + 271);
        const wet = fbm((tx + 13) * 0.012, (ty + 13) * 0.012, seedSalt + 401);
        const mossN = fbm((tx + 13) * 0.024, (ty + 13) * 0.024, seedSalt + 509);

        tg.fillStyle = pickStoneTone(h, wet);
        tg.fillRect(px, py, s - 1, s - 1);
        tg.fillStyle = mossN > 0.56 ? '#4e6827' : '#808780';
        tg.fillRect(px, py, s, 1);
        tg.fillRect(px, py, 1, s);
        if (h > 0.45 && wet < 0.62) {
          tg.fillStyle = '#dadcd4';
          tg.fillRect(px + 1, py + 1, s - 3, 1);
        }

        // Inset ceremonial diamond keystone at alternating grid intersections
        if (((row + col) & 1) === 0 && tx + s < x1 - 4 && ty + s < y1 - 4) {
          const dcx = px + s, dcy = py + s;
          const dh = hash2(col + 17, row + 31, seedSalt + 311);
          tg.beginPath();
          tg.moveTo(dcx, dcy - 7);
          tg.lineTo(dcx + 7, dcy);
          tg.lineTo(dcx, dcy + 7);
          tg.lineTo(dcx - 7, dcy);
          tg.closePath();
          tg.fillStyle = dh < 0.35 ? '#8e9590' : '#aab0a7';
          tg.fill();
          tg.strokeStyle = mossN > 0.58 ? '#4c6725' : '#656c6a';
          tg.lineWidth = 1;
          tg.stroke();
        }

        // Cracked slab corner fracture
        if (h > 0.72) {
          tg.strokeStyle = '#474e59'; tg.lineWidth = 1;
          tg.beginPath();
          tg.moveTo(px + 4, py + 2);
          tg.lineTo(px + 11, py + 12);
          tg.lineTo(px + 18, py + s - 2);
          tg.stroke();
        }
      }
    }
  }

  // Paint authentic weathered broken Japanese stone flagstones, mortar-seam cracks & organic noise moss veins on z=2!
  function paintRuinedStoneSurface(tg, x0, y0, x1, y1, ox, oy, seedSalt) {
    const patternKind = Math.abs(seedSalt) % 3;
    if (patternKind === 0) paintAshlarPattern(tg, x0, y0, x1, y1, ox, oy, seedSalt);
    else if (patternKind === 1) paintRanbariPattern(tg, x0, y0, x1, y1, ox, oy, seedSalt);
    else paintKakuishiDiamondPattern(tg, x0, y0, x1, y1, ox, oy, seedSalt);

    // 2) Continuous organic moss veins, cool sage lichen & fallen kawara slate shards (ZERO circular ovals!)
    const step = 3;
    for (let wy = y0 + 3; wy < y1 - 3; wy += step) {
      for (let wx = x0 + 3; wx < x1 - 3; wx += step) {
        const mn = fbm(wx * 0.027, wy * 0.027, seedSalt + 811);
        const ridge = Math.abs(vNoise(wx * 0.058, wy * 0.058, seedSalt + 919) - 0.5);
        const px = Math.round(wx - ox), py = Math.round(wy - oy);

        if (mn > 0.70 || (mn > 0.57 && ridge < 0.068)) {
          const hv = hash2(wx, wy, seedSalt + 997);
          if (mn > 0.76) tg.fillStyle = hv < 0.5 ? '#425b20' : '#58752b';
          else tg.fillStyle = hv < 0.45 ? '#5e7a2f' : (hv < 0.82 ? '#76943d' : '#94a27d'); // hints of pale ancient lichen!
          tg.fillRect(px, py, step, step);
        } else if (mn < 0.29) {
          // Clustered shattered dark-slate kawara roof tiles in dry debris pockets
          const sh = hash2(wx, wy, seedSalt + 123);
          if (sh < 0.065) {
            tg.fillStyle = '#323b4a'; tg.fillRect(px, py, 4, 2);
            tg.fillStyle = '#5a677e'; tg.fillRect(px, py, 2, 1);
          } else if (sh < 0.095) {
            // Crumbled pale plaster flake
            tg.fillStyle = '#dad8ce'; tg.fillRect(px, py, 2, 2);
          }
        }
      }
    }
  }

  // Paint weathered fractured stone & organic creeping moss along ruined terrace deck (z=4) — ZERO flat rectangles!
  function paintRuinedTerraceWear(tg, tx, ty, tw, th, seedSalt) {
    const step = 3;
    for (let ly = 2; ly < th - 2; ly += step) {
      for (let lx = 2; lx < tw - 2; lx += step) {
        const nearBorder = (lx < 15 || tw - lx < 15 || ly < 13 || th - ly < 13);
        const mn = fbm((tx + lx) * 0.036, (ty + ly) * 0.036, seedSalt + 641);
        const ridge = Math.abs(vNoise((tx + lx) * 0.07, (ty + ly) * 0.07, seedSalt + 757) - 0.5);
        if ((nearBorder && mn > 0.55) || mn > 0.73 || (mn > 0.60 && ridge < 0.055)) {
          const hv = hash2(tx + lx, ty + ly, seedSalt + 701);
          tg.fillStyle = hv < 0.42 ? '#4d6a25' : (hv < 0.82 ? '#6d8c37' : '#8ea072');
          tg.fillRect(tx + lx, ty + ly, step, step);
        }
      }
    }
    // Natural stepped fractures along terrace flagstone joints
    tg.strokeStyle = '#454c58'; tg.lineWidth = 1.2;
    tg.beginPath();
    tg.moveTo(tx + 22, ty + 4); tg.lineTo(tx + 22, ty + 20); tg.lineTo(tx + 38, ty + 20); tg.lineTo(tx + 44, ty + 34);
    tg.moveTo(tx + tw - 24, ty + th - 4); tg.lineTo(tx + tw - 24, ty + th - 20); tg.lineTo(tx + tw - 44, ty + th - 28);
    tg.stroke();
  }

  window.SakuraRuinFloor = {
    buildErosionField,
    applyErosionCutout,
    paintRuinedStoneSurface,
    paintRuinedTerraceWear,
  };
})();
