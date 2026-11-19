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

  const ADV_FOLLOW_KEYS = [292, 293, 298, 299, 300, 301, 308, 309, 334, 335, 357, 358, 359, 360, 361, 362, 558, 559, 561, 562];

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
      scaleX: num(raw, 128, 1) * scale,
      scaleY: num(raw, 129, 1) * scale
    });
  };

  proto._parseAdvancedTrigger = function (trig, raw, id) {
    if (id === 3016) {
      trig.followTarget = flag(raw, 138) ? -1 : flag(raw, 200) ? -2 : flag(raw, 201) ? -3 : int(raw, 71);
      trig.p = {};
      for (const k of ADV_FOLLOW_KEYS) trig.p[k] = num(raw, k);
      trig.xOnly = flag(raw, 306);
      trig.yOnly = flag(raw, 307);
      trig.mode = int(raw, 367);
      return;
    }
    trig.animGroup = int(raw, 76);
    trig.timeMod = num(raw, 520);
    trig.posXMod = num(raw, 521);
    trig.posYMod = num(raw, 545) || trig.posXMod;
  };

  proto._fireAdvancedTrigger = function (trig) {
    if (trig.kind === "advFollow") {
      if (!(trig.targetGroup > 0)) return;
      const p = trig.p;
      const r = () => Math.random() * 2 - 1;
      this._advFollows = this._advFollows.filter(f => !(f.trig === trig));
      this._advFollows.push({
        trig,
        vx: 0,
        vy: 0,
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
    const target = follow.trig.followTarget;
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
    if (trig.mode === 1 || trig.mode === 2) {
      let accel = follow.accel * 0.01;
      let friction = follow.friction * 0.01;
      if (follow.nearDist > 0 && dist < follow.nearDist) {
        const t = 1 - dist / follow.nearDist;
        accel += (follow.nearAccel * 0.01 - accel) * t;
        friction += (follow.nearFriction * 0.01 - friction) * t;
      }
      if (friction !== 0) {
        if (!trig.xOnly || trig.yOnly) follow.vx -= follow.vx * friction;
        if (!trig.yOnly || trig.xOnly) follow.vy -= follow.vy * friction;
      }
      const len = Math.hypot(dx, dy) || 1;
      if (!trig.yOnly) follow.vx += (dx / len) * accel;
      if (!trig.xOnly) follow.vy += (dy / len) * accel;
    } else {
      const div = Math.max(1, follow.easing);
      if (!trig.yOnly) follow.vx = dx / div;
      if (!trig.xOnly) follow.vy = dy / div;
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
    let mx = trig.yOnly ? 0 : follow.vx;
    let my = trig.xOnly ? 0 : follow.vy;
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
      this._keyframeAnims.push({ trig, animId, target, runs, run: 0, elapsed: 0, lastX: base.x, lastY: base.y });
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

  proto._stepKeyframeAnims = function (dt, dirty) {
    const anims = this._keyframeAnims;
    for (let a = anims.length - 1; a >= 0; a--) {
      const anim = anims[a];
      anim.elapsed += dt;
      let run = anim.runs[anim.run];
      let pos;
      while (true) {
        if (anim.elapsed < run.total) {
          const k = run.main.k;
          const lin = run.total > 0 ? anim.elapsed / run.total : 1;
          const eased = k.easing ? Easing.sample(k.easing, k.rate, lin) : lin;
          pos = this._keyframeRunPos(run, eased * run.total);
          break;
        }
        anim.elapsed -= run.total;
        const reached = run.pts.slice(1);
        for (const p of reached) this._spawnKeyframe(p.k);
        anim.run++;
        if (anim.run >= anim.runs.length) {
          const end = run.pts[run.pts.length - 1];
          pos = { x: end.x, y: end.y };
          anims.splice(a, 1);
          break;
        }
        run = anim.runs[anim.run];
      }
      const ddx = pos.x - anim.lastX;
      const ddy = pos.y - anim.lastY;
      anim.lastX = pos.x;
      anim.lastY = pos.y;
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
