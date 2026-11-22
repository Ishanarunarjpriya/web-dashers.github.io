(() => {
  const proto = window.LevelObject.prototype;
  const TICK = 1 / 240;

  const rv = (raw, key) => raw?.[key] ?? raw?.[String(key)];
  const num = (raw, key, fallback = 0) => {
    const v = parseFloat(rv(raw, key) ?? fallback);
    return Number.isFinite(v) ? v : fallback;
  };
  const int = (raw, key, fallback = 0) => {
    const v = parseInt(rv(raw, key) ?? fallback, 10);
    return Number.isFinite(v) ? v : fallback;
  };
  const flag = (raw, key) => String(rv(raw, key) ?? "0") === "1";
  const groupsOf = (raw) => String(rv(raw, 57) ?? "").split(".").map(Number).filter(n => n > 0);

  const ADV_FOLLOW_KEYS = [292, 293, 298, 299, 300, 301, 308, 309, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 340, 357, 358, 359, 360, 361, 362, 363, 364, 558, 559, 561, 562, 563, 564, 566, 567, 568, 569];
  const followTargetOf = (raw) => flag(raw, 138) ? -1 : flag(raw, 200) ? -2 : flag(raw, 201) ? -3 : int(raw, 71);

  proto.resetAdvancedTriggers = function () {
    this._advFollows = [];
    this._advFollowAcc = 0;
    this._advHistory = [];
    this._keyframeAnims = [];
  };

  proto._parseKeyframeObject = function (levelObj) {
    const raw = levelObj._raw || {};
    const scale = num(raw, 32, 1) || 1;
    let duration = num(raw, 10);
    let spawnDelay = num(raw, 557);
    const legacyDelay = num(raw, 63);
    if (legacyDelay !== 0) spawnDelay = legacyDelay;
    const rate = num(raw, 85);
    (this._keyframes ||= []).push({
      x: levelObj.x * 2,
      y: levelObj.y * 2,
      groups: groupsOf(raw),
      anim: int(raw, 373),
      index: int(raw, 374),
      refOnly: flag(raw, 375),
      closeLoop: flag(raw, 376),
      curve: flag(raw, 378),
      timeMode: int(raw, 379),
      duration,
      easing: int(raw, 30),
      rate: rate > 0 ? rate : 2,
      target: int(raw, 51),
      spawnGroup: int(raw, 71),
      spawnDelay,
      rotation: num(raw, 6),
      direction: int(raw, 536),
      revolutions: int(raw, 537),
      scaleX: num(raw, 128, 1) * scale,
      scaleY: num(raw, 129, 1) * scale
    });
  };

  proto._parseAdvancedTrigger = function (trig, raw, id) {
    if (id === 3016 || id === 3660 || id === 3661) {
      trig.followTarget = followTargetOf(raw);
      trig.p = {};
      for (const k of ADV_FOLLOW_KEYS) trig.p[k] = num(raw, k);
      trig.xOnly = flag(raw, 306);
      trig.yOnly = flag(raw, 307);
      trig.steerLowOn = flag(raw, 337);
      trig.steerHighOn = flag(raw, 338);
      trig.targetDir = flag(raw, 305);
      trig.rotateDir = flag(raw, 339);
      trig.startSpeedRef = int(raw, 560);
      trig.startDirRef = int(raw, 565);
      trig.startMode = int(raw, 572);
      trig.controlId = int(raw, 534);
      trig.useControlId = flag(raw, 535);
      trig.followId = id;
      trig.mode = int(raw, 367);
      return;
    }
    trig.animGroup = int(raw, 76);
    trig.timeMod = num(raw, 520);
    trig.posXMod = num(raw, 521);
    trig.posYMod = num(raw, 545) || trig.posXMod;
    trig.rotMod = num(raw, 522);
    trig.scaleXMod = num(raw, 523);
    trig.scaleYMod = num(raw, 546) || trig.scaleXMod;
  };

  proto._fireAdvancedTrigger = function (trig) {
    if (trig.kind === "advFollow" && trig.followId === 3660) {
      this._editAdvancedFollow(trig);
      return;
    }
    if (trig.kind === "advFollow" && trig.followId === 3661) {
      this._retargetAdvancedFollow(trig);
      return;
    }
    if (trig.kind === "advFollow") {
      if (!(trig.targetGroup > 0)) return;
      const p = trig.p;
      const r = () => Math.random() * 2 - 1;
      this._advFollows = this._advFollows.filter(f => !(f.trig === trig));
      this._advFollows.push({
        trig,
        followTarget: trig.followTarget,
        vx: 0,
        vy: 0,
        dirX: 0,
        dirY: 0,
        angle: 0,
        steerSmooth: 0,
        rot: 0,
        started: false,
        startSpeed: p[300] + p[301] * r(),
        startDir: p[563] + p[564] * r(),
        steer: p[316] + p[317] * r(),
        steerLow: p[318] + p[319] * r(),
        steerHigh: p[320] + p[321] * r(),
        speedLow: p[322] + p[323] * r(),
        speedHigh: p[324] + p[325] * r(),
        breakForce: p[326] + p[327] * r(),
        breakAngle: p[328] + p[329] * r(),
        breakSteer: p[330] + p[331] * r(),
        breakLimit: p[332] + p[333] * r(),
        delay: Math.max(0, p[292] + p[293] * r()),
        maxSpeed: p[298] + p[299] * r(),
        maxRange: p[308] + p[309] * r(),
        accel: p[334] + p[335] * r(),
        friction: p[558] + p[559] * r(),
        nearAccel: p[357] + p[358] * r(),
        nearDist: p[359] + p[360] * r(),
        nearFriction: p[561] + p[562] * r(),
        easing: p[361] + p[362] * r()
      });
      return;
    }
    this._startKeyframeAnim(trig);
  };

  proto._advTargetPos = function (follow) {
    const target = follow.followTarget;
    if (target === -1 || target === -2) {
      const ticks = Math.round(follow.delay / TICK);
      const hist = this._advHistory;
      if (ticks > 0 && hist.length) {
        const h = hist[Math.max(0, hist.length - 1 - ticks)];
        return target === -1 ? { x: h.x, y: h.y } : { x: h.x, y: h.y2 };
      }
      const scene = this._scene || {};
      const x = Number(scene._playerWorldX) || 0;
      const state = target === -1 ? scene._state : scene._state2;
      if (!state) return null;
      return { x, y: Number(state.y) || 0 };
    }
    if (target === -3) {
      const scene = this._scene || {};
      const zoom = this.cameraZoom || 1;
      return {
        x: (Number(scene._cameraX) || 0) + screenWidth / 2 / zoom,
        y: (Number(scene._cameraY) || 0) + 320 - (typeof o !== "undefined" ? o : 0)
      };
    }
    if (target > 0) return this._advGroupRef(target, true);
    return null;
  };

  proto._advSpritePos = function (spr) {
    const off = this._getCombinedGroupOffset(spr, this._advOffScratch || (this._advOffScratch = { x: 0, y: 0 }));
    const x = (spr._eeInitialWorldX !== undefined ? spr._eeInitialWorldX : (spr._eeWorldX ?? spr.x)) + off.x;
    const by = (spr._eeInitialBaseY !== undefined ? spr._eeInitialBaseY : (spr._eeBaseY ?? spr.y)) + off.y;
    return { x, y: T - by };
  };

  proto._advGroupRef = function (group, strict = false) {
    const sprites = this._getUniqueGroupSprites(group);
    for (const spr of sprites) {
      if (spr._eeParentGroups?.includes(group)) return this._advSpritePos(spr);
    }
    if (!sprites.length) return null;
    if (strict) {
      const first = sprites[0];
      if (sprites.every(s => s._eeInitialWorldX === first._eeInitialWorldX && s._eeInitialBaseY === first._eeInitialBaseY)) {
        return this._advSpritePos(first);
      }
      return null;
    }
    const c = this._getGroupCenter(group);
    return { x: c.cx, y: T - c.cy };
  };

  proto._followSpeedVal = function (dirDeg, speed, ref1, ref2, objPos) {
    let ang = (90 - dirDeg) * Math.PI / 180;
    const refPos = (ref1 > 0 && this._advGroupRef(ref1, true)) || (ref2 > 0 && this._advGroupRef(ref2, true)) || null;
    if (refPos && objPos) {
      const vx = objPos.x - refPos.x;
      const vy = objPos.y - refPos.y;
      if (vx !== 0 || vy !== 0) ang += Math.atan2(vy, vx) + Math.PI / 2;
    }
    return { x: speed * Math.cos(ang), y: speed * Math.sin(ang) };
  };

  proto._matchFollows = function (trig) {
    return (this._advFollows || []).filter(f => trig.useControlId
      ? f.trig.controlId === trig.targetGroup
      : (trig.followId === 3661 ? f.trig.groups?.includes?.(trig.targetGroup) : f.trig.targetGroup === trig.targetGroup));
  };

  proto._editAdvancedFollow = function (trig) {
    const p = trig.p;
    const r = () => Math.random() * 2 - 1;
    for (const f of this._matchFollows(trig)) {
      f.vx *= p[566] + p[567] * r();
      f.vy *= p[568] + p[569] * r();
      const speed = p[300] + p[301] * r();
      if (speed === 0) continue;
      const add = this._followSpeedVal(p[563] + p[564] * r(), speed, trig.startSpeedRef, trig.startDirRef, this._advGroupRef(f.trig.targetGroup));
      if (!trig.xOnly) f.vy += add.y;
      if (!trig.yOnly) f.vx += add.x;
    }
  };

  proto._retargetAdvancedFollow = function (trig) {
    if (!trig.followTarget) return;
    for (const f of this._matchFollows(trig)) f.followTarget = trig.followTarget;
  };

  proto._stepAdvancedFollow = function (follow, dirty) {
    const trig = follow.trig;
    const target = this._advTargetPos(follow);
    if (!target) return;
    const ref = this._advGroupRef(trig.targetGroup);
    if (!ref) return;
    let dx = (target.x - ref.x) / 2;
    let dy = (target.y - ref.y) / 2;
    if (dx === 0 && dy === 0) return;
    const dist = Math.hypot(dx, dy);
    if (trig.xOnly) dy = 0;
    else if (trig.yOnly) dx = 0;
    if (follow.maxRange !== 0 && dist > follow.maxRange) return;
    if (!follow.started) {
      follow.started = true;
      if (follow.startSpeed !== 0) {
        const sv = this._followSpeedVal(follow.startDir, follow.startSpeed, trig.startSpeedRef, trig.startDirRef, ref);
        if (trig.startMode === 2) {
          follow.vx += sv.x;
          follow.vy += sv.y;
        } else {
          follow.vx = sv.x;
          follow.vy = sv.y;
        }
      }
    }
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const accelBase = follow.accel * 0.01;
    if (trig.mode === 2) {
      if (follow.dirX === 0 && follow.dirY === 0) {
        follow.dirX = ux;
        follow.dirY = uy;
      }
      const speed = Math.hypot(follow.vx, follow.vy);
      let steer;
      if (trig.steerLowOn && speed <= follow.speedLow) steer = follow.steerLow;
      else {
        steer = follow.steer;
        if (trig.steerHighOn && speed >= follow.speedHigh) steer = follow.steerHigh;
      }
      let diff = Math.atan2(uy, ux) - Math.atan2(follow.dirY, follow.dirX);
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const brake = follow.breakForce * 0.01;
      const brakeAngle = follow.breakAngle * Math.PI / 180;
      if (brake > 0 && speed > follow.breakLimit && Math.abs(diff) > brakeAngle) steer = follow.breakSteer;
      follow.steerSmooth += (steer * 0.01 - follow.steerSmooth) / 10;
      const s = follow.steerSmooth;
      const turn = diff >= 0 ? Math.min(diff, s) : Math.max(diff, -s);
      if (turn !== 0) {
        const c = Math.cos(turn), sn = Math.sin(turn);
        const vx = follow.vx, vy = follow.vy;
        if (!trig.yOnly) follow.vx = vx * c - vy * sn;
        if (!trig.xOnly) follow.vy = vx * sn + vy * c;
        const da = Math.atan2(follow.dirY, follow.dirX) + turn;
        follow.dirX = Math.cos(da);
        follow.dirY = Math.sin(da);
      }
      if (brake > 0 && brakeAngle < Math.abs(diff - turn)) {
        const bx = Math.abs(brake * follow.dirX), by = Math.abs(brake * follow.dirY);
        if (!trig.xOnly) follow.vy -= Math.max(-by, Math.min(by, follow.vy));
        if (!trig.yOnly) follow.vx -= Math.max(-bx, Math.min(bx, follow.vx));
      }
      const ax = trig.targetDir ? ux : follow.dirX;
      const ay = trig.targetDir ? uy : follow.dirY;
      if (!trig.xOnly) follow.vy += accelBase * ay;
      if (!trig.yOnly) follow.vx += accelBase * ax;
    } else {
      if (trig.mode === 1) {
        let accel = accelBase;
        let friction = follow.friction * 0.01;
        if (follow.nearDist > 0 && dist < follow.nearDist) {
          const t = 1 - dist / follow.nearDist;
          accel += (follow.nearAccel * 0.01 - accel) * t;
          friction += (follow.nearFriction * 0.01 - friction) * t;
        }
        if (friction !== 0) {
          if (!trig.xOnly) follow.vy -= follow.vy * friction;
          if (!trig.yOnly) follow.vx -= follow.vx * friction;
        }
        if (!trig.yOnly) follow.vx += ux * accel;
        if (!trig.xOnly) follow.vy += uy * accel;
      } else {
        const div = Math.max(1, follow.easing);
        if (!trig.yOnly) follow.vx = dx / div;
        if (!trig.xOnly) follow.vy = dy / div;
      }
      if (dist >= trig.p[364]) follow.angle = Math.atan2(follow.vy, follow.vx);
      const cur = Math.atan2(follow.dirY, follow.dirX);
      let d = follow.angle - cur;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const na = cur + d / Math.max(1, trig.p[363]);
      follow.dirX = Math.cos(na);
      follow.dirY = Math.sin(na);
    }
    const maxSpeed = follow.maxSpeed;
    if (maxSpeed > 0) {
      if (trig.xOnly) {
        if (Math.abs(follow.vx) > maxSpeed) follow.vx = Math.sign(follow.vx) * maxSpeed;
      } else if (trig.yOnly) {
        if (Math.abs(follow.vy) > maxSpeed) follow.vy = Math.sign(follow.vy) * maxSpeed;
      } else {
        const speed = Math.hypot(follow.vx, follow.vy);
        if (speed > maxSpeed) {
          follow.vx *= maxSpeed / speed;
          follow.vy *= maxSpeed / speed;
        }
      }
    }
    if (trig.rotateDir) {
      let delta = (Math.atan2(follow.dirY, follow.dirX) * -57.29578 + 90 + trig.p[340]) - follow.rot;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      const step = delta * 0.25;
      if (step !== 0) {
        follow.rot += step;
        const rd = this._groupRotations[trig.targetGroup] ||= { totalRad: 0, centerGroupId: trig.targetGroup, lockRotation: false };
        rd.totalRad += step * Math.PI / 180;
        if (!rd.centerGroupId) rd.centerGroupId = trig.targetGroup;
        dirty.add(trig.targetGroup);
      }
    }
    const mx = trig.yOnly ? 0 : follow.vx;
    const my = trig.xOnly ? 0 : follow.vy;
    if (mx === 0 && my === 0) return;
    const off = this._groupOffsets[trig.targetGroup] ||= { x: 0, y: 0 };
    off.x += mx * 2;
    off.y -= my * 2;
    dirty.add(trig.targetGroup);
  };

  proto._startKeyframeAnim = function (trig) {
    const frames = this._keyframes;
    if (!frames?.length || !(trig.animGroup > 0)) return;
    const anims = new Set(frames.filter(k => k.groups.includes(trig.animGroup)).map(k => k.anim));
    const timeMod = Math.max(0.0001, trig.timeMod);
    for (const animId of anims) {
      const list = frames.filter(k => k.anim === animId).sort((a, b) => a.index - b.index);
      const target = trig.targetGroup || list[0]?.target || 0;
      if (!list.length || !(target > 0)) continue;
      const n = list.length;
      const base = list[0];
      const entries = list.map((k, i) => ({
        k,
        x: base.x + trig.posXMod * (k.x - base.x),
        y: base.y + trig.posYMod * (k.y - base.y),
        dur: timeMod * k.duration,
        isRef: k.refOnly && i > 0 && (k.closeLoop || i < n - 1)
      }));
      if (list[n - 1].closeLoop) entries.push({ k: base, x: base.x, y: base.y, dur: timeMod * base.duration, isRef: false });
      let absRot = base.rotation;
      for (let e = 0; e < entries.length; e++) {
        const k = entries[e].k;
        if (e > 0) {
          let d = k.rotation - entries[e - 1].k.rotation;
          if (d > 180 || (d > 0 && k.direction === 2)) d -= 360;
          else if (d < -180 || (d < 0 && k.direction === 1)) d += 360;
          absRot += d + k.revolutions * 360;
        }
        entries[e].rot = trig.rotMod * (absRot - base.rotation);
        entries[e].sx = 1 + trig.scaleXMod * ((base.scaleX ? k.scaleX / base.scaleX : 1) - 1);
        entries[e].sy = 1 + trig.scaleYMod * ((base.scaleY ? k.scaleY / base.scaleY : 1) - 1);
      }
      const runs = [];
      let i = 0;
      while (i < entries.length - 1) {
        let j = i + 1;
        while (j < entries.length - 1 && entries[j].isRef) j++;
        const pts = entries.slice(i, j + 1);
        const main = entries[i];
        const segs = pts.length - 1;
        let durs;
        if (main.k.timeMode === 1 && segs > 0) {
          durs = Array(segs).fill(main.dur / segs);
        } else if (main.k.timeMode === 2 && segs > 0) {
          const lens = [];
          let total = 0;
          for (let s = 0; s < segs; s++) {
            const l = Math.hypot(pts[s + 1].x - pts[s].x, pts[s + 1].y - pts[s].y);
            lens.push(l);
            total += l;
          }
          durs = total > 0 ? lens.map(l => main.dur * l / total) : Array(segs).fill(main.dur / segs);
        } else {
          durs = pts.slice(0, segs).map(p => p.dur);
        }
        const times = [0];
        for (const d of durs) times.push(times[times.length - 1] + Math.max(1e-5, d));
        const run = { pts, times, total: times[times.length - 1], main };
        if (main.k.curve && pts.length > 2) {
          run.splineX = naturalSpline(times, pts.map(p => p.x));
          run.splineY = naturalSpline(times, pts.map(p => p.y));
        }
        runs.push(run);
        i = j;
      }
      if (!runs.length) continue;
      this._keyframeAnims = this._keyframeAnims.filter(a => !(a.animId === animId && a.target === target));
      this._keyframeAnims.push({ trig, animId, target, runs, run: 0, elapsed: 0, lastX: base.x, lastY: base.y, lastRot: 0, lastSx: 1, lastSy: 1 });
    }
  };

  proto._keyframeRunPos = function (run, t) {
    if (run.splineX) return { x: run.splineX(t), y: run.splineY(t) };
    const { times, pts } = run;
    let s = 0;
    while (s < times.length - 2 && t > times[s + 1]) s++;
    const span = times[s + 1] - times[s];
    const f = span > 0 ? Math.max(0, Math.min(1, (t - times[s]) / span)) : 1;
    return { x: pts[s].x + (pts[s + 1].x - pts[s].x) * f, y: pts[s].y + (pts[s + 1].y - pts[s].y) * f };
  };

  proto._keyframeRunTransform = function (run, t) {
    const { times, pts } = run;
    let s = 0;
    while (s < times.length - 2 && t > times[s + 1]) s++;
    const span = times[s + 1] - times[s];
    const f = span > 0 ? Math.max(0, Math.min(1, (t - times[s]) / span)) : 1;
    const a = pts[s], b = pts[s + 1];
    return { rot: a.rot + (b.rot - a.rot) * f, sx: a.sx + (b.sx - a.sx) * f, sy: a.sy + (b.sy - a.sy) * f };
  };

  proto._stepKeyframeAnims = function (dt, dirty) {
    const anims = this._keyframeAnims;
    for (let a = anims.length - 1; a >= 0; a--) {
      const anim = anims[a];
      anim.elapsed += dt;
      let run = anim.runs[anim.run];
      let pos;
      let tf;
      while (true) {
        if (anim.elapsed < run.total) {
          const k = run.main.k;
          const lin = run.total > 0 ? anim.elapsed / run.total : 1;
          const eased = k.easing ? Easing.sample(k.easing, k.rate, lin) : lin;
          pos = this._keyframeRunPos(run, eased * run.total);
          tf = this._keyframeRunTransform(run, eased * run.total);
          break;
        }
        anim.elapsed -= run.total;
        const reached = run.pts.slice(1);
        for (const p of reached) this._spawnKeyframe(p.k);
        anim.run++;
        if (anim.run >= anim.runs.length) {
          const end = run.pts[run.pts.length - 1];
          pos = { x: end.x, y: end.y };
          tf = { rot: end.rot, sx: end.sx, sy: end.sy };
          anims.splice(a, 1);
          break;
        }
        run = anim.runs[anim.run];
      }
      const ddx = pos.x - anim.lastX;
      const ddy = pos.y - anim.lastY;
      anim.lastX = pos.x;
      anim.lastY = pos.y;
      const pivot = anim.trig.centerGroup > 0 ? anim.trig.centerGroup : anim.target;
      if (tf && tf.rot !== anim.lastRot) {
        const rot = this._groupRotations[anim.target] ||= { totalRad: 0, centerGroupId: pivot, lockRotation: false };
        rot.totalRad += (tf.rot - anim.lastRot) * Math.PI / 180;
        rot.centerGroupId = pivot;
        anim.lastRot = tf.rot;
        dirty.add(anim.target);
      }
      if (tf && (tf.sx !== anim.lastSx || tf.sy !== anim.lastSy) && anim.lastSx && anim.lastSy) {
        this._hasGroupScales = true;
        const sc = this._groupScales[anim.target] ||= { sx: 1, sy: 1, centerGroupId: pivot, onlyMove: false };
        sc.sx *= tf.sx / anim.lastSx;
        sc.sy *= tf.sy / anim.lastSy;
        sc.centerGroupId = pivot;
        anim.lastSx = tf.sx;
        anim.lastSy = tf.sy;
        dirty.add(anim.target);
      }
      if (ddx === 0 && ddy === 0) continue;
      const off = this._groupOffsets[anim.target] ||= { x: 0, y: 0 };
      off.x += ddx;
      off.y -= ddy;
      dirty.add(anim.target);
    }
  };

  proto._spawnKeyframe = function (k) {
    if (!(k.spawnGroup > 0)) return;
    if (k.spawnDelay > 0) {
      (this._keyframeSpawns ||= []).push({ group: k.spawnGroup, time: k.spawnDelay });
    } else {
      this._spawnGroupNow(k.spawnGroup);
    }
  };

  proto.updateAdvancedTriggers = function (dt) {
    const dirty = this._getDirtyGroupSet();
    if (this._keyframeSpawns?.length) {
      const due = [];
      this._keyframeSpawns = this._keyframeSpawns.filter(s => {
        s.time -= dt;
        if (s.time <= 0) due.push(s.group);
        return s.time > 0;
      });
      for (const g of due) this._spawnGroupNow(g);
    }
    if (this._keyframeAnims?.length) this._stepKeyframeAnims(dt, dirty);
    if (this._advFollows?.length) {
      const scene = this._scene || {};
      this._advFollowAcc += dt;
      let ticks = Math.floor(this._advFollowAcc / TICK + 1e-6);
      this._advFollowAcc -= ticks * TICK;
      ticks = Math.min(ticks, 60);
      for (let t = 0; t < ticks; t++) {
        this._advHistory.push({ x: Number(scene._playerWorldX) || 0, y: Number(scene._state?.y) || 0, y2: Number(scene._state2?.y) || 0 });
        if (this._advHistory.length > 2400) this._advHistory.splice(0, this._advHistory.length - 2400);
        for (const follow of this._advFollows) this._stepAdvancedFollow(follow, dirty);
      }
    }
    if (dirty.size) this._applyGroupTransforms(dirty);
  };

  proto.stopAdvancedTriggers = function (group) {
    const hit = trig => trig.targetGroup === group || trig.groups?.includes?.(group);
    if (this._advFollows?.length) this._advFollows = this._advFollows.filter(f => !hit(f.trig));
    if (this._keyframeAnims?.length) this._keyframeAnims = this._keyframeAnims.filter(a => !hit(a.trig) && a.target !== group);
  };

  function naturalSpline(xs, ys) {
    const n = xs.length;
    const h = [];
    for (let i = 0; i < n - 1; i++) h.push(xs[i + 1] - xs[i]);
    const m = Array(n).fill(0);
    if (n > 2) {
      const a = Array(n).fill(0), b = Array(n).fill(1), c = Array(n).fill(0), r = Array(n).fill(0);
      for (let i = 1; i < n - 1; i++) {
        a[i] = h[i - 1] / 6;
        b[i] = (h[i - 1] + h[i]) / 3;
        c[i] = h[i] / 6;
        r[i] = (ys[i + 1] - ys[i]) / h[i] - (ys[i] - ys[i - 1]) / h[i - 1];
      }
      for (let i = 1; i < n; i++) {
        const w = a[i] / b[i - 1];
        b[i] -= w * c[i - 1];
        r[i] -= w * r[i - 1];
      }
      m[n - 1] = r[n - 1] / b[n - 1];
      for (let i = n - 2; i >= 0; i--) m[i] = (r[i] - c[i] * m[i + 1]) / b[i];
    }
    return (x) => {
      let i = 0;
      while (i < n - 2 && x > xs[i + 1]) i++;
      const hi = h[i];
      const t1 = xs[i + 1] - x;
      const t0 = x - xs[i];
      return (m[i] * t1 * t1 * t1 + m[i + 1] * t0 * t0 * t0) / (6 * hi)
        + (ys[i] / hi - m[i] * hi / 6) * t1
        + (ys[i + 1] / hi - m[i + 1] * hi / 6) * t0;
    };
  }
})();
