(() => {
  const proto = window.LevelObject.prototype;
  const AREA_KEYS = [218, 219, 220, 221, 222, 223, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 242, 243, 248, 249, 252, 253, 263, 264, 265, 270, 271, 275, 282, 285, 286, 288];

  const num = (raw, key, fallback = 0) => {
    const parsed = parseFloat(raw?.[key] ?? raw?.[String(key)]);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const flag = (raw, key) => String(raw?.[key] ?? raw?.[String(key)] ?? "0") === "1";

  const objectRandom = (spr, slot) => {
    const seed = (Math.round(spr._areaSeedX * 7) * 73856093) ^ (Math.round(spr._areaSeedY * 7) * 19349663) ^ (slot * 83492791);
    const x = Math.sin(seed) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  };

  proto.resetAreaEffects = function () {
    for (const spr of this._areaTouchedSprites || []) this._restoreAreaSprite(spr);
    for (const col of this._areaTouchedColliders || []) this._restoreAreaCollider(col);
    for (const spr of this._enterTouchedSprites || []) this._restoreEnterSprite(spr);
    this._enterEffects = [];
    this._enterTouchedSprites = new Set();
    this._areaEffects = [];
    this._areaTouchedSprites = new Set();
    this._areaTouchedColliders = new Set();
  };

  proto._parseAreaTrigger = function (trig, raw, id) {
    trig.areaId = id;
    trig.areaRaw = raw;
    trig.areaGroups = String(raw?.[57] ?? "").split(".").map(g => parseInt(g, 10)).filter(g => g > 0);
    trig.areaEffectId = parseInt(raw?.[225] ?? 0, 10) || 0;
  };

  proto._fireAreaTrigger = function (trig) {
    if (!this._areaEffects) this.resetAreaEffects();
    const id = trig.areaId;
    const raw = trig.areaRaw;
    if (id >= 3006 && id <= 3010) {
      const params = {};
      for (const key of AREA_KEYS) params[key] = num(raw, key);
      if (!params[263]) params[263] = 1;
      if (!params[264]) params[264] = 1;
      const effect = {
        type: id - 3006,
        source: trig,
        target: parseInt(raw?.[51] ?? 0, 10) || 0,
        center: num(raw, 538) || (flag(raw, 138) ? -1 : flag(raw, 200) ? -2 : num(raw, 71)),
        mode: num(raw, 262),
        inwards: flag(raw, 276),
        relative: flag(raw, 287),
        xyMode: flag(raw, 241),
        channel: num(raw, 260),
        mainOnly: flag(raw, 65),
        detailOnly: flag(raw, 66),
        params,
        tweens: new Map()
      };
      this._areaEffects = this._areaEffects.filter(e => e.source !== trig);
      if (trig.areaEffectId > 0) this._areaEffects = this._areaEffects.filter(e => e.source.areaEffectId !== trig.areaEffectId);
      this._areaEffects.push(effect);
    } else if (id >= 3011 && id <= 3015) {
      const type = id - 3011;
      const target = parseInt(raw?.[51] ?? 0, 10) || 0;
      const useId = flag(raw, 355);
      const duration = Math.max(0, num(raw, 10));
      const easingType = num(raw, 30);
      const easingRate = num(raw, 85) > 0 ? num(raw, 85) : 2;
      for (const effect of this._areaEffects) {
        if (effect.type !== type) continue;
        const matches = useId ? effect.source.areaEffectId === target : effect.source.areaGroups.includes(target);
        if (!matches) continue;
        for (const key of AREA_KEYS) {
          const value = num(raw, key, -99);
          if (value === -99 || raw?.[key] === undefined) continue;
          if (duration <= 0) {
            effect.params[key] = value;
            effect.tweens.delete(key);
          } else {
            effect.tweens.set(key, { from: effect.params[key], to: value, elapsed: 0, duration, easingType, easingRate });
          }
        }
      }
    } else if (id >= 3017 && id <= 3021) {
      const params = {};
      for (const key of AREA_KEYS) params[key] = num(raw, key);
      const effect = {
        type: id - 3017,
        source: trig,
        channel: num(raw, 344),
        side: num(raw, 217),
        xyMode: flag(raw, 241),
        tintChannel: num(raw, 260),
        mainOnly: flag(raw, 65),
        detailOnly: flag(raw, 66),
        params
      };
      this._enterEffects = (this._enterEffects || []).filter(e => e.source !== trig && !(trig.areaEffectId > 0 && e.source.areaEffectId === trig.areaEffectId));
      this._enterEffects.push(effect);
    } else if (id === 3023) {
      const channel = num(raw, 344);
      const effectId = trig.areaEffectId;
      this._enterEffects = (this._enterEffects || []).filter(e => effectId > 0 ? e.source.areaEffectId !== effectId : e.channel !== channel);
    } else if (id === 3024) {
      const target = parseInt(raw?.[51] ?? 0, 10) || 0;
      const useId = flag(raw, 355);
      this._areaEffects = this._areaEffects.filter(effect => !(useId ? effect.source.areaEffectId === target : effect.source.areaGroups.includes(target)));
    }
  };

  proto._areaCenter = function (center) {
    const scene = this._scene;
    if (!scene) return null;
    if (center === -1 || center === -2) {
      const state = center === -2 && scene._isDual ? scene._state2 : scene._state;
      return state ? { x: scene._playerWorldX || 0, y: state.y || 0 } : null;
    }
    if (center > 0) {
      const guide = this._cameraGuides?.get(center);
      if (guide) return guide;
      const c = this._getGroupCenter(center);
      if (!c.cx && !c.cy) return null;
      return { x: c.cx, y: T - c.cy };
    }
    return null;
  };

  proto._areaValue = function (effect, x, y, center, spr) {
    const p = effect.params;
    let d;
    if (effect.mode === 2 || effect.mode === 1) {
      const along = effect.mode === 1 ? x - center.x : y - center.y;
      d = (along + 2 * p[221] * objectRandom(spr, 1)) ;
      d *= d >= 0 ? p[263] : p[264];
    } else {
      const cx = center.x + 2 * p[221] * objectRandom(spr, 1);
      const cy = center.y + 2 * p[253] * objectRandom(spr, 2);
      d = Math.hypot(x - cx, y - cy);
    }
    const length = Math.trunc(2 * (p[222] + p[223] * objectRandom(spr, 0)));
    let v = length !== 0 ? d / length : 1;
    const deadzone = p[282];
    if (deadzone !== 0) v = (v - deadzone) / (1 - deadzone);
    v = Math.max(0, Math.min(1, v));
    return effect.inwards ? 1 - v : v;
  };

  proto._areaEase = function (effect, v) {
    const type = effect.params[242];
    if (!type) return v;
    return Easing.sample(type, effect.params[243] > 0 ? effect.params[243] : 2, v);
  };

  proto._restoreAreaSprite = function (spr) {
    if (!spr || !spr._areaApplied) return;
    spr._areaApplied = false;
    if (spr._areaBaseRot !== undefined) spr.rotation = spr._areaBaseRot;
    if (spr._areaBaseScaleX !== undefined) spr.setScale?.(spr._areaBaseScaleX, spr._areaBaseScaleY);
    if (spr._areaBaseAlpha !== undefined) spr.alpha = spr._areaBaseAlpha;
    if (spr._areaBaseTint !== undefined && spr.setTint) spr.setTint(spr._areaBaseTint);
    spr._areaBaseRot = spr._areaBaseScaleX = spr._areaBaseScaleY = spr._areaBaseAlpha = spr._areaBaseTint = undefined;
    (this._alphaPendingSprites ||= new Set()).add(spr);
    (this._colorPendingSprites ||= new Set()).add(spr);
    if (!spr._beastManaged) {
      spr.x = spr._eeWorldX ?? spr.x;
      spr.y = spr._eeBaseY ?? spr.y;
    }
  };

  proto._restoreAreaCollider = function (col) {
    if (!col || !col._areaApplied) return;
    col._areaApplied = false;
    col.x = col._areaBaseX;
    col.y = col._areaBaseY;
    if (col._areaBaseRot !== undefined) col.rotationDegrees = col._areaBaseRot;
    col._areaBaseRot = undefined;
    if (col._eeCollisionSectionIndex !== Math.max(0, Math.floor(col.x / 400))) this._refreshCollisionSection?.(col);
  };

  proto._restoreEnterSprite = function (spr) {
    if (!spr || !spr._enterApplied) return;
    spr._enterApplied = false;
    if (!spr._beastManaged) {
      spr.x = spr._eeWorldX ?? spr.x;
      spr.y = spr._eeBaseY ?? spr.y;
    }
    if (spr._enterBaseRot !== undefined) spr.rotation = spr._enterBaseRot;
    if (spr._enterBaseScaleX !== undefined) spr.setScale?.(spr._enterBaseScaleX, spr._enterBaseScaleY);
    if (spr._enterBaseTint !== undefined && spr.setTint) spr.setTint(spr._enterBaseTint);
    spr.setAlpha?.(this._getGroupOpacityForSprite ? this._getGroupOpacityForSprite(spr) : 1);
    spr._enterBaseRot = spr._enterBaseScaleX = spr._enterBaseScaleY = spr._enterBaseTint = undefined;
  };

  proto.applyCustomEnterEffects = function (cameraX) {
    const effects = this._enterEffects;
    const touched = this._enterTouchedSprites || (this._enterTouchedSprites = new Set());
    if (!effects || !effects.length) {
      if (touched.size) {
        for (const spr of touched) this._restoreEnterSprite(spr);
        touched.clear();
      }
      return;
    }
    const zoom = this.cameraZoom || 1;
    const half = screenWidth / 2 / zoom;
    const centerX = cameraX + screenWidth / 2;
    const leftEdge = centerX - half;
    const rightEdge = centerX + half;
    const byChannel = new Map();
    let maxLen = 0;
    for (const effect of effects) {
      if (!byChannel.has(effect.channel)) byChannel.set(effect.channel, []);
      byChannel.get(effect.channel).push(effect);
      maxLen = Math.max(maxLen, Math.abs(2 * (effect.params[222] + Math.abs(effect.params[223]))) + Math.abs(2 * (effect.params[220] + Math.abs(effect.params[221]))));
    }
    const pad = this.getViewPad ? this.getViewPad() : 0;
    const edgeLimit = Math.max(maxLen, 140 + pad);
    const sideLists = new Map();
    for (const [ch, list] of byChannel) {
      sideLists.set(ch, [list.filter(e => e.side === 0 || e.side === 2), list.filter(e => e.side === 0 || e.side === 1)]);
    }
    const minSec = Math.max(0, Math.floor((leftEdge - pad) / 400));
    const maxSec = Math.min(this._sections.length - 1, Math.floor((rightEdge + pad) / 400));
    const seen = new Set();
    for (let sec = minSec; sec <= maxSec; sec++) {
      const list = this._sections[sec];
      if (!list) continue;
      for (const spr of list) {
        if (!spr || !spr.active) continue;
        const x = spr._eeWorldX;
        if (!(x - leftEdge <= edgeLimit || rightEdge - x <= edgeLimit)) continue;
        const sides = sideLists.get(spr._eeEnterChannel || 0);
        if (!sides) continue;
        if (!Number.isFinite(x)) continue;
        const rightSide = x > centerX;
        const sideEffects = sides[rightSide ? 1 : 0];
        if (!sideEffects.length) continue;
        spr._areaSeedX ??= x;
        spr._areaSeedY ??= spr._eeBaseY;
        let dx = 0, dy = 0, rot = 0, sx = 1, sy = 1, alpha = 1, tint = null, any = false;
        for (const effect of sideEffects) {
          const p = effect.params;
          const sign = rightSide ? -1 : 1;
          const edge = rightSide ? rightEdge : leftEdge;
          const length = Math.trunc(2 * (p[222] + p[223] * objectRandom(spr, 0)));
          let v = length !== 0 ? sign * ((x - (edge + 2 * p[220])) + 2 * p[221] * objectRandom(spr, 1)) / length : 1;
          const deadzone = p[282];
          if (deadzone !== 0) v = (v - deadzone) / (1 - deadzone);
          if (v >= 1) continue;
          v = Math.max(0, v);
          any = true;
          const e = this._areaEase(effect, v);
          if (effect.type === 0) {
            if (effect.xyMode) {
              dx += sign * 2 * (p[237] + objectRandom(spr, 3) * p[238]) * (1 - e);
              dy += sign * 2 * (p[239] + objectRandom(spr, 4) * p[240]) * (1 - e);
            } else {
              const dist = 2 * (p[218] + p[219] * objectRandom(spr, 5)) * (1 - e);
              const angle = (p[231] + objectRandom(spr, 6) * p[232] - 90) * Math.PI / 180;
              dx += Math.cos(angle) * dist;
              dy += Math.sin(angle) * dist;
            }
          } else if (effect.type === 1) {
            rot += (p[270] + objectRandom(spr, 7) * p[271]) * (1 - e);
          } else if (effect.type === 2) {
            sx *= (1 - e) * (p[233] + objectRandom(spr, 8) * p[234] - 1) + 1;
            sy *= (1 - e) * (p[235] + objectRandom(spr, 9) * p[236] - 1) + 1;
          } else if (effect.type === 3) {
            alpha *= e;
          } else if (effect.type === 4) {
            if (effect.detailOnly && !spr._eeIsDetail) continue;
            if (effect.mainOnly && spr._eeIsDetail) continue;
            tint = { channel: effect.tintChannel, keep: (1 - p[265]) + p[265] * v };
          }
        }
        seen.add(spr);
        if (!spr._enterApplied) {
          spr._enterApplied = true;
          spr._enterBaseRot = spr.rotation;
          spr._enterBaseScaleX = spr.scaleX;
          spr._enterBaseScaleY = spr.scaleY;
          spr._enterBaseTint = spr.tintTopLeft;
          touched.add(spr);
        }
        if (!spr._beastManaged) {
          spr.x = x + dx;
          spr.y = spr._eeBaseY - dy;
        }
        spr.rotation = spr._enterBaseRot + rot * Math.PI / 180;
        spr.setScale?.(spr._enterBaseScaleX * sx, spr._enterBaseScaleY * sy);
        const groupAlpha = this._getGroupOpacityForSprite ? this._getGroupOpacityForSprite(spr) : 1;
        spr.setAlpha?.(any ? groupAlpha * alpha : groupAlpha);
        if (tint && spr.setTint) {
          const color = this._scene?._colorManager?.getColor?.(tint.channel);
          const base = spr._enterBaseTint ?? 0xffffff;
          if (color) {
            const k = Math.max(0, Math.min(1, tint.keep));
            const mix = (c, b) => Math.round(c + (b - c) * k);
            spr.setTint((mix(color.r, (base >> 16) & 255) << 16) | (mix(color.g, (base >> 8) & 255) << 8) | mix(color.b, base & 255));
          }
        } else if (spr._enterBaseTint !== undefined && spr.setTint) {
          spr.setTint(spr._enterBaseTint);
        }
      }
    }
    for (const spr of touched) {
      if (!seen.has(spr)) {
        this._restoreEnterSprite(spr);
        touched.delete(spr);
      }
    }
  };

  proto._areaBucketsFor = function (target, list) {
    const m = this._areaBuckets || (this._areaBuckets = new Map());
    let c = m.get(target);
    if (c && c.list === list && c.len === list.length) return c;
    c = { list, len: list.length, secs: new Map(), loose: [] };
    for (const spr of list) {
      if (!spr) continue;
      const sec = spr._eeSectionIndex;
      if (Number.isInteger(sec) && sec >= 0) {
        let bucket = c.secs.get(sec);
        if (!bucket) c.secs.set(sec, bucket = []);
        bucket.push(spr);
      } else c.loose.push(spr);
    }
    m.set(target, c);
    return c;
  };

  proto._areaMoveBucket = function (spr, from, to) {
    const m = this._areaBuckets;
    if (!m || !spr._eeGroups) return;
    for (const g of spr._eeGroups) {
      const c = m.get(g);
      if (!c) continue;
      const a = c.secs.get(from);
      const i = a ? a.indexOf(spr) : -1;
      if (i === -1) continue;
      a[i] = a[a.length - 1];
      a.pop();
      let bucket = c.secs.get(to);
      if (!bucket) c.secs.set(to, bucket = []);
      bucket.push(spr);
    }
  };

  proto.updateAreaEffects = function (dt) {
    const effects = this._areaEffects;
    if (!effects || !effects.length) {
      if (this._areaTouchedSprites?.size) this.resetAreaEffects();
      return;
    }
    for (const effect of effects) {
      for (const [key, tween] of effect.tweens) {
        tween.elapsed += dt;
        const progress = Math.min(1, tween.elapsed / tween.duration);
        effect.params[key] = tween.from + (tween.to - tween.from) * Easing.sample(tween.easingType, tween.easingRate, progress);
        if (progress >= 1) effect.tweens.delete(key);
      }
    }
    const stamp = this._areaStamp = (this._areaStamp || 0) + 1;
    const spriteList = this._areaSpriteList || (this._areaSpriteList = []);
    const colliderList = this._areaColliderList || (this._areaColliderList = []);
    spriteList.length = 0;
    colliderList.length = 0;
    const stateFor = (isCollider, obj) => {
      let s = obj._areaSt;
      if (obj._areaStamp !== stamp) {
        if (!s) s = obj._areaSt = { dx: 0, dy: 0, rot: 0, sx: 0, sy: 0, alpha: null, tint: null };
        else {
          s.dx = 0; s.dy = 0; s.rot = 0; s.sx = 0; s.sy = 0; s.alpha = null; s.tint = null;
        }
        obj._areaStamp = stamp;
        (isCollider ? colliderList : spriteList).push(obj);
      }
      return s;
    };
    const camX = Number(this._scene?._cameraX) || 0;
    const viewW = screenWidth / (this.cameraZoom || 1) + (this.getViewPad?.() || 0) * 2;
    for (const effect of effects) {
      if (!effect.target) continue;
      const center = this._areaCenter(effect.center);
      if (!center) continue;
      const p = effect.params;
      const reach = 2 * (Math.abs(p[218] || 0) + Math.abs(p[219] || 0) + Math.abs(p[237] || 0) + Math.abs(p[238] || 0) + Math.abs(p[239] || 0) + Math.abs(p[240] || 0)) + 240;
      const minX = camX - reach;
      const maxX = camX + viewW + reach;
      const sprites = this._dedupeGroupList("_groupSpriteDedupe", this._groupSprites?.[effect.target]) || [];
      const colliders = this._dedupeGroupList("_groupColliderDedupe", this._groupColliders?.[effect.target]) || [];
      const apply = (obj, x, y, isCollider) => {
        obj._areaSeedX ??= x;
        obj._areaSeedY ??= y;
        const v = this._areaValue(effect, x, y, center, obj);
        if (effect.type === 3) {
          const s = stateFor(isCollider, obj);
          s.alpha = p[286] + v * (p[275] - p[286]);
          return;
        }
        if (v >= 1) return;
        if (effect.type === 4) {
          if (isCollider) return;
          if (effect.mainOnly && obj._eeIsDetail) return;
          if (effect.detailOnly && !obj._eeIsDetail) return;
          const s = stateFor(false, obj);
          s.tint = { amount: (1 - v) * (p[265] || 1), channel: effect.channel };
          return;
        }
        const e = this._areaEase(effect, v);
        const s = stateFor(isCollider, obj);
        if (effect.type === 0) {
          let mx = 0, my = 0;
          if (effect.xyMode) {
            mx = 2 * (p[237] + objectRandom(obj, 3) * p[238]) * (1 - e);
            my = 2 * (p[239] + objectRandom(obj, 4) * p[240]) * (1 - e);
          } else {
            let dist = 2 * (p[218] + p[219] * objectRandom(obj, 5));
            if (dist === 0) return;
            let dirX, dirY;
            if (effect.relative) {
              const rx = x - center.x;
              const ry = y - center.y;
              const len = Math.hypot(rx, ry);
              const cap = Math.max(0, p[288]) * 2;
              if (len < cap) dist = dist * len / cap;
              if (len <= 0) return;
              dirX = rx / len;
              dirY = ry / len;
            } else {
              const angle = (p[231] + objectRandom(obj, 6) * p[232] - 90) * Math.PI / 180;
              dirX = Math.cos(angle);
              dirY = Math.sin(angle);
            }
            mx = dirX * dist * (1 - e);
            my = dirY * dist * (1 - e);
          }
          s.dx += mx;
          s.dy += my;
        } else if (effect.type === 1) {
          s.rot += (p[270] + objectRandom(obj, 7) * p[271]) * (1 - e);
        } else if (effect.type === 2) {
          s.sx += (p[233] + objectRandom(obj, 8) * p[234] - 1) * (1 - e);
          s.sy += (p[235] + objectRandom(obj, 9) * p[236] - 1) * (1 - e);
        }
      };
      const visit = (spr) => {
        if (!spr || !spr.active) return;
        const bx = spr._eeWorldX ?? spr.x;
        if (bx < minX || bx > maxX) return;
        const by = spr._eeBaseY ?? spr.y;
        apply(spr, bx, T - by, false);
      };
      if (sprites.length) {
        const buckets = this._areaBucketsFor(Number(effect.target), sprites);
        for (const spr of buckets.loose) visit(spr);
        const secHi = Math.floor(maxX / 400);
        for (let sec = Math.max(0, Math.floor(minX / 400)); sec <= secHi; sec++) {
          const bucket = buckets.secs.get(sec);
          if (bucket) for (let i = 0; i < bucket.length; i++) visit(bucket[i]);
        }
      }
      for (const col of colliders) {
        if (!col) continue;
        const cbx = col._areaApplied ? col._areaBaseX : col.x;
        if (cbx < minX || cbx > maxX) continue;
        if (!col._areaApplied) {
          col._areaBaseX = col.x;
          col._areaBaseY = col.y;
        } else if (col._baseX !== undefined && col._baseX !== col._areaLastBaseX) {
          col._areaBaseX = col._baseX;
          col._areaBaseY = col._baseY;
        }
        col._areaLastBaseX = col._baseX;
        apply(col, col._areaBaseX, col._areaBaseY, true);
      }
    }
    const touchedSprites = this._areaTouchedSprites;
    for (const spr of touchedSprites) {
      if (spr._areaStamp !== stamp) {
        this._restoreAreaSprite(spr);
        touchedSprites.delete(spr);
      }
    }
    for (let si = 0; si < spriteList.length; si++) {
      const spr = spriteList[si];
      const s = spr._areaSt;
      if (!spr._areaApplied) {
        spr._areaApplied = true;
        spr._areaBaseRot = spr.rotation;
        spr._areaBaseScaleX = spr.scaleX;
        spr._areaBaseScaleY = spr.scaleY;
        spr._areaBaseAlpha = spr.alpha;
        spr._areaBaseTint = spr.tintTopLeft;
        touchedSprites.add(spr);
      }
      if (!spr._beastManaged) {
        const nx = (spr._eeWorldX ?? spr.x) + s.dx;
        const ny = (spr._eeBaseY ?? spr.y) - s.dy;
        if (spr.x !== nx) spr.x = nx;
        if (spr.y !== ny) spr.y = ny;
      }
      const nr = spr._areaBaseRot + s.rot * Math.PI / 180;
      if (spr.rotation !== nr) spr.rotation = nr;
      if (s.sx || s.sy) {
        const tx = spr._areaBaseScaleX + s.sx * Math.sign(spr._areaBaseScaleX || 1);
        const ty = spr._areaBaseScaleY + s.sy * Math.sign(spr._areaBaseScaleY || 1);
        if (spr.scaleX !== tx || spr.scaleY !== ty) spr.setScale?.(tx, ty);
      }
      if (s.alpha !== null) {
        const na = Math.max(0, Math.min(1, s.alpha));
        if (spr.alpha !== na) spr.alpha = na;
      }
      if (s.tint && spr.setTint) {
        const color = this._scene?._colorManager?.getColor?.(s.tint.channel);
        if (color) {
          const base = spr._areaBaseTint ?? 0xffffff;
          const t = Math.max(0, Math.min(1, s.tint.amount));
          const r = ((base >> 16) & 255) + (color.r - ((base >> 16) & 255)) * t;
          const g = ((base >> 8) & 255) + (color.g - ((base >> 8) & 255)) * t;
          const b = (base & 255) + (color.b - (base & 255)) * t;
          const nt = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
          if (spr.tintTopLeft !== nt) spr.setTint(nt);
        }
      }
    }
    const touchedColliders = this._areaTouchedColliders;
    for (const col of touchedColliders) {
      if (col._areaStamp !== stamp) {
        this._restoreAreaCollider(col);
        touchedColliders.delete(col);
      }
    }
    for (let ci = 0; ci < colliderList.length; ci++) {
      const col = colliderList[ci];
      const s = col._areaSt;
      if (!col._areaApplied) {
        col._areaApplied = true;
        col._areaBaseRot = col.rotationDegrees;
        touchedColliders.add(col);
      }
      col.x = col._areaBaseX + s.dx;
      col.y = col._areaBaseY + s.dy;
      col.rotationDegrees = (col._areaBaseRot || 0) - s.rot;
      if (col._eeCollisionSectionIndex !== Math.max(0, Math.floor(col.x / 400))) this._refreshCollisionSection?.(col);
    }
  };
})();
