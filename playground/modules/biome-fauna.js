// ============================================================================
// Living Biome Fauna Engine (Koi, Sparrows, Butterflies, Dragonflies, Foxes, Sika Deer, Fireflies)
// Loaded by playground/index.html as window.SakuraFauna
//
// Ambient non-combat wildlife tailored to each Japanese biome + water bodies:
//   - Water (Ponds / Rivers / Lakes): Undulating Nishikigoi Koi Fish + Water Dragonflies
//   - Biome 0 (Sakura Grove)        : Swallowtail Butterflies + Startle-Flight Sparrows
//   - Biome 1 (Autumn Momiji)       : Wild Woodland Red Foxes + Autumn Red Dragonflies
//   - Biome 2 (Pine Highlands)      : Grazing Spotted Sika Deer + Soft Forest Fireflies
// ============================================================================
(function () {
  const groundCritters = []; // sparrows, foxes, deer (Y-sorted in queue)
  const airCritters = [];    // butterflies, dragonflies, fireflies
  const koiFish = [];        // pond & river/lake koi

  const MAX_GROUND = 14;
  const MAX_AIR = 24;
  const MAX_KOI = 14;

  let spawnTimer = 0;

  function reset() {
    groundCritters.length = 0;
    airCritters.length = 0;
    koiFish.length = 0;
    spawnTimer = 0;
  }

  function isWaterAt(x, y, ctx) {
    if (ctx.isInPond && ctx.isInPond(x, y)) return true;
    if (ctx.sampleForestWater && ctx.sampleForestWater(x, y) > 4.2) return true;
    return false;
  }

  function isDeepWaterAt(x, y, ctx) {
    if (ctx.isInPond && ctx.isInPond(x, y)) return true;
    if (ctx.sampleForestWater && ctx.sampleForestWater(x, y) > 5.8) return true;
    return false;
  }

  function spawnNearCamera(ctx) {
    const cx = ctx.camX, cy = ctx.camY;

    // 1) Spawn Koi Fish inside nearby Koi Pond or Forest River/Lake
    if (koiFish.length < MAX_KOI) {
      for (let tries = 0; tries < 8 && koiFish.length < MAX_KOI; tries++) {
        let kx, ky, isPond = false;
        if (ctx.hasCentralPond && tries < 3 && Math.hypot(cx - ctx.pondCx, cy - ctx.pondCy) < 340) {
          kx = ctx.pondCx + (Math.random() - 0.5) * (ctx.pondW * 0.72);
          ky = ctx.pondCy + (Math.random() - 0.5) * (ctx.pondH * 0.72);
          isPond = ctx.isInPond(kx, ky);
          if (!isPond) continue;
        } else {
          const a = Math.random() * Math.PI * 2;
          const r = 40 + Math.random() * 240;
          kx = cx + Math.cos(a) * r;
          ky = cy + Math.sin(a) * r;
          if (!isDeepWaterAt(kx, ky, ctx)) continue;
        }
        const palRoll = Math.random();
        const pal = palRoll < 0.45
          ? ['#f2642a', '#fff4e6', '#c93818'] // Kohaku orange-white
          : (palRoll < 0.78 ? ['#f7c642', '#fff7cc', '#d48d1e'] // Yamabuki gold
          : ['#d93838', '#f5ece4', '#2c2630']); // Showa crimson-calico
        koiFish.push({
          x: kx, y: ky,
          ang: Math.random() * Math.PI * 2,
          spd: 11 + Math.random() * 10,
          turnRate: (Math.random() - 0.5) * 0.8,
          phase: Math.random() * 6.28,
          len: 5 + Math.floor(Math.random() * 3),
          pal,
        });
      }
    }

    // 2) Spawn Biome-Specific Aerial Critters (Butterflies, Dragonflies, Fireflies)
    if (airCritters.length < MAX_AIR) {
      for (let tries = 0; tries < 6 && airCritters.length < MAX_AIR; tries++) {
        const a = Math.random() * Math.PI * 2;
        const r = 55 + Math.random() * 230;
        const ax = cx + Math.cos(a) * r;
        const ay = cy + Math.sin(a) * r;
        const b = ctx.sampleBiomeAt(ax, ay).kind;
        const nearWater = ctx.sampleForestWater(ax, ay) > -18 || (ctx.hasCentralPond && Math.hypot(ax - ctx.pondCx, ay - ctx.pondCy) < 95);
        let kind, colA, colB;
        if (nearWater && Math.random() < 0.55) {
          kind = 'dragonfly';
          colA = b === 1 ? '#e84838' : '#4ec4e8';
          colB = '#daf4ff';
        } else if (b === 0) {
          kind = 'butterfly';
          const white = Math.random() < 0.48;
          colA = white ? '#fff2f7' : '#fad25a';
          colB = white ? '#f2b8cf' : '#e08b36';
        } else if (b === 1) {
          kind = Math.random() < 0.65 ? 'dragonfly' : 'butterfly';
          colA = kind === 'dragonfly' ? '#e84c35' : '#f7a438';
          colB = kind === 'dragonfly' ? '#ffd2b8' : '#8a3520';
        } else {
          kind = 'firefly';
          colA = Math.random() < 0.55 ? '#c6ff7a' : '#88f0d8';
          colB = '#ffffff';
        }
        airCritters.push({
          kind, x: ax, y: ay,
          z: 10 + Math.random() * 14,
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          timer: 0.6 + Math.random() * 1.8,
          phase: Math.random() * 6.28,
          colA, colB,
        });
      }
    }

    // 3) Spawn Biome-Specific Ground Wildlife (Sparrows, Red Foxes, Sika Deer)
    if (groundCritters.length < MAX_GROUND) {
      for (let tries = 0; tries < 6 && groundCritters.length < MAX_GROUND; tries++) {
        const a = Math.random() * Math.PI * 2;
        const r = 110 + Math.random() * 210;
        const gx = cx + Math.cos(a) * r;
        const gy = cy + Math.sin(a) * r;
        if (isWaterAt(gx, gy, ctx)) continue;
        const b = ctx.sampleBiomeAt(gx, gy).kind;
        const inCy = ctx.inCourtyardAt && ctx.inCourtyardAt(gx, gy);
        let kind;
        if (inCy) {
          kind = 'sparrow';
        } else if (b === 0) {
          kind = Math.random() < 0.72 ? 'sparrow' : 'deer';
        } else if (b === 1) {
          kind = Math.random() < 0.68 ? 'fox' : 'sparrow';
        } else {
          kind = Math.random() < 0.70 ? 'deer' : 'fox';
        }
        groundCritters.push({
          kind, x: gx, y: gy, z: 0,
          vx: 0, vy: 0, vz: 0,
          dir: Math.random() * Math.PI * 2,
          state: 'idle', // 'idle' | 'wander' | 'flee' | 'fly'
          stateTimer: 1.0 + Math.random() * 2.5,
          phase: Math.random() * 6.28,
          variant: Math.random() < 0.5 ? 0 : 1,
        });
      }
    }
  }

  function update(dt, ctx) {
    const cx = ctx.camX, cy = ctx.camY;
    const px = ctx.playerX, py = ctx.playerY;

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = 0.45;
      spawnNearCamera(ctx);
    }

    // Update Koi Fish
    for (let i = koiFish.length - 1; i >= 0; i--) {
      const k = koiFish[i];
      if (Math.hypot(k.x - cx, k.y - cy) > 390) {
        koiFish.splice(i, 1);
        continue;
      }
      k.phase += dt * 7.2;
      k.turnRate += (Math.random() - 0.5) * dt * 1.4;
      k.turnRate = Math.max(-1.1, Math.min(1.1, k.turnRate));
      k.ang += k.turnRate * dt;
      const nx = k.x + Math.cos(k.ang) * k.spd * dt;
      const ny = k.y + Math.sin(k.ang) * k.spd * dt;
      if (isWaterAt(nx, ny, ctx)) {
        k.x = nx; k.y = ny;
      } else {
        k.ang += Math.PI * 0.72 + (Math.random() - 0.5) * 0.6;
        k.turnRate *= -0.5;
      }
    }

    // Update Aerial Critters
    for (let i = airCritters.length - 1; i >= 0; i--) {
      const a = airCritters[i];
      if (Math.hypot(a.x - cx, a.y - cy) > 380) {
        airCritters.splice(i, 1);
        continue;
      }
      a.phase += dt * (a.kind === 'dragonfly' ? 24 : (a.kind === 'butterfly' ? 14 : 4.2));
      a.timer -= dt;
      if (a.timer <= 0) {
        if (a.kind === 'dragonfly') {
          const dart = Math.random() < 0.58;
          const ang = Math.random() * Math.PI * 2;
          const sp = dart ? (36 + Math.random() * 28) : (2 + Math.random() * 4);
          a.vx = Math.cos(ang) * sp; a.vy = Math.sin(ang) * sp;
          a.timer = dart ? (0.45 + Math.random() * 0.55) : (0.7 + Math.random() * 1.1);
        } else if (a.kind === 'butterfly') {
          const ang = Math.random() * Math.PI * 2;
          const sp = 14 + Math.random() * 14;
          a.vx = Math.cos(ang) * sp; a.vy = Math.sin(ang) * sp;
          a.timer = 0.8 + Math.random() * 1.5;
        } else {
          const ang = Math.random() * Math.PI * 2;
          const sp = 7 + Math.random() * 9;
          a.vx = Math.cos(ang) * sp; a.vy = Math.sin(ang) * sp;
          a.timer = 1.2 + Math.random() * 2.0;
        }
      }
      // Gently flee heroine if she dashes right through them
      const dp = Math.hypot(a.x - px, a.y - py);
      if (dp < 36 && dp > 0.1) {
        a.vx += ((a.x - px) / dp) * 55 * dt;
        a.vy += ((a.y - py) / dp) * 55 * dt;
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.z = Math.max(6, Math.min(24, a.z + Math.sin(a.phase * 0.45) * 6 * dt));
    }

    // Update Ground Wildlife (Sparrows, Foxes, Sika Deer)
    for (let i = groundCritters.length - 1; i >= 0; i--) {
      const c = groundCritters[i];
      if (Math.hypot(c.x - cx, c.y - cy) > 410) {
        groundCritters.splice(i, 1);
        continue;
      }
      c.phase += dt * (c.state === 'flee' || c.state === 'fly' ? 16 : 6.5);
      c.stateTimer -= dt;

      const dxP = c.x - px, dyP = c.y - py;
      const distP = Math.hypot(dxP, dyP);
      const scareR = c.kind === 'sparrow' ? 54 : (c.kind === 'fox' ? 66 : 74);

      if (distP < scareR && c.state !== 'flee' && c.state !== 'fly') {
        const fleeAng = Math.atan2(dyP, dxP) + (Math.random() - 0.5) * 0.7;
        c.dir = fleeAng;
        if (c.kind === 'sparrow') {
          c.state = 'fly';
          const sp = 76 + Math.random() * 26;
          c.vx = Math.cos(fleeAng) * sp; c.vy = Math.sin(fleeAng) * sp;
          c.vz = 42 + Math.random() * 16;
          c.stateTimer = 1.45 + Math.random() * 0.75;
        } else {
          c.state = 'flee';
          const sp = c.kind === 'fox' ? 68 : 62;
          c.vx = Math.cos(fleeAng) * sp; c.vy = Math.sin(fleeAng) * sp;
          c.stateTimer = 1.25 + Math.random() * 0.85;
        }
      }

      if (c.state === 'fly') {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.z += c.vz * dt;
        if (c.z > 24 && c.vz > 0) c.vz *= Math.pow(0.25, dt);
        if (c.stateTimer < 0.45) c.vz -= 64 * dt;
        if (c.z <= 0 && c.stateTimer <= 0.35) {
          c.z = 0; c.vz = 0; c.vx = 0; c.vy = 0;
          c.state = 'idle';
          c.stateTimer = 1.4 + Math.random() * 2.4;
        }
      } else if (c.state === 'flee' || c.state === 'wander') {
        const nx = c.x + c.vx * dt;
        const ny = c.y + c.vy * dt;
        if (!isWaterAt(nx, ny, ctx)) {
          c.x = nx; c.y = ny;
        } else {
          c.dir += Math.PI * 0.65;
          const sp = Math.hypot(c.vx, c.vy);
          c.vx = Math.cos(c.dir) * sp; c.vy = Math.sin(c.dir) * sp;
        }
        if (c.stateTimer <= 0) {
          c.state = 'idle';
          c.vx = 0; c.vy = 0;
          c.stateTimer = 1.5 + Math.random() * 3.0;
        }
      } else {
        // idle grazing / hopping
        if (c.stateTimer <= 0) {
          c.state = 'wander';
          c.dir = Math.random() * Math.PI * 2;
          const sp = c.kind === 'sparrow' ? 16 : (c.kind === 'fox' ? 24 : 19);
          c.vx = Math.cos(c.dir) * sp; c.vy = Math.sin(c.dir) * sp;
          c.stateTimer = 1.0 + Math.random() * 1.8;
        }
      }
    }
  }

  // Render Koi Fish inside the water layer (drawn right after river/pond surface, before ground shadows/props)
  function drawKoi(g, w2s, W, H, tilt, camAngle, shkX, shkY) {
    if (!koiFish.length) return;
    for (let i = 0; i < koiFish.length; i++) {
      const k = koiFish[i];
      const [sx, sy] = w2s(k.x, k.y, W, H, tilt);
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
      const scrAng = k.ang + camAngle;
      const fx = Math.cos(scrAng), fy = Math.sin(scrAng) * tilt;
      const wag = Math.sin(k.phase) * 1.4;
      const px = -Math.sin(scrAng) * wag, py = Math.cos(scrAng) * tilt * wag;
      const bx = sx + shkX, by = sy + shkY + 2;

      // Soft underwater shadow
      g.fillStyle = 'rgba(14, 42, 66, 0.36)';
      g.fillRect(Math.round(bx - 2), Math.round(by + 1), 5, 2);

      // Tail fin (undulating)
      g.fillStyle = k.pal[1];
      g.fillRect(Math.round(bx - fx * 3.5 + px), Math.round(by - fy * 3.5 + py), 2, 2);
      // Mid body
      g.fillStyle = k.pal[0];
      g.fillRect(Math.round(bx - fx * 1.2 + px * 0.35) - 1, Math.round(by - fy * 1.2 + py * 0.35) - 1, 3, 2);
      // Head with marking
      g.fillStyle = k.pal[1];
      g.fillRect(Math.round(bx + fx * 1.4) - 1, Math.round(by + fy * 1.4) - 1, 3, 2);
      g.fillStyle = k.pal[2];
      g.fillRect(Math.round(bx + fx * 1.0), Math.round(by + fy * 1.0), 1, 1);
    }
  }

  // Push ground wildlife into the unified Y-sorted queue
  function enqueueGroundFauna(queue, w2s, W, H, tilt, shkX, shkY, getElevationAt) {
    for (let i = 0; i < groundCritters.length; i++) {
      const c = groundCritters[i];
      const [sx, sy, depth] = w2s(c.x, c.y, W, H, tilt);
      if (sx < -24 || sx > W + 24 || sy < -32 || sy > H + 24) continue;
      const elev = c.z > 0.5 ? 0 : (getElevationAt ? getElevationAt(c.x, c.y) : 0);
      queue.push({ kind: 'fauna', obj: c, sx: sx + shkX, sy: sy + shkY - elev, depth });
    }
  }

  // Render a single ground critter in crisp borderless pixel art (no black sticker outline!)
  function drawGroundCritter(g, c, sx, sy, camAngle) {
    const faceX = Math.cos(c.dir + camAngle) >= 0 ? 1 : -1;
    const x = Math.round(sx);
    const y = Math.round(sy - c.z);

    // Soft ground contact shadow
    g.fillStyle = c.z > 2 ? 'rgba(20, 22, 28, 0.14)' : 'rgba(20, 22, 28, 0.24)';
    const shW = c.kind === 'sparrow' ? 5 : (c.kind === 'fox' ? 10 : 12);
    g.fillRect(x - (shW >> 1), Math.round(sy) - 1, shW, 2);

    if (c.kind === 'sparrow') {
      const hop = (c.state === 'wander') ? Math.abs(Math.round(Math.sin(c.phase) * 2)) : 0;
      const by = y - hop;
      // Plump Japanese sparrow (Suzume)
      g.fillStyle = '#c49668'; // cream-buff breast
      g.fillRect(x - 2, by - 3, 4, 3);
      g.fillStyle = '#7c4c2c'; // chestnut back & crown
      g.fillRect(x - 2, by - 4, 4, 2);
      g.fillStyle = '#4a2b1c'; // dark tail & eye
      g.fillRect(x - faceX * 3, by - 3, 2, 1);
      g.fillRect(x + faceX * 1, by - 4, 1, 1);
      g.fillStyle = '#e6b85c'; // beak
      g.fillRect(x + faceX * 2, by - 3, 1, 1);
      if (c.state === 'fly') {
        const wingUp = Math.sin(c.phase * 1.6) > 0;
        g.fillStyle = '#9a6640';
        g.fillRect(x - 3, by - (wingUp ? 6 : 2), 6, 2);
      }
      return;
    }

    if (c.kind === 'fox') {
      const trot = (c.state === 'wander' || c.state === 'flee') ? Math.round(Math.sin(c.phase)) : 0;
      const by = y - Math.abs(trot);
      // Legs
      g.fillStyle = '#332426';
      g.fillRect(x - 3, by - 2 + (trot > 0 ? 1 : 0), 1, 2);
      g.fillRect(x - 1, by - 2 + (trot < 0 ? 1 : 0), 1, 2);
      g.fillRect(x + 2, by - 2 + (trot < 0 ? 1 : 0), 1, 2);
      g.fillRect(x + 4, by - 2 + (trot > 0 ? 1 : 0), 1, 2);
      // Fluffy tail with white tip
      const tailWag = Math.round(Math.sin(c.phase * 0.7));
      g.fillStyle = '#d96428';
      g.fillRect(x - faceX * 5, by - 5 + tailWag, 4, 2);
      g.fillStyle = '#f8f0e4';
      g.fillRect(x - faceX * 6, by - 5 + tailWag, 2, 2);
      // Body (russet orange + cream belly)
      g.fillStyle = '#d96428';
      g.fillRect(x - 3, by - 6, 7, 4);
      g.fillStyle = '#ed843c';
      g.fillRect(x - 2, by - 6, 5, 2);
      g.fillStyle = '#f5e6d2';
      g.fillRect(x - 2, by - 3, 5, 1);
      // Head + pointed ears
      const hx = x + faceX * 4;
      g.fillStyle = '#e06c2c';
      g.fillRect(hx - 1, by - 8, 4, 3);
      g.fillStyle = '#4a2820'; // ear tips
      g.fillRect(hx - 1, by - 9, 1, 1);
      g.fillRect(hx + 1, by - 9, 1, 1);
      g.fillStyle = '#f5e6d2'; // cheek/snout
      g.fillRect(hx + faceX * 2, by - 6, 2, 1);
      return;
    }

    // SIKA DEER (Олень Сика — spotted Nara woodland deer)
    const step = (c.state === 'wander' || c.state === 'flee') ? Math.round(Math.sin(c.phase) * 1.4) : 0;
    const grazing = (c.state === 'idle' && Math.sin(c.phase * 0.35) > 0.15);
    const by = y - (c.state === 'flee' ? Math.abs(step) : 0);
    // Slender legs
    g.fillStyle = '#523828';
    g.fillRect(x - 4, by - 5 + (step > 0 ? 1 : 0), 1, 5);
    g.fillRect(x - 2, by - 5 + (step < 0 ? 1 : 0), 1, 5);
    g.fillRect(x + 2, by - 5 + (step < 0 ? 1 : 0), 1, 5);
    g.fillRect(x + 4, by - 5 + (step > 0 ? 1 : 0), 1, 5);
    // Body + white rump + Nara fawn spots
    g.fillStyle = '#9c6844';
    g.fillRect(x - 4, by - 10, 9, 5);
    g.fillStyle = '#b88258';
    g.fillRect(x - 3, by - 10, 7, 2);
    g.fillStyle = '#e8d8c2'; // cream belly & tail rump
    g.fillRect(x - 3, by - 6, 7, 1);
    g.fillRect(x - faceX * 5, by - 9, 2, 2);
    // Characteristic Sika white dapples
    g.fillStyle = '#f2e4ce';
    g.fillRect(x - 2, by - 9, 1, 1);
    g.fillRect(x + 1, by - 8, 1, 1);
    g.fillRect(x - 1, by - 7, 1, 1);
    // Graceful neck & head (dips down to graze when idle!)
    const hx = x + faceX * (grazing ? 6 : 4);
    const hy = grazing ? (by - 7) : (by - 14);
    g.fillStyle = '#a4704a';
    g.fillRect(x + faceX * 3, grazing ? (by - 9) : (by - 13), 2, grazing ? 3 : 4);
    g.fillStyle = '#b88258';
    g.fillRect(hx - 1, hy, 4, 3);
    g.fillStyle = '#6e4c36'; // ears & small antlers on stags
    g.fillRect(hx, hy - 1, 1, 1);
    if (c.variant === 1) {
      g.fillStyle = '#d6c4a8';
      g.fillRect(hx, hy - 3, 1, 2);
      g.fillRect(hx + faceX, hy - 3, 1, 1);
    }
  }

  // Render butterflies, dragonflies & glowing forest fireflies in the air pass
  function drawAirFauna(g, w2s, W, H, tilt, shkX, shkY) {
    if (!airCritters.length) return;
    for (let i = 0; i < airCritters.length; i++) {
      const a = airCritters[i];
      const [sx, sy] = w2s(a.x, a.y, W, H, tilt);
      if (sx < -16 || sx > W + 16 || sy < -28 || sy > H + 16) continue;
      const x = Math.round(sx + shkX);
      const y = Math.round(sy + shkY - a.z);

      if (a.kind === 'firefly') {
        const pulse = 0.45 + 0.55 * Math.sin(a.phase);
        g.globalAlpha = 0.25 * pulse;
        g.fillStyle = a.colA;
        g.fillRect(x - 2, y - 2, 5, 5);
        g.globalAlpha = 0.92 * pulse;
        g.fillStyle = a.colA;
        g.fillRect(x - 1, y - 1, 3, 3);
        g.fillStyle = a.colB;
        g.fillRect(x, y, 1, 1);
        g.globalAlpha = 1;
        continue;
      }

      // Tiny air shadow on ground
      g.fillStyle = 'rgba(20, 22, 28, 0.14)';
      g.fillRect(x - 1, Math.round(sy + shkY), 2, 1);

      const flap = Math.sin(a.phase) > 0;
      if (a.kind === 'butterfly') {
        g.fillStyle = a.colA;
        if (flap) {
          g.fillRect(x - 2, y - 2, 2, 2);
          g.fillRect(x + 1, y - 2, 2, 2);
          g.fillStyle = a.colB;
          g.fillRect(x - 1, y, 1, 1);
          g.fillRect(x + 1, y, 1, 1);
        } else {
          g.fillRect(x - 1, y - 1, 3, 2);
        }
      } else {
        // Dragonfly (thin bright tail + shimmering perpendicular wings)
        g.fillStyle = a.colA;
        g.fillRect(x - 2, y, 5, 1);
        g.globalAlpha = flap ? 0.85 : 0.45;
        g.fillStyle = a.colB;
        g.fillRect(x - 1, y - (flap ? 2 : 1), 3, flap ? 5 : 3);
        g.globalAlpha = 1;
      }
    }
  }

  window.SakuraFauna = {
    reset,
    update,
    drawKoi,
    enqueueGroundFauna,
    drawGroundCritter,
    drawAirFauna,
  };
})();
