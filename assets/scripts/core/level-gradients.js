(() => {
  const proto = window.LevelObject.prototype;

  const rv = (raw, key) => raw?.[key] ?? raw?.[String(key)];
  const int = (raw, key, fallback = 0) => {
    const v = parseInt(rv(raw, key) ?? fallback, 10);
    return Number.isFinite(v) ? v : fallback;
  };
  const num = (raw, key, fallback = 0) => {
    const v = parseFloat(rv(raw, key) ?? fallback);
    return Number.isFinite(v) ? v : fallback;
  };
  const flag = (raw, key) => String(rv(raw, key) ?? "0") === "1";

  const WORLD_DEPTH = { 0: -13, 3: -12, 4: -9, 5: -6, 6: 3, 7: 6, 8: 7.5, 9: 9, 10: 10.5, 11: 12, 12: 13.5 };
  const SCREEN_DEPTH = { 1: -9.9, 2: -9.8, 13: 19.9, 14: 22.5, 15: 60 };
  const SQRT2 = Math.SQRT2;

  proto._parseGradientTrigger = function (trig, raw) {
    trig.gradientId = Math.min(999, int(raw, 209));
    trig.gradientLayer = int(raw, 202);
    trig.gradientBlend = int(raw, 174);
    trig.gradientGroups = [int(raw, 203), int(raw, 204), int(raw, 205), int(raw, 206)];
    trig.vertexMode = flag(raw, 207);
    trig.disable = flag(raw, 208);
    trig.disableAll = flag(raw, 508);
    trig.color1 = int(raw, 21) || 1004;
    trig.color2 = int(raw, 22) || 1004;
    trig.hsv1 = flag(raw, 41) && rv(raw, 43) ? parseChannelHsv(rv(raw, 43)) : null;
    trig.hsv2 = flag(raw, 42) && rv(raw, 44) ? parseChannelHsv(rv(raw, 44)) : null;
    trig.rotation = num(raw, 6);
    trig.gradientZ = Math.max(-5, Math.min(5, int(raw, 25)));
  };

  proto.resetGradients = function () {
    if (this._gradients) for (const g of this._gradients.values()) g.gfx?.destroy();
    this._gradients = new Map();
  };

  proto._destroyGradient = function (id) {
    const g = this._gradients?.get(id);
    if (!g) return;
    g.gfx?.destroy();
    this._gradients.delete(id);
  };

  proto._invertBlendMode = function () {
    if (this._invertBlend !== undefined) return this._invertBlend;
    const renderer = this._scene?.game?.renderer;
    const gl = renderer?.gl;
    this._invertBlend = gl && renderer.addBlendMode
      ? renderer.addBlendMode([gl.ONE_MINUS_DST_COLOR, gl.ONE_MINUS_SRC_COLOR], gl.FUNC_ADD)
      : Phaser.BlendModes.DIFFERENCE;
    return this._invertBlend;
  };

  proto._fireGradientTrigger = function (trig) {
    this._gradients ||= new Map();
    if (trig.disableAll) {
      for (const id of [...this._gradients.keys()]) this._destroyGradient(id);
      return;
    }
    if (trig.disable) {
      this._destroyGradient(trig.gradientId);
      return;
    }
    const layer = trig.gradientLayer;
    const screen = SCREEN_DEPTH[layer] !== undefined;
    let g = this._gradients.get(trig.gradientId);
    if (g && g.screen !== screen) {
      this._destroyGradient(trig.gradientId);
      g = null;
    }
    const scene = this._scene;
    if (!scene) return;
    if (!g) {
      const gfx = scene.add.graphics();
      g = { gfx, screen };
      this._gradients.set(trig.gradientId, g);
    }
    g.trig = trig;
    const blend = trig.gradientBlend === 1 ? (window.S ?? Phaser.BlendModes.ADD)
      : trig.gradientBlend === 2 ? (window.E ?? Phaser.BlendModes.MULTIPLY)
      : trig.gradientBlend === 3 ? this._invertBlendMode()
      : Phaser.BlendModes.NORMAL;
    g.gfx.setBlendMode(blend);
    if (screen) {
      if (g.gfx.parentContainer) g.gfx.parentContainer.remove(g.gfx);
      g.gfx.setScrollFactor(0).setDepth(SCREEN_DEPTH[layer] + trig.gradientZ * 0.01);
    } else {
      const depth = (WORLD_DEPTH[layer] ?? WORLD_DEPTH[0]) - 0.6 + trig.gradientZ * 0.3;
      g.gfx.setDepth(depth);
      if (this._flatDepth) {
        const fc = this._getFlatContainers();
        if (g.gfx.parentContainer !== fc.normal) fc.normal.add(g.gfx);
        this._flatNeedsSort = true;
      } else if (g.gfx.parentContainer !== this.container) {
        if (depth < 7.5) this.container.addAt(g.gfx, 0);
        else this.container.add(g.gfx);
      }
    }
  };

  proto._gradientPoint = function (group) {
    if (!(group > 0)) return null;
    return this._advGroupRef?.(group, true) || null;
  };

  proto.updateGradients = function () {
    if (!this._gradients?.size) return;
    const scene = this._scene;
    const cm = scene?._colorManager;
    if (!cm) return;
    const zoom = this.cameraZoom || 1;
    const viewW = screenWidth / zoom;
    const viewH = screenHeight / zoom;
    const camX = Number(scene._cameraX) || 0;
    const camY = Number(scene._cameraY) || 0;
    for (const g of this._gradients.values()) {
      const trig = g.trig;
      if (!trig) continue;
      const opacityMod = this._getGroupOpacityForSprite({ _eeGroups: trig.groups });
      const c1 = applyChannelHsv(cm.getColor(trig.color1), trig.hsv1);
      const c2 = applyChannelHsv(cm.getColor(trig.color2), trig.hsv2);
      const a1 = opacityMod * cm.getOpacity(trig.color1);
      const a2 = opacityMod * cm.getOpacity(trig.color2);
      const gfx = g.gfx;
      gfx.clear();
      const black = c => !c.r && !c.g && !c.b;
      if ((a1 <= 0 && a2 <= 0) || (trig.gradientBlend === 1 && black(c1) && black(c2))) {
        gfx.setVisible(false);
        continue;
      }
      gfx.setVisible(true);
      let minX, maxX, minY, maxY;
      if (g.screen) {
        minX = 0;
        maxX = screenWidth;
        minY = 0;
        maxY = screenHeight;
      } else {
        const pad = 40;
        minX = camX - pad;
        maxX = camX + viewW + pad;
        minY = -camY - pad;
        maxY = -camY + viewH + pad;
      }
      const toLocal = p => g.screen
        ? { x: p.x - camX, y: (T - p.y) + camY }
        : { x: p.x, y: T - p.y };
      const pts = trig.gradientGroups.map(id => {
        const p = this._gradientPoint(id);
        return p ? toLocal(p) : null;
      });
      let bl, br, tl, tr;
      if (trig.vertexMode) {
        bl = pts[0] || { x: minX, y: maxY };
        br = pts[1] || { x: maxX, y: maxY };
        tl = pts[2] || { x: minX, y: minY };
        tr = pts[3] || { x: maxX, y: minY };
      } else {
        const top = pts[0] ? pts[0].y : minY;
        const bottom = pts[1] ? pts[1].y : maxY;
        const left = pts[2] ? pts[2].x : minX;
        const right = pts[3] ? pts[3].x : maxX;
        if (right <= left || bottom <= top) {
          gfx.setVisible(false);
          continue;
        }
        bl = { x: left, y: bottom };
        br = { x: right, y: bottom };
        tl = { x: left, y: top };
        tr = { x: right, y: top };
      }
      const a = -trig.rotation * Math.PI / 180;
      let ux = Math.cos(a);
      let uy = Math.sin(a);
      const k = SQRT2 / (Math.abs(ux) + Math.abs(uy));
      ux *= k;
      uy *= k;
      const w = (sx, sy) => (SQRT2 + sx * ux + sy * uy) / (2 * SQRT2);
      const mix = (t) => {
        const r = Math.round(c2.r + (c1.r - c2.r) * t);
        const gg = Math.round(c2.g + (c1.g - c2.g) * t);
        const b = Math.round(c2.b + (c1.b - c2.b) * t);
        return { color: (r << 16) | (gg << 8) | b, alpha: Math.max(0, Math.min(1, a2 + (a1 - a2) * t)) };
      };
      const cBL = mix(w(1, 1));
      const cBR = mix(w(-1, 1));
      const cTL = mix(w(1, -1));
      const cTR = mix(w(-1, -1));
      gfx.fillGradientStyle(cTL.color, cTR.color, cBL.color, cBR.color, cTL.alpha, cTR.alpha, cBL.alpha, cBR.alpha);
      gfx.fillTriangle(tl.x, tl.y, tr.x, tr.y, bl.x, bl.y);
      gfx.fillGradientStyle(cTR.color, cBR.color, cBL.color, cBL.color, cTR.alpha, cBR.alpha, cBL.alpha, cBL.alpha);
      gfx.fillTriangle(tr.x, tr.y, br.x, br.y, bl.x, bl.y);
    }
  };
})();
