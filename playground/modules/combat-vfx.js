// ============================================================================
// Modular Pixel-Art & Katana-ZERO Inspired Combat VFX Engine
// Loaded by playground/index.html as window.SakuraCombatVFX
//
// Overhauls EVERY auto-attack, projectile, and active/passive skill animation:
//   - Bow Draw Charge Glint & Muzzle Release Crescent Flash
//   - Normal Samurai Arrow, Explosive Fire Arrow, Crystalline Frost Shard (with ribbon trails & fletching)
//   - Spirit Dragon Arrow (undulating sinusoidal spirit-serpent ribbon + horned dragon head + spirit rings)
//   - [R] Arrow Rain (rotating Onmyoji ground targeting seal, comet-tailed sky arrows, trembling stuck arrows)
//   - [F] Chronos Focus (temporal clockwork aura, orbiting time shards, subtle cyan edge vignette)
//   - [Shift] Shadow Dash (directional wind-shear burst & sakura vortex)
//   - Iaido 360° Katana Slash (3D depth-sorted tapered razor crescent wave with white steel core & sparks)
//   - Orbiting Sakura Blades (oriented pixel-art wakizashi blades with curved motion-blur arcs)
//   - Forked Chain Lightning (3-layer fractal forked lightning bolts + discharge star flares)
//   - Amaterasu Solar Pillar (celestial sunbeam + rising helical flame ribbons + ground sun mandala)
//   - Typed Shockwaves & Kitsune Fireball Explosions + Katana-ZERO Crit Cross-Slash Sparks
// ============================================================================
(function () {
  function hash1(n) {
    let x = (n | 0) ^ 0x9e3779b9;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }

  // Draw an oriented tapered diamond/lance polygon cleanly
  function fillTaperedStreak(g, x0, y0, x1, y1, halfW, col) {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) return;
    const nx = (-dy / len) * halfW, ny = (dx / len) * halfW;
    const mx = x0 + dx * 0.65, my = y0 + dy * 0.65;
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(mx + nx, my + ny);
    g.lineTo(x1, y1);
    g.lineTo(mx - nx, my - ny);
    g.closePath();
    g.fill();
  }

  // Draw crisp 4-point pixel star glint
  function drawStarGlint(g, cx, cy, r, col, coreCol) {
    const ix = Math.round(cx), iy = Math.round(cy);
    const ir = Math.max(2, Math.round(r));
    g.fillStyle = col;
    g.fillRect(ix - ir, iy, ir * 2 + 1, 1);
    g.fillRect(ix, iy - ir, 1, ir * 2 + 1);
    if (ir >= 4) {
      const d = Math.max(1, ir >> 1);
      g.fillRect(ix - d, iy - d, 1, 1);
      g.fillRect(ix + d, iy - d, 1, 1);
      g.fillRect(ix - d, iy + d, 1, 1);
      g.fillRect(ix + d, iy + d, 1, 1);
    }
    if (coreCol) {
      g.fillStyle = coreCol;
      g.fillRect(ix - 1, iy - 1, 3, 3);
    }
  }

  // =========================================================================
  // 1) BOW DRAW CHARGE GLINT (while shooting frames 1..2 right before release!)
  // =========================================================================
  function drawBowCharge(g, plSx, plSy, aimAng, camAngle, tilt, hiFrame, elemMode, tSec) {
    if (hiFrame < 1 || hiFrame > 2) return;
    const scrA = aimAng + camAngle;
    const bx = plSx + Math.cos(scrA) * 9;
    const by = plSy - 15 + Math.sin(scrA) * 9 * tilt;
    const pulse = hiFrame === 2 ? 1.0 : 0.6;
    const outerCol = elemMode === 'dragon' ? '#5ce1e6' : (elemMode === 'fire' ? '#ff8b3d' : (elemMode === 'frost' ? '#7fd4ff' : '#fae04b'));
    // Converging kinetic charge sparks pulling into arrowhead
    const r = hiFrame === 2 ? 4.5 : 7.5;
    for (let k = 0; k < 4; k++) {
      const ka = scrA + (k * Math.PI * 0.5) + tSec * 12;
      const sx = Math.round(bx + Math.cos(ka) * r);
      const sy = Math.round(by + Math.sin(ka) * r * 0.8);
      g.fillStyle = outerCol;
      g.fillRect(sx, sy, 1, 1);
    }
    drawStarGlint(g, bx, by, 3 + pulse * 3, outerCol, '#ffffff');
  }

  // =========================================================================
  // 2) MUZZLE RELEASE CRESCENT FLASH & SHADOW DASH BURSTS
  // =========================================================================
  function drawMuzzleFlashes(g, flashes, w2s, W, H, tilt, camAngle, shkX, shkY) {
    for (let i = 0; i < flashes.length; i++) {
      const mf = flashes[i];
      const [sx, sy] = w2s(mf.x, mf.y, W, H, tilt);
      const t = 1 - mf.life / mf.maxLife; // 0 -> 1
      const a = mf.angle + camAngle;
      const cx = sx + shkX, cy = sy - mf.z + shkY;
      const r = (mf.scale || 1) * (5 + t * 11);
      const alpha = Math.max(0, 1 - t * 1.05);

      g.save();
      g.globalAlpha = alpha;
      // Forward expanding bowstring energy crescent!
      g.strokeStyle = mf.c || '#fae04b';
      g.lineWidth = t < 0.45 ? 2.5 : 1.5;
      g.beginPath();
      g.ellipse(cx, cy, r, r * tilt, 0, a - 0.85, a + 0.85);
      g.stroke();

      // White-hot inner snap arc + forward thrust needle
      if (t < 0.65) {
        g.strokeStyle = '#ffffff';
        g.lineWidth = 1.2;
        g.beginPath();
        g.ellipse(cx, cy, r * 0.78, r * 0.78 * tilt, 0, a - 0.55, a + 0.55);
        g.stroke();
        const fx = Math.cos(a), fy = Math.sin(a) * tilt;
        fillTaperedStreak(g, cx - fx * 3, cy - fy * 3, cx + fx * (10 + t * 10), cy + fy * (10 + t * 10), 1.8 * (1 - t), '#ffffff');
      }
      g.restore();
    }
  }

  function drawDashBursts(g, bursts, w2s, W, H, tilt, camAngle, shkX, shkY) {
    for (let i = 0; i < bursts.length; i++) {
      const db = bursts[i];
      const [sx, sy] = w2s(db.x, db.y, W, H, tilt);
      const t = 1 - db.life / db.maxLife;
      const a = db.angle + camAngle; // direction player dashed
      const bx = -Math.cos(a), by = -Math.sin(a) * tilt;
      const cx = sx + shkX, cy = sy - 10 + shkY;

      g.save();
      g.globalAlpha = Math.max(0, 1 - t);
      // Expanding rear wind-cone shock ring
      const rx = 6 + t * 16;
      g.strokeStyle = db.c || '#f8b5c2';
      g.lineWidth = t < 0.4 ? 2.2 : 1.2;
      g.beginPath();
      g.ellipse(cx + bx * (t * 8), cy + by * (t * 8), rx, rx * tilt, 0, a + Math.PI - 1.15, a + Math.PI + 1.15);
      g.stroke();

      // 3 crisp wind-shear speed needles streaking behind the dash
      for (let k = -1; k <= 1; k++) {
        const perpX = -by * k * 5.5, perpY = bx * k * 4.5;
        const x0 = cx + perpX + bx * (2 + t * 5);
        const y0 = cy + perpY + by * (2 + t * 5);
        const len = 14 + (k === 0 ? 8 : 0);
        fillTaperedStreak(g, x0, y0, x0 + bx * len, y0 + by * len, k === 0 ? 1.6 : 1.0, k === 0 ? '#ffffff' : (db.c || '#f8b5c2'));
      }
      g.restore();
    }
  }

  // =========================================================================
  // 3) ALL ARROWS & SPIRIT DRAGON PROJECTILES (with tapered ribbon trails!)
  // =========================================================================
  function drawArrow(g, ar, qSx, qSy, w2s, W, H, tilt, camAngle, shkX, shkY, hasExplosive, hasFrost, tSec) {
    const a = ar.angle + camAngle;
    const fx = Math.cos(a), fy = Math.sin(a) * tilt;
    const flen = Math.hypot(fx, fy) || 1;
    const ux = fx / flen, uy = fy / flen;
    const nx = -uy, ny = ux; // perpendicular screen vector
    const px = qSx, py = qSy - ar.z;

    // Ground contact shadow directly underneath arrow
    g.fillStyle = ar.isDragon ? 'rgba(92, 225, 230, 0.24)' : 'rgba(19, 18, 35, 0.22)';
    const shW = ar.isDragon ? 10 : 4;
    g.beginPath();
    g.ellipse(qSx, qSy, shW, Math.max(1.5, shW * tilt * 0.5), 0, 0, Math.PI * 2);
    g.fill();

    // -----------------------------------------------------------------------
    // A) SPIRIT DRAGON ARROW (Sinusoidal undulating spirit-serpent + horned dragon head!)
    // -----------------------------------------------------------------------
    if (ar.isDragon) {
      const pts = [];
      if (ar.trail && ar.trail.length > 1) {
        for (let i = 0; i < ar.trail.length; i++) {
          const tp = ar.trail[i];
          const [tx, ty] = w2s(tp.x, tp.y, W, H, tilt);
          const frac = i / Math.max(1, ar.trail.length - 1); // 0=tail, 1=head
          const wave = Math.sin(tSec * 24 - i * 0.95) * (3.8 * (1 - frac * 0.55));
          pts.push([tx + shkX + nx * wave, ty - tp.z + shkY + ny * wave]);
        }
      } else {
        for (let k = 8; k >= 0; k--) {
          const dist = k * 3.8;
          const wave = Math.sin(tSec * 24 - k * 0.95) * (3.5 * (k / 8));
          pts.push([px - ux * dist + nx * wave, py - uy * dist + ny * wave]);
        }
      }
      pts.push([px, py]);

      // Outer deep azure glow ribbon -> mid cyan dragon scales -> pure white spirit spine
      const layers = [
        { col: 'rgba(38, 128, 255, 0.48)', w: 6.5 },
        { col: '#5ce1e6', w: 3.6 },
        { col: '#ffffff', w: 1.5 },
      ];
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (let li = 0; li < layers.length; li++) {
        g.strokeStyle = layers[li].col;
        g.lineWidth = layers[li].w;
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
        g.stroke();
      }

      // Helical orbiting spirit rings along the dragon wake
      for (let ri = 2; ri < pts.length - 1; ri += 3) {
        const rp = pts[ri];
        const ringR = 3.2 + (ri / pts.length) * 2.5;
        g.strokeStyle = 'rgba(220, 252, 255, 0.75)';
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(rp[0], rp[1], ringR * 0.55, ringR, Math.atan2(uy, ux), 0, Math.PI * 2);
        g.stroke();
      }

      // Stylized Pixel-Art Spirit Dragon Head (dark outline + horned cyan crest + glowing eyes + whiskers!)
      const hx = px + ux * 3, hy = py + uy * 3;
      g.fillStyle = '#0f2338';
      g.beginPath();
      g.moveTo(hx + ux * 5.5, hy + uy * 5.5);
      g.lineTo(hx - ux * 4 + nx * 4.5, hy - uy * 4 + ny * 4.5);
      g.lineTo(hx - ux * 6.5 + nx * 2.0, hy - uy * 6.5 + ny * 2.0);
      g.lineTo(hx - ux * 6.5 - nx * 2.0, hy - uy * 6.5 - ny * 2.0);
      g.lineTo(hx - ux * 4 - nx * 4.5, hy - uy * 4 - ny * 4.5);
      g.closePath();
      g.fill();

      g.fillStyle = '#8ef7ff';
      g.beginPath();
      g.moveTo(hx + ux * 4.2, hy + uy * 4.2);
      g.lineTo(hx - ux * 3 + nx * 3.2, hy - uy * 3 + ny * 3.2);
      g.lineTo(hx - ux * 5, hy - uy * 5);
      g.lineTo(hx - ux * 3 - nx * 3.2, hy - uy * 3 - ny * 3.2);
      g.closePath();
      g.fill();

      // Swept-back glowing dragon horns / whiskers
      g.strokeStyle = '#ffffff';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(hx - ux * 2 + nx * 2.5, hy - uy * 2 + ny * 2.5);
      g.lineTo(hx - ux * 8 + nx * 5.5, hy - uy * 8 + ny * 5.5);
      g.moveTo(hx - ux * 2 - nx * 2.5, hy - uy * 2 - ny * 2.5);
      g.lineTo(hx - ux * 8 - nx * 5.5, hy - uy * 8 - ny * 5.5);
      g.stroke();

      // Blazing golden spirit eye glint at snout
      drawStarGlint(g, hx + ux * 1.5, hy + uy * 1.5, 4, '#fae04b', '#ffffff');
      return;
    }

    // -----------------------------------------------------------------------
    // B) FROST SHARD / EXPLOSIVE FIRE ARROW / SAMURAI FEATHERED ARROW
    // -----------------------------------------------------------------------
    const isFrost = !!ar.isFrostShard || (!hasExplosive && hasFrost);
    const isFire = !ar.isFrostShard && hasExplosive;

    // 1) Multi-segment fading energy ribbon trail from world trail history
    if (ar.trail && ar.trail.length > 1) {
      const nPts = ar.trail.length;
      for (let i = 0; i < nPts - 1; i++) {
        const p0 = ar.trail[i], p1 = ar.trail[i + 1];
        const [x0, y0] = w2s(p0.x, p0.y, W, H, tilt);
        const [x1, y1] = w2s(p1.x, p1.y, W, H, tilt);
        const f = (i + 1) / nPts;
        g.strokeStyle = isFrost
          ? `rgba(127, 212, 255, ${(f * 0.72).toFixed(2)})`
          : (isFire
            ? (f > 0.6 ? `rgba(255, 224, 102, ${(f * 0.85).toFixed(2)})` : `rgba(255, 96, 46, ${(f * 0.75).toFixed(2)})`)
            : `rgba(255, 245, 200, ${(f * 0.62).toFixed(2)})`);
        g.lineWidth = isFire ? (0.8 + f * 2.2) : (0.7 + f * 1.5);
        g.beginPath();
        g.moveTo(x0 + shkX, y0 - p0.z + shkY);
        g.lineTo(x1 + shkX, y1 - p1.z + shkY);
        g.stroke();
      }
    } else {
      // Fallback wind streak (used in Studio VFX preview!)
      const tailLen = isFire ? 18 : 14;
      fillTaperedStreak(
        g, px - ux * tailLen, py - uy * tailLen, px, py,
        isFire ? 2.4 : 1.5,
        isFrost ? 'rgba(127,212,255,0.68)' : (isFire ? 'rgba(255,112,48,0.78)' : 'rgba(255,244,196,0.65)')
      );
    }

    if (isFrost) {
      // Crystalline Pixel-Art Icicle Spear (dark navy outline + cyan body + ice-white facet!)
      const tipX = px + ux * 4.5, tipY = py + uy * 4.5;
      const tailX = px - ux * 7.5, tailY = py - uy * 7.5;
      g.fillStyle = '#142947';
      g.beginPath();
      g.moveTo(tipX + ux * 1.2, tipY + uy * 1.2);
      g.lineTo(px + nx * 3.0, py + ny * 3.0);
      g.lineTo(tailX - ux * 1.0, tailY - uy * 1.0);
      g.lineTo(px - nx * 3.0, py - ny * 3.0);
      g.closePath();
      g.fill();

      g.fillStyle = '#6fd2ff';
      g.beginPath();
      g.moveTo(tipX, tipY);
      g.lineTo(px + nx * 1.8, py + ny * 1.8);
      g.lineTo(tailX, tailY);
      g.lineTo(px - nx * 1.8, py - ny * 1.8);
      g.closePath();
      g.fill();

      g.strokeStyle = '#ffffff'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(tailX + ux * 2, tailY + uy * 2); g.lineTo(tipX, tipY); g.stroke();
      drawStarGlint(g, tipX - ux, tipY - uy, 2.5, '#bef2ff', '#ffffff');
    } else {
      // Crisp Oriented Samurai Arrow (outline + bamboo shaft + feathered yabane fletching + broadhead!)
      const tipX = px + ux * 4, tipY = py + uy * 4;
      const tailX = px - ux * 8.5, tailY = py - uy * 8.5;

      // Dark outline for instant readability over bright courtyard stone & snow/sand
      g.strokeStyle = '#131223';
      g.lineWidth = 3.0;
      g.beginPath(); g.moveTo(tailX, tailY); g.lineTo(tipX, tipY); g.stroke();

      // Bamboo shaft (or glowing ember shaft for explosive arrows)
      g.strokeStyle = isFire ? '#ff9d42' : '#d6b26e';
      g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(tailX, tailY); g.lineTo(tipX, tipY); g.stroke();

      // Twin Feathered Fletching (crimson/white yabane feathers at tail!)
      const fletchX = tailX + ux * 2.2, fletchY = tailY + uy * 2.2;
      g.strokeStyle = isFire ? '#ff5238' : '#f45b69';
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(fletchX, fletchY); g.lineTo(tailX - ux * 1.5 + nx * 2.5, tailY - uy * 1.5 + ny * 2.5);
      g.moveTo(fletchX, fletchY); g.lineTo(tailX - ux * 1.5 - nx * 2.5, tailY - uy * 1.5 - ny * 2.5);
      g.stroke();

      // Razor steel broadhead (or blazing fire-talisman tip!)
      g.fillStyle = isFire ? '#ff5238' : '#e6eef8';
      g.beginPath();
      g.moveTo(tipX + ux * 2.5, tipY + uy * 2.5);
      g.lineTo(tipX - ux * 2.0 + nx * 2.2, tipY - uy * 2.0 + ny * 2.2);
      g.lineTo(tipX - ux * 2.0 - nx * 2.2, tipY - uy * 2.0 - ny * 2.2);
      g.closePath();
      g.fill();

      if (isFire) {
        // Flickering fire aura at arrowhead
        const fl = 2.6 + Math.sin(tSec * 38 + ar.x) * 0.9;
        drawStarGlint(g, tipX, tipY, fl + 1.5, '#ff7b36', '#fff6b0');
      } else {
        g.fillStyle = '#ffffff';
        g.fillRect(Math.round(tipX), Math.round(tipY), 2, 2);
      }
    }
  }

  // =========================================================================
  // 4) ACTIVE SKILL [R]: ARROW RAIN TARGETING SEAL, FALLING ARROWS & STUCK ARROWS
  // =========================================================================
  function drawRainZones(g, rainZones, w2s, W, H, tilt, shkX, shkY, tSec) {
    for (let i = 0; i < rainZones.length; i++) {
      const rz = rainZones[i];
      const [sx, sy] = w2s(rz.x, rz.y, W, H, tilt);
      const cx = sx + shkX, cy = sy + shkY;
      const frac = Math.min(1, rz.life / 0.35);
      const alpha = Math.min(1, frac) * 0.72;
      const r = rz.r;
      const spin = tSec * 1.8;

      g.save();
      g.globalAlpha = alpha;
      // Warm sacred ground glow
      g.fillStyle = 'rgba(250, 210, 75, 0.12)';
      g.beginPath(); g.ellipse(cx, cy, r, r * tilt, 0, 0, Math.PI * 2); g.fill();

      // Rotating dashed Onmyoji outer ring
      g.strokeStyle = '#fae04b';
      g.lineWidth = 1.5;
      g.setLineDash([5, 4]);
      g.beginPath(); g.ellipse(cx, cy, r, r * tilt, 0, spin, spin + Math.PI * 2); g.stroke();
      g.setLineDash([]);

      // Inner geometric ritual ring + 8 rotating cardinal spokes
      g.strokeStyle = 'rgba(255, 168, 66, 0.75)';
      g.lineWidth = 1;
      g.beginPath(); g.ellipse(cx, cy, r * 0.68, r * 0.68 * tilt, 0, 0, Math.PI * 2); g.stroke();
      for (let k = 0; k < 8; k++) {
        const ka = spin * -0.7 + (k * Math.PI) / 4;
        const x0 = cx + Math.cos(ka) * r * 0.68, y0 = cy + Math.sin(ka) * r * 0.68 * tilt;
        const x1 = cx + Math.cos(ka) * r * 0.96, y1 = cy + Math.sin(ka) * r * 0.96 * tilt;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      }
      g.restore();
    }
  }

  function drawSkyArrows(g, skyArrows, w2s, W, H, tilt, shkX, shkY) {
    for (let i = 0; i < skyArrows.length; i++) {
      const sa0 = skyArrows[i];
      const [sx, sy] = w2s(sa0.x, sa0.y, W, H, tilt);
      const gx = sx + shkX, gy = sy + shkY;
      // Slight diagonal plunge angle for kinetic anime impact!
      const skewX = sa0.z * 0.14;
      const px = gx + skewX, py = gy - sa0.z;

      // Ground impact telegraph dot (grows sharper & brighter as arrow nears impact!)
      const near = Math.max(0, 1 - sa0.z / 160);
      const dotR = 2 + near * 4.5;
      g.fillStyle = `rgba(255, 166, 56, ${(0.25 + near * 0.55).toFixed(2)})`;
      g.beginPath(); g.ellipse(gx, gy, dotR, dotR * tilt, 0, 0, Math.PI * 2); g.fill();
      if (near > 0.55) {
        g.strokeStyle = '#fff3a6'; g.lineWidth = 1;
        g.beginPath(); g.ellipse(gx, gy, dotR + 1.5, (dotR + 1.5) * tilt, 0, 0, Math.PI * 2); g.stroke();
      }

      // Comet speed-tail streaking downward behind plunging arrow
      const tx = px + 3.5, ty = py - 24;
      fillTaperedStreak(g, tx, ty, px, py, 2.2, 'rgba(255, 148, 52, 0.58)');
      fillTaperedStreak(g, px + 2.2, py - 16, px, py, 1.3, '#fae04b');

      // Crisp arrow shaft + crimson fletching + white-hot tip
      g.strokeStyle = '#131223'; g.lineWidth = 2.6;
      g.beginPath(); g.moveTo(px + 1.6, py - 11); g.lineTo(px, py); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(px + 1.4, py - 10); g.lineTo(px, py); g.stroke();
      // Fletching V
      g.fillStyle = '#ff4f62';
      g.fillRect(Math.round(px), Math.round(py - 11), 3, 2);
      drawStarGlint(g, px, py, 2.5, '#fae04b', '#ffffff');
    }
  }

  function drawStuckArrows(g, stuckArrows, w2s, W, H, tilt, shkX, shkY, tSec) {
    for (let i = 0; i < stuckArrows.length; i++) {
      const st = stuckArrows[i];
      const [sx, sy] = w2s(st.x, st.y, W, H, tilt);
      const gx = sx + shkX, gy = sy + shkY;
      const alpha = Math.min(1, st.life / 0.22);
      const vib = st.life > st.maxLife - 0.14 ? Math.sin(tSec * 75 + st.x) * 1.4 : 0;
      g.save();
      g.globalAlpha = alpha;
      g.fillStyle = 'rgba(19,18,35,0.28)';
      g.fillRect(Math.round(gx - 2), Math.round(gy), 4, 2);
      g.strokeStyle = '#131223'; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + 2.5 + vib, gy - 9); g.stroke();
      g.strokeStyle = '#d9b56c'; g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + 2.5 + vib, gy - 9); g.stroke();
      g.fillStyle = '#ff5768';
      g.fillRect(Math.round(gx + 1.5 + vib), Math.round(gy - 10), 2, 2);
      g.restore();
    }
  }

  // =========================================================================
  // 5) ACTIVE SKILL [F]: KATANA ZERO CHRONOS FOCUS AURA & TIME VIGNETTE
  // =========================================================================
  function drawChronoAura(g, plSx, plSy, tilt, chronoTimer, tSec) {
    if (chronoTimer <= 0) return;
    const pulse = 1 + Math.sin(tSec * 10) * 0.08;
    const r = 24 * pulse;
    const spin = tSec * 2.2;

    g.save();
    // Soft glowing temporal dial under feet
    g.fillStyle = 'rgba(92, 225, 230, 0.10)';
    g.beginPath(); g.ellipse(plSx, plSy, r, r * tilt, 0, 0, Math.PI * 2); g.fill();

    // Outer cyan clockwork ring
    g.strokeStyle = 'rgba(92, 225, 230, 0.72)';
    g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(plSx, plSy, r, r * tilt, 0, 0, Math.PI * 2); g.stroke();

    // 12 clock ticks around the chronos dial
    g.strokeStyle = 'rgba(220, 252, 255, 0.65)';
    g.lineWidth = 1;
    for (let k = 0; k < 12; k++) {
      const ka = spin * 0.35 + (k * Math.PI * 2) / 12;
      const inner = (k % 3 === 0) ? 0.72 : 0.84;
      g.beginPath();
      g.moveTo(plSx + Math.cos(ka) * r * inner, plSy + Math.sin(ka) * r * inner * tilt);
      g.lineTo(plSx + Math.cos(ka) * r, plSy + Math.sin(ka) * r * tilt);
      g.stroke();
    }

    // Sweeping temporal clock hand
    const handA = -tSec * 5.2;
    g.strokeStyle = '#ffffff';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(plSx, plSy);
    g.lineTo(plSx + Math.cos(handA) * r * 0.72, plSy + Math.sin(handA) * r * 0.72 * tilt);
    g.stroke();

    // 4 orbiting diamond chronos shards
    for (let k = 0; k < 4; k++) {
      const ka = spin + k * Math.PI * 0.5;
      const sx = plSx + Math.cos(ka) * (r + 3.5);
      const sy = plSy - 6 + Math.sin(ka) * (r + 3.5) * tilt + Math.sin(tSec * 8 + k) * 2;
      drawStarGlint(g, sx, sy, 2.5, '#5ce1e6', '#ffffff');
    }
    g.restore();
  }

  function drawChronoScreenOverlay(g, W, H, chronoTimer, tSec) {
    if (chronoTimer <= 0) return;
    const strength = Math.min(1, chronoTimer / 0.45);
    g.save();
    // Subtle Katana ZERO cyan-indigo border vignette (clean, zero FPS cost!)
    const edge = 26;
    const a = (0.18 * strength).toFixed(3);
    g.fillStyle = `rgba(38, 198, 224, ${a})`;
    g.fillRect(0, 0, W, 3);
    g.fillRect(0, H - 3, W, 3);
    g.fillRect(0, 0, 3, H);
    g.fillRect(W - 3, 0, 3, H);
    // Faint rolling horizontal time-scanline bar
    const scanY = Math.floor((tSec * 90) % H);
    g.fillStyle = `rgba(140, 245, 255, ${(0.07 * strength).toFixed(3)})`;
    g.fillRect(0, scanY, W, 2);
    g.fillRect(0, (scanY + (H >> 1)) % H, W, 1);
    g.restore();
  }

  // =========================================================================
  // 6) IAIDO 360° KATANA CRESCENT SLASH (Depth-Sorted Tapered Razor Wave!)
  // =========================================================================
  function drawIaidoSlashArc(g, sr, sx, sy, curR, a0, a1, tilt) {
    const prog = 1 - sr.life / sr.maxLife; // 0 -> 1
    // Sweep front orbits smoothly across 360° while tapering behind it!
    const leadAng = (sr.startAng || 0) + prog * Math.PI * 2.15;
    const mid = (a0 + a1) * 0.5;
    // Angular distance behind leadAng (0 at leading blade tip -> 2π at tail)
    let lag = (leadAng - mid) % (Math.PI * 2);
    if (lag < 0) lag += Math.PI * 2;
    const tailFade = Math.max(0.18, 1.0 - lag / (Math.PI * 1.85));
    const lifeFade = Math.max(0, 1.0 - Math.max(0, prog - 0.55) / 0.45);

    const outerR = curR + (4.5 * tailFade * (1 - prog * 0.4));
    const innerR = Math.max(2, curR - (5.5 * tailFade * (1 - prog * 0.35)));
    const cy = sy - 12;

    g.save();
    g.globalAlpha = lifeFade;

    // Filled tapered crescent ribbon slice (outer arc forward -> inner arc backward)
    const steps = 4;
    const buildCrescent = (rOut, rIn) => {
      g.beginPath();
      for (let i = 0; i <= steps; i++) {
        const ang = a0 + ((a1 - a0) * i) / steps;
        const x = sx + Math.cos(ang) * rOut;
        const y = cy + Math.sin(ang) * rOut * tilt;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      for (let i = steps; i >= 0; i--) {
        const ang = a0 + ((a1 - a0) * i) / steps;
        const x = sx + Math.cos(ang) * rIn;
        const y = cy + Math.sin(ang) * rIn * tilt;
        g.lineTo(x, y);
      }
      g.closePath();
    };

    // 1) Deep Katana-ZERO crimson-ink shadow edge
    buildCrescent(outerR + 1.2, Math.max(1, innerR - 0.8));
    g.fillStyle = prog < 0.35 ? 'rgba(65, 16, 40, 0.72)' : 'rgba(130, 24, 56, 0.55)';
    g.fill();

    // 2) Vivid sakura-crimson plasma body
    buildCrescent(outerR, innerR);
    g.fillStyle = prog < 0.3 ? '#ff9db4' : '#ff4d6d';
    g.fill();

    // 3) Razor-sharp pure-white steel cutting edge along outer rim!
    g.strokeStyle = '#ffffff';
    g.lineWidth = tailFade > 0.65 ? 2.2 : 1.2;
    g.beginPath();
    g.ellipse(sx, cy, outerR - 0.5, (outerR - 0.5) * tilt, 0, a0, a1);
    g.stroke();

    // 4) Golden inner resonance streak
    g.strokeStyle = '#fae04b';
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(sx, cy, (outerR + innerR) * 0.5, (outerR + innerR) * 0.5 * tilt, 0, a0, a1);
    g.stroke();

    // Leading blade-tip star spark!
    if (lag < 0.82 && prog < 0.78) {
      const tipX = sx + Math.cos(mid) * outerR;
      const tipY = cy + Math.sin(mid) * outerR * tilt;
      drawStarGlint(g, tipX, tipY, 4.5, '#fae04b', '#ffffff');
    }
    g.restore();
  }

  // =========================================================================
  // 7) ORBITING SAKURA BLADES (Oriented Wakizashi + Curved Motion Trail!)
  // =========================================================================
  function drawBladeRingSeg(g, sx, sy, r, a0, a1, tilt, back) {
    g.strokeStyle = back ? 'rgba(248, 181, 194, 0.16)' : 'rgba(255, 206, 218, 0.28)';
    g.lineWidth = 1;
    g.setLineDash([4, 4]);
    g.beginPath();
    g.ellipse(sx, sy - 14, r, r * tilt, 0, a0, a1);
    g.stroke();
    g.setLineDash([]);
  }

  function drawSakuraBlade(g, plSx, plSy, orbitR, angle, camAngle, tilt) {
    const scrA = angle + camAngle;
    const cy0 = plSy - 14;
    const bx = plSx + Math.cos(scrA) * orbitR;
    const by = cy0 + Math.sin(scrA) * orbitR * tilt;

    // Curved sakura-pink motion-blur crescent trailing ~38° behind the blade!
    for (let k = 0; k < 3; k++) {
      const t0 = scrA - (k + 1) * 0.22;
      const t1 = scrA - k * 0.22;
      g.strokeStyle = k === 0 ? 'rgba(255, 255, 255, 0.72)' : (k === 1 ? 'rgba(255, 162, 186, 0.55)' : 'rgba(240, 102, 138, 0.30)');
      g.lineWidth = 3.2 - k * 0.9;
      g.beginPath();
      g.ellipse(plSx, cy0, orbitR, orbitR * tilt, 0, t0, t1);
      g.stroke();
    }

    // Tangent direction of blade travel on screen
    const tx = -Math.sin(scrA);
    const ty = Math.cos(scrA) * tilt;
    const tl = Math.hypot(tx, ty) || 1;
    const ux = tx / tl, uy = ty / tl;
    const nx = -uy, ny = ux;

    // Pixel-Art Oriented Wakizashi Spirit Blade (dark outline + gleaming white-steel edge + sakura hilt!)
    const tipX = bx + ux * 6.5, tipY = by + uy * 6.5;
    const hiltX = bx - ux * 5.0, hiltY = by - uy * 5.0;

    // Dark outline
    g.fillStyle = '#2b1224';
    g.beginPath();
    g.moveTo(tipX + ux * 1.4, tipY + uy * 1.4);
    g.lineTo(bx + nx * 3.0, by + ny * 3.0);
    g.lineTo(hiltX - ux * 1.4, hiltY - uy * 1.4);
    g.lineTo(bx - nx * 2.6, by - ny * 2.6);
    g.closePath();
    g.fill();

    // Gleaming curved steel body
    g.fillStyle = '#f8b5c2';
    g.beginPath();
    g.moveTo(tipX, tipY);
    g.lineTo(bx + nx * 1.8, by + ny * 1.8);
    g.lineTo(hiltX + ux * 1.5, hiltY + uy * 1.5);
    g.lineTo(bx - nx * 1.2, by - ny * 1.2);
    g.closePath();
    g.fill();

    // Pure white razor edge
    g.strokeStyle = '#ffffff'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(hiltX + ux * 2, hiltY + uy * 2); g.lineTo(tipX, tipY); g.stroke();

    // Golden tsuba guard & pink silk hilt
    g.fillStyle = '#fae04b';
    g.fillRect(Math.round(hiltX + ux * 1.2 - 1), Math.round(hiltY + uy * 1.2 - 1), 2, 2);
  }

  // =========================================================================
  // 8) FORKED CHAIN LIGHTNING (Multi-Segment Fractal Bolts + Discharge Flares!)
  // =========================================================================
  function drawLightnings(g, lightnings, w2s, W, H, tilt, shkX, shkY, tSec) {
    const nLn = lightnings.length;
    if (!nLn) return;
    const flick = Math.floor(tSec * 28);
    const drawForks = nLn <= 16;
    const prevCap = g.lineCap, prevJoin = g.lineJoin;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (let i = 0; i < nLn; i++) {
      const ln = lightnings[i];
      const a = w2s(ln.x1, ln.y1, W, H, tilt);
      const b = w2s(ln.x2, ln.y2, W, H, tilt);
      const ax = a[0] + shkX, ay = a[1] - 14 + shkY;
      const bx = b[0] + shkX, by = b[1] - 14 + shkY;
      if ((ax < -30 && bx < -30) || (ax > W + 30 && bx > W + 30) || (ay < -30 && by < -30) || (ay > H + 30 && by > H + 30)) continue;
      const dx = bx - ax, dy = by - ay;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = -dy / dist, ny = dx / dist;
      const segs = Math.max(4, Math.min(nLn > 18 ? 6 : 9, Math.round(dist / 14)));
      const seedBase = ((ln.seed || (i * 97 + Math.round(ln.x1))) + flick * 13) | 0;
      const alpha = Math.min(1, ln.life / 0.08);

      const pts = [[ax, ay]];
      for (let s = 1; s < segs; s++) {
        const frac = s / segs;
        const env = Math.sin(frac * Math.PI);
        const jitter = (hash1(seedBase + s * 31) - 0.5) * Math.min(22, dist * 0.34) * env;
        pts.push([ax + dx * frac + nx * jitter, ay + dy * frac + ny * jitter]);
      }
      pts.push([bx, by]);

      // Build 1-2 short crackling side-branch forks (auto-simplified when >16 simultaneous bolts fill screen!)
      const forks = [];
      if (drawForks) {
        for (let f = 0; f < 2; f++) {
          const idx = 1 + Math.floor(hash1(seedBase + 101 + f * 43) * Math.max(1, segs - 2));
          if (idx >= pts.length - 1) continue;
          const p = pts[idx];
          const side = hash1(seedBase + 211 + f * 17) < 0.5 ? 1 : -1;
          const flen = 8 + hash1(seedBase + 307 + f * 29) * 10;
          const mx = p[0] + (dx / dist) * flen * 0.45 + nx * side * flen * 0.65;
          const my = p[1] + (dy / dist) * flen * 0.45 + ny * side * flen * 0.65;
          const ex = mx + (dx / dist) * flen * 0.4 + nx * side * flen * 0.5;
          const ey = my + (dy / dist) * flen * 0.4 + ny * side * flen * 0.5;
          forks.push([p, [mx, my], [ex, ey]]);
        }
      }

      g.globalAlpha = alpha;
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) g.lineTo(pts[k][0], pts[k][1]);
      for (let f = 0; f < forks.length; f++) {
        const fk = forks[f];
        g.moveTo(fk[0][0], fk[0][1]);
        g.lineTo(fk[1][0], fk[1][1]);
        g.lineTo(fk[2][0], fk[2][1]);
      }

      // 3-layer electric bloom reusing the SINGLE built path (3x fewer path rebuilds!)
      g.strokeStyle = 'rgba(58, 124, 255, 0.58)'; g.lineWidth = 4.2; g.stroke();
      g.strokeStyle = '#7fd4ff'; g.lineWidth = 2.1; g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 1.0; g.stroke();

      // Electric discharge star flares at enemy nodes
      drawStarGlint(g, ax, ay, 4.5, '#7fd4ff', '#ffffff');
      drawStarGlint(g, bx, by, 5.5, '#7fd4ff', '#ffffff');
    }
    g.globalAlpha = 1;
    g.lineCap = prevCap;
    g.lineJoin = prevJoin;
  }

  // =========================================================================
  // 9) AMATERASU SOLAR PILLAR (Celestial Sunbeam + Helical Flame Ribbons + Sun Mandala!)
  // =========================================================================
  function drawSolarStrikes(g, solarStrikes, w2s, W, H, tilt, shkX, shkY, tSec) {
    for (let i = 0; i < solarStrikes.length; i++) {
      const ss = solarStrikes[i];
      const [sx, sy] = w2s(ss.x, ss.y, W, H, tilt);
      const cx = sx + shkX, cy = sy + shkY;
      const frac = ss.life / ss.maxLife; // 1 -> 0
      const prog = 1 - frac;
      // Snappy flare-up then graceful taper
      const widthEnv = prog < 0.14 ? (0.4 + (prog / 0.14) * 0.85) : Math.pow(frac, 0.65);
      const halfW = Math.max(2, ss.r * 0.42 * widthEnv);

      g.save();
      // 1) Ground Amaterasu Sun Crest Mandala!
      const gr = ss.r * (0.45 + 0.55 * Math.min(1, prog * 2.5));
      g.globalAlpha = Math.min(1, frac * 1.4);
      g.fillStyle = 'rgba(255, 118, 42, 0.28)';
      g.beginPath(); g.ellipse(cx, cy, gr, gr * tilt, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255, 240, 148, 0.55)';
      g.beginPath(); g.ellipse(cx, cy, gr * 0.52, gr * 0.52 * tilt, 0, 0, Math.PI * 2); g.fill();

      // 8 radiating triangular sun-crest rays around the seared ground ring
      g.fillStyle = '#fae04b';
      for (let k = 0; k < 8; k++) {
        const ka = prog * 1.4 + (k * Math.PI) / 4;
        const aL = ka - 0.14, aR = ka + 0.14;
        g.beginPath();
        g.moveTo(cx + Math.cos(ka) * (gr + 6), cy + Math.sin(ka) * (gr + 6) * tilt);
        g.lineTo(cx + Math.cos(aL) * gr * 0.82, cy + Math.sin(aL) * gr * 0.82 * tilt);
        g.lineTo(cx + Math.cos(aR) * gr * 0.82, cy + Math.sin(aR) * gr * 0.82 * tilt);
        g.closePath();
        g.fill();
      }

      // 2) Sky-to-ground celestial solar beam (3 nested glowing columns)
      const topY = Math.max(0, cy - 260);
      g.fillStyle = 'rgba(255, 118, 42, 0.34)';
      g.fillRect(Math.round(cx - halfW * 1.35), topY, Math.round(halfW * 2.7), Math.round(cy - topY));
      g.fillStyle = 'rgba(255, 224, 95, 0.58)';
      g.fillRect(Math.round(cx - halfW * 0.82), topY, Math.round(halfW * 1.64), Math.round(cy - topY));
      g.fillStyle = 'rgba(255, 255, 255, 0.88)';
      g.fillRect(Math.round(cx - halfW * 0.34), topY, Math.max(2, Math.round(halfW * 0.68)), Math.round(cy - topY));

      // 3) Twin counter-spiraling helical flame ribbons rising up the pillar!
      const helixH = Math.min(220, cy - topY);
      for (let strand = 0; strand < 2; strand++) {
        g.strokeStyle = strand === 0 ? '#ff6a32' : '#fff4a8';
        g.lineWidth = strand === 0 ? 2.2 : 1.3;
        g.beginPath();
        for (let step = 0; step <= 20; step++) {
          const u = step / 20;
          const hy = cy - u * helixH;
          const phase = u * Math.PI * 5 - tSec * 18 + strand * Math.PI;
          const hx = cx + Math.sin(phase) * (halfW * 1.25 + 3);
          if (step === 0) g.moveTo(hx, hy); else g.lineTo(hx, hy);
        }
        g.stroke();
      }

      // Impact flash star right at base
      drawStarGlint(g, cx, cy - 4, halfW * 1.3 + 4, '#ff9d42', '#ffffff');
      g.restore();
    }
  }

  // =========================================================================
  // 10) TYPED ANIMATED SHOCKWAVES & KITSUNE FIREBALL EXPLOSIONS (Batched!)
  // =========================================================================
  function drawShockwaves(g, shockwaves, w2s, W, H, tilt, shkX, shkY) {
    const nSw = shockwaves.length;
    if (!nSw) return;
    const nPuffs = nSw > 10 ? 5 : 7;
    for (let i = 0; i < nSw; i++) {
      const s = shockwaves[i];
      const [sx, sy] = w2s(s.x, s.y, W, H, tilt);
      const cx = sx + shkX, cy = sy + shkY;
      const cullR = s.maxR + 28;
      if (cx < -cullR || cx > W + cullR || cy < -cullR || cy > H + cullR) continue;
      const frac = Math.max(0, s.life / s.maxLife); // 1 -> 0
      const prog = 1 - frac;
      const kind = s.kind || (s.c === '#ff5238' || s.c === '#ff7b47' ? 'fire' : (s.c === '#5ce1e6' ? 'chrono' : 'shrine'));

      if (kind === 'fire') {
        // Multi-puff Pixel-Art Fiery Kitsune / Explosive Blast (batched into 3 fills instead of 21!)
        g.globalAlpha = Math.min(1, frac * 1.45);
        g.strokeStyle = prog < 0.35 ? '#fff3a8' : '#ff6a32';
        g.lineWidth = prog < 0.35 ? 2.5 : 1.5;
        g.beginPath(); g.ellipse(cx, cy, s.r, s.r * tilt, 0, 0, Math.PI * 2); g.stroke();

        const dist = s.r * (0.28 + prog * 0.42);
        const pr = Math.max(2, (s.maxR * 0.24) * (1 - prog * 0.55));
        const baseY = cy - 6 - prog * 9;
        const rimR = pr + 1.2;
        const pxs = [], pys = [];
        for (let k = 0; k < nPuffs; k++) {
          const ka = (k * Math.PI * 2) / nPuffs + (s.x * 0.13);
          pxs.push(cx + Math.cos(ka) * dist);
          pys.push(baseY + Math.sin(ka) * dist * tilt);
        }
        // Pass 1: Dark crimson smoke rims (1 batched fill!)
        g.fillStyle = '#38131d';
        g.beginPath();
        for (let k = 0; k < nPuffs; k++) { g.moveTo(pxs[k] + rimR, pys[k]); g.arc(pxs[k], pys[k], rimR, 0, Math.PI * 2); }
        g.fill();
        // Pass 2: Orange fireball bodies (1 batched fill!)
        g.fillStyle = prog < 0.45 ? '#ff7d36' : '#d93829';
        g.beginPath();
        for (let k = 0; k < nPuffs; k++) { g.moveTo(pxs[k] + pr, pys[k]); g.arc(pxs[k], pys[k], pr, 0, Math.PI * 2); }
        g.fill();
        // Pass 3: Yellow-white hot cores (1 batched fill!)
        if (prog < 0.55) {
          const cr = pr * 0.52, off = pr * 0.18;
          g.fillStyle = '#fff19c';
          g.beginPath();
          for (let k = 0; k < nPuffs; k++) { g.moveTo(pxs[k] - off + cr, pys[k] - off); g.arc(pxs[k] - off, pys[k] - off, cr, 0, Math.PI * 2); }
          g.fill();
        }
        if (prog < 0.35) {
          drawStarGlint(g, cx, cy - 8, s.maxR * 0.42 * (1 - prog), '#fae04b', '#ffffff');
        }
      } else if (kind === 'chrono') {
        g.globalAlpha = frac;
        g.strokeStyle = '#5ce1e6';
        g.lineWidth = 2.4;
        g.beginPath(); g.ellipse(cx, cy, s.r, s.r * tilt, 0, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = '#ffffff';
        g.lineWidth = 1.2;
        g.beginPath(); g.ellipse(cx, cy, s.r * 0.82, s.r * 0.82 * tilt, 0, 0, Math.PI * 2); g.stroke();
        for (let k = 0; k < 4; k++) {
          const ka = prog * 1.2 + k * Math.PI * 0.5;
          drawStarGlint(g, cx + Math.cos(ka) * s.r, cy + Math.sin(ka) * s.r * tilt, 3, '#5ce1e6', '#ffffff');
        }
      } else {
        g.globalAlpha = frac;
        g.strokeStyle = s.c || '#fae04b';
        g.lineWidth = 2.2;
        g.beginPath(); g.ellipse(cx, cy, s.r, s.r * tilt, 0, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = '#ffffff';
        g.lineWidth = 1;
        g.beginPath(); g.ellipse(cx, cy, s.r * 0.78, s.r * 0.78 * tilt, 0, 0, Math.PI * 2); g.stroke();
        if (prog < 0.6) {
          g.fillStyle = '#ffffff';
          for (let k = 0; k < 4; k++) {
            const ka = k * Math.PI * 0.5 + 0.78;
            const px = Math.round(cx + Math.cos(ka) * s.r);
            const py = Math.round(cy + Math.sin(ka) * s.r * tilt - prog * 10);
            g.fillRect(px, py, 1, 3);
          }
        }
      }
    }
    g.globalAlpha = 1;
  }

  // =========================================================================
  // 11) KATANA-ZERO IMPACT SLASH STREAKS & CRIT CROSS-GLINTS
  // =========================================================================
  function drawHitStreaks(g, hitStreaks, w2s, W, H, tilt, camAngle, shkX, shkY) {
    if (!hitStreaks.length) return;
    for (let i = 0; i < hitStreaks.length; i++) {
      const hs = hitStreaks[i];
      const [sx, sy] = w2s(hs.x, hs.y, W, H, tilt);
      const cx = sx + shkX, cy = sy - hs.z + shkY;
      if (cx < -32 || cx > W + 32 || cy < -32 || cy > H + 32) continue;
      const frac = Math.max(0, hs.life / hs.maxLife);
      const a = hs.angle + camAngle + Math.PI * 0.5;
      const r = hs.len * (0.55 + 0.65 * frac);
      const dx = Math.cos(a) * r, dy = Math.sin(a) * r * tilt;

      g.globalAlpha = Math.min(1, frac * 1.4);
      fillTaperedStreak(g, cx - dx * 1.05, cy - dy * 1.05, cx + dx * 1.05, cy + dy * 1.05, 3.2 * frac, '#131223');
      fillTaperedStreak(g, cx - dx, cy - dy, cx + dx, cy + dy, 2.2 * frac, hs.c || '#fae04b');
      fillTaperedStreak(g, cx - dx * 0.72, cy - dy * 0.72, cx + dx * 0.72, cy + dy * 0.72, 1.1 * frac, '#ffffff');

      if (hs.len >= 20) {
        const px = -Math.sin(a) * (r * 0.52), py = Math.cos(a) * (r * 0.52) * tilt;
        fillTaperedStreak(g, cx - px, cy - py, cx + px, cy + py, 1.5 * frac, '#ffffff');
      }
      drawStarGlint(g, cx, cy, 3 + frac * 3, hs.c || '#fae04b', '#ffffff');
    }
    g.globalAlpha = 1;
  }

  window.SakuraCombatVFX = {
    drawBowCharge,
    drawMuzzleFlashes,
    drawDashBursts,
    drawArrow,
    drawRainZones,
    drawSkyArrows,
    drawStuckArrows,
    drawChronoAura,
    drawChronoScreenOverlay,
    drawIaidoSlashArc,
    drawBladeRingSeg,
    drawSakuraBlade,
    drawLightnings,
    drawSolarStrikes,
    drawShockwaves,
    drawHitStreaks,
  };
})();
