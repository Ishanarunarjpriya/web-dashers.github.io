function checkForAutoLoad() {
  const assetsLoaded = localStorage.getItem('webdash_assets_loaded') === 'true';
  const lastLoadTime = parseInt(localStorage.getItem('webdash_last_load_time') || '0');
  const now = Date.now();
  const hoursSinceLoad = (now - lastLoadTime) / (1000 * 60 * 60);
  if (assetsLoaded && hoursSinceLoad < 24 && window.gameCache.isCacheValid()) {
    const stats = window.gameCache.getCacheStats();
    if (stats.validEntries > 50) {
      console.log('auto loading from cache');
      return true;
    }
  }
  return false;
}
if (window.gameCache) {
  window.gameCache.init();
  const canAutoLoad = checkForAutoLoad();
  if (canAutoLoad) {
    const autoLoadIndicator = document.createElement('div');
    autoLoadIndicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #00ff00;
      color: #000;
      padding: 5px 10px;
      border-radius: 5px;
      font-family: Arial;
      font-size: 12px;
      z-index: 9999;
    `;
    autoLoadIndicator.textContent = 'turbo loading';
    document.body.appendChild(autoLoadIndicator);
    setTimeout(() => {
      if (autoLoadIndicator.parentNode) {
        autoLoadIndicator.parentNode.removeChild(autoLoadIndicator);
      }
    }, 3000);
  }
}
l(getDynamicScreenWidth());
const phaserConfig = {
  type: Phaser.AUTO,
  width: screenWidth,
  height: screenHeight,
  resolution: 1,
  fps: {
    smoothStep: true
  },
  backgroundColor: "#000000",
  parent: document.body,
  input: {
    windowEvents: false
  },
  render: {
    powerPreference: "default",
    antialiasGL: false,
    roundPixels: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, GameScene]
};
(() => {
  const frameProto = Phaser.Textures.Frame.prototype;
  const insetFrameUVs = frame => {
    const src = frame.source;
    if (!src || !src.width || !src.height || frame.name === "__BASE") return;
    if (frame.width >= src.width && frame.height >= src.height) return;
    const du = 0.5 / src.width;
    const dv = 0.5 / src.height;
    const cu = (frame.u0 + frame.u1) / 2;
    const cv = (frame.v0 + frame.v1) / 2;
    frame.u0 += frame.u0 < cu ? du : -du;
    frame.u1 += frame.u1 < cu ? du : -du;
    frame.v0 += frame.v0 < cv ? dv : -dv;
    frame.v1 += frame.v1 < cv ? dv : -dv;
  };
  for (const method of ["updateUVs", "updateUVsInverted"]) {
    const original = frameProto[method];
    if (typeof original !== "function") continue;
    frameProto[method] = function (...args) {
      const result = original.apply(this, args);
      insetFrameUVs(this);
      return result;
    };
  }
})();
(() => {
  const rendererProto = Phaser.Renderer.WebGL.WebGLRenderer.prototype;
  const resize = rendererProto.resize;
  window.getRenderScale = () => {
    let highRes = false;
    try { highRes = JSON.parse(localStorage.getItem("gd_settings") || "{}").highRes === true; } catch (e) {}
    return highRes ? Math.min(2, Math.max(1, window.devicePixelRatio || 1)) : 1;
  };
  window.renderScale = window.getRenderScale();
  try {
    window.useUhdTextures = window.renderScale > 1 && JSON.parse(localStorage.getItem("gd_settings") || "{}").uhdTextures === true;
  } catch (e) {
    window.useUhdTextures = false;
  }
  rendererProto.resize = function (width, height) {
    const gl = this.gl;
    if (gl && !gl._wdScaled) {
      gl._wdScaled = true;
      let boundFramebuffer = null;
      let viewportBox = null;
      let scissorBox = null;
      const bindFramebuffer = gl.bindFramebuffer.bind(gl);
      const viewport = gl.viewport.bind(gl);
      const scissor = gl.scissor.bind(gl);
      const applyViewport = () => {
        const k = boundFramebuffer ? 1 : window.renderScale;
        const [x, y, w, h] = viewportBox;
        viewport(x * k, y * k, w * k, h * k);
      };
      const applyScissor = () => {
        const k = boundFramebuffer ? 1 : window.renderScale;
        const [x, y, w, h] = scissorBox;
        scissor(x * k, y * k, w * k, h * k);
      };
      gl.bindFramebuffer = (target, framebuffer) => {
        const changed = !boundFramebuffer !== !framebuffer;
        boundFramebuffer = framebuffer;
        bindFramebuffer(target, framebuffer);
        if (changed && window.renderScale !== 1) {
          if (viewportBox) applyViewport();
          if (scissorBox) applyScissor();
        }
      };
      gl.viewport = (x, y, w, h) => {
        viewportBox = [x, y, w, h];
        applyViewport();
      };
      gl.scissor = (x, y, w, h) => {
        scissorBox = [x, y, w, h];
        applyScissor();
      };
      Object.defineProperty(gl, "drawingBufferHeight", { get: () => this.canvas.height / window.renderScale });
    }
    const k = window.renderScale;
    const canvasW = Math.round(width * k);
    const canvasH = Math.round(height * k);
    if (this.canvas.width !== canvasW || this.canvas.height !== canvasH) {
      this.canvas.width = canvasW;
      this.canvas.height = canvasH;
    }
    return resize.call(this, width, height);
  };
  window.setRenderScale = (k) => {
    window.renderScale = k;
    const renderer = window._wdGame?.renderer;
    if (renderer?.gl) renderer.resize(renderer.width, renderer.height);
  };
})();
window._wdGame = new Phaser.Game(phaserConfig);
window.setFpsLimit = (limit) => {
  const loop = window._wdGame?.loop;
  if (!loop || loop.fpsLimit === limit) return;
  loop.fpsLimit = limit;
  loop.hasFpsLimit = limit > 0;
  loop._limitRate = limit > 0 ? 1000 / limit : 0;
  loop.stepLimitFPS = function (t) {
    this.now = t;
    let delta = Math.max(0, t - this.lastTime);
    this.rawDelta = delta;
    this.time += delta;
    if (this.smoothStep) delta = this.smoothDelta(delta);
    this.delta += delta;
    if (t >= this.nextFpsUpdate) this.updateFPS(t);
    this.framesThisSecond++;
    if (this.delta >= this._limitRate - this.rawDelta / 2) {
      this.callback(t, this.delta);
      this.delta = 0;
    }
    this.lastTime = t;
    this.frame++;
  };
  if (loop.running) {
    loop.sleep();
    loop.wake();
  }
};

window.clearGameCache = () => {
  if (window.gameCache) {
    window.gameCache.clearCache();
    localStorage.removeItem('webdash_assets_loaded');
    localStorage.removeItem('webdash_last_load_time');
    console.log('Game cache cleared');
    location.reload();
  }
};

window.getCacheInfo = () => {
  if (window.gameCache) {
    return window.gameCache.getCacheStats();
  }
  return null;
};
