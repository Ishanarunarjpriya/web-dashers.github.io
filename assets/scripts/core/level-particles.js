(() => {
  const FIELDS = ("maxParticles duration life lifeVar emission angle angleVar speed speedVar posVarX posVarY gravityX gravityY " +
    "accelRad accelRadVar accelTan accelTanVar startSize startSizeVar startSpin startSpinVar startR startRVar startG startGVar " +
    "startB startBVar startA startAVar endSize endSizeVar endSpin endSpinVar endR endRVar endG endGVar endB endBVar endA endAVar " +
    "fadeIn fadeInVar fadeOut fadeOutVar startRad startRadVar endRad endRadVar rotPerSec rotPerSecVar emitterMode positionType " +
    "additive spinEqual rotIsDir dynRot texture uniformColor frictionP frictionPVar respawn respawnVar orderSensitive sizeEqual " +
    "radEqual startRGBSync endRGBSync frictionS frictionSVar frictionR frictionRVar").split(" ");
  const DEG = Math.PI / 180;
  const rand = (base, variance) => base + variance * (Math.random() * 2 - 1);
  const clamp01 = value => Math.max(0, Math.min(1, value));
  const rawValue = (raw, key) => raw?.[key] ?? raw?.[String(key)];

  const parseParticleString = str => {
    if (!str) return null;
    const tokens = String(str).split("a");
    if (tokens.length < 50) return null;
    const cfg = {};
    FIELDS.forEach((name, i) => {
      const value = parseFloat(tokens[i]);
      cfg[name] = Number.isFinite(value) ? value : 0;
    });
    return cfg;
  };

  const randomColor = (r, rv, g, gv, b, bv, a, av, sync) => {
    const shared = Math.random() * 2 - 1;
    const pick = (base, variance) => clamp01(base + variance * (sync ? shared : Math.random() * 2 - 1));
    return [pick(r, rv), pick(g, gv), pick(b, bv), clamp01(rand(a, av))];
  };

  class GDParticle extends Phaser.GameObjects.Particles.Particle {
    fire(x, y) {
      const result = super.fire(x, y);
      const gd = this.emitter._gd;
      if (gd) gd.initParticle(this);
      return result;
    }
    update(delta, step, processors) {
      const dead = super.update(delta, step, processors);
      const gd = this.emitter._gd;
      if (gd && !dead) gd.stepParticle(this, delta / 1000);
      return dead;
    }
  }

  class GDParticleSystem {
    constructor(level, sprite, levelObj, cfg) {
      this.level = level;
      this.sprite = sprite;
      this.cfg = cfg;
      const raw = levelObj._raw || {};
      this.flipX = String(rawValue(raw, 4) ?? "0") === "1";
      this.flipY = String(rawValue(raw, 5) ?? "0") === "1";
      this.useObjColor = String(rawValue(raw, 146) ?? "0") === "1";
      this.uniformObjColor = String(rawValue(raw, 147) ?? "0") === "1";
      this.quickStart = String(rawValue(raw, 211) ?? "0") === "1";
      this.animateOnTrigger = String(rawValue(raw, 123) ?? "0") === "1";
      this.triggered = false;
      this.grouped = cfg.positionType === 2;
      this.emitter = null;
      this.started = false;
      this.frameName = `particle_${String(Math.max(0, cfg.texture | 0)).padStart(2, "0")}_001.png`;
    }

    create() {
      const scene = this.level._scene;
      const info = getAtlasFrame(scene, this.frameName) || getAtlasFrame(scene, "particle_00_001.png");
      if (!info) return false;
      const cfg = this.cfg;
      const life = Math.max(0.01, cfg.life);
      const rate = cfg.emission > 0 ? cfg.emission : Math.max(1, cfg.maxParticles) / life;
      const config = {
        frame: info.frame,
        lifespan: { min: Math.max(10, (life - cfg.lifeVar) * 1000), max: Math.max(10, (life + cfg.lifeVar) * 1000) },
        speed: 0,
        frequency: 1000 / Math.max(0.001, rate),
        quantity: 1,
        maxAliveParticles: Math.max(1, cfg.maxParticles | 0),
        blendMode: cfg.additive ? "ADD" : "NORMAL",
        emitting: false,
        particleClass: GDParticle
      };
      if (cfg.duration > 0) config.duration = cfg.duration * 1000;
      const emitter = scene.add.particles(0, 0, info.atlas, config);
      emitter._gd = this;
      const container = this.sprite.parentContainer;
      if (container) container.addAt(emitter, container.getIndex(this.sprite) + 1);
      else emitter.setDepth(this.sprite.depth);
      this.frameWidth = Math.max(1, scene.textures.getFrame(info.atlas, info.frame)?.realWidth || 32);
      this.emitter = emitter;
      return true;
    }

    nodeTransform() {
      const sprite = this.sprite;
      return {
        rotation: sprite.rotation || 0,
        scaleX: Math.abs(sprite.scaleX || 1),
        scaleY: Math.abs(sprite.scaleY || 1)
      };
    }

    toWorld(x, y, node, useScale) {
      let lx = (this.flipX ? -x : x) * (useScale ? node.scaleX : 1);
      let ly = (this.flipY ? -y : y) * (useScale ? node.scaleY : 1);
      const cos = Math.cos(node.rotation);
      const sin = Math.sin(node.rotation);
      const wx = lx * cos + ly * sin;
      const wy = -lx * sin + ly * cos;
      return [wx * 2, -wy * 2];
    }

    objectColor() {
      const tint = this.sprite.tintTopLeft ?? 0xffffff;
      return [((tint >> 16) & 255) / 255, ((tint >> 8) & 255) / 255, (tint & 255) / 255];
    }

    initParticle(p) {
      const cfg = this.cfg;
      const node = this.nodeTransform();
      const avgScale = (node.scaleX + node.scaleY) / 2;
      const [ox, oy] = this.toWorld(rand(0, cfg.posVarX), rand(0, cfg.posVarY), node, true);
      p._ox = p.x;
      p._oy = p.y;
      p.x += ox;
      p.y += oy;
      const angle = rand(cfg.angle, cfg.angleVar) * DEG;
      const [dx, dy] = this.toWorld(Math.cos(angle), Math.sin(angle), node, false);
      const dirLen = Math.hypot(dx, dy) || 1;
      p._dirX = dx / dirLen;
      p._dirY = dy / dirLen;
      const mirrored = this.flipX !== this.flipY;
      if (cfg.emitterMode === 1) {
        const scale = 2 * avgScale;
        p._radius0 = Math.max(0, rand(cfg.startRad, cfg.startRadVar)) * scale;
        p._radius1 = cfg.radEqual || cfg.endRad === -1 ? p._radius0 : Math.max(0, rand(cfg.endRad, cfg.endRadVar)) * scale;
        p._radAngle = Math.atan2(-p._dirY, p._dirX);
        p._radSpeed = rand(cfg.rotPerSec, cfg.rotPerSecVar) * DEG * (mirrored ? -1 : 1);
        p.velocityX = 0;
        p.velocityY = 0;
      } else {
        const speed = rand(cfg.speed, cfg.speedVar) * 2 * avgScale;
        p.velocityX = p._dirX * speed;
        p.velocityY = p._dirY * speed;
        p._accelRad = rand(cfg.accelRad, cfg.accelRadVar) * 2 * avgScale;
        p._accelTan = rand(cfg.accelTan, cfg.accelTanVar) * 2 * avgScale * (mirrored ? -1 : 1);
      }
      p._size0 = Math.max(0, rand(cfg.startSize, cfg.startSizeVar));
      p._size1 = cfg.sizeEqual || cfg.endSize === -1 ? p._size0 : Math.max(0, rand(cfg.endSize, cfg.endSizeVar));
      p._spin0 = rand(cfg.startSpin, cfg.startSpinVar);
      p._spin1 = cfg.spinEqual ? p._spin0 : rand(cfg.endSpin, cfg.endSpinVar);
      p._dirRotation = Math.atan2(p._dirY, p._dirX);
      let start = randomColor(cfg.startR, cfg.startRVar, cfg.startG, cfg.startGVar, cfg.startB, cfg.startBVar, cfg.startA, cfg.startAVar, cfg.startRGBSync);
      let end = randomColor(cfg.endR, cfg.endRVar, cfg.endG, cfg.endGVar, cfg.endB, cfg.endBVar, cfg.endA, cfg.endAVar, cfg.endRGBSync);
      if (this.useObjColor || this.uniformObjColor) {
        const color = this.objectColor();
        start = [...color, start[3]];
        end = [...color, end[3]];
      }
      p._color0 = start;
      p._color1 = end;
      p._fadeIn = Math.max(0, rand(cfg.fadeIn, cfg.fadeInVar));
      p._fadeOut = Math.max(0, rand(cfg.fadeOut, cfg.fadeOutVar));
      this.stepParticle(p, 0);
    }

    stepParticle(p, dt) {
      const cfg = this.cfg;
      const t = clamp01(p.lifeT ?? 0);
      if (cfg.emitterMode === 1) {
        p._radAngle += p._radSpeed * dt;
        const radius = p._radius0 + (p._radius1 - p._radius0) * t;
        p.x = p._ox - Math.cos(p._radAngle) * radius;
        p.y = p._oy + Math.sin(p._radAngle) * radius;
      } else if (dt > 0) {
        let rx = p.x - p._ox;
        let ry = p.y - p._oy;
        const len = Math.hypot(rx, ry);
        if (len > 0) {
          rx /= len;
          ry /= len;
        }
        p.velocityX += (rx * p._accelRad + ry * p._accelTan + this.gravityX) * dt;
        p.velocityY += (ry * p._accelRad - rx * p._accelTan + this.gravityY) * dt;
      }
      const size = p._size0 + (p._size1 - p._size0) * t;
      const scale = size * 2 / this.frameWidth;
      p.scaleX = scale;
      p.scaleY = scale;
      let rotationDeg = p._spin0 + (p._spin1 - p._spin0) * t;
      if (cfg.rotIsDir) {
        const dirRotation = cfg.dynRot && cfg.emitterMode !== 1 && (p.velocityX || p.velocityY)
          ? Math.atan2(p.velocityY, p.velocityX)
          : p._dirRotation;
        rotationDeg = dirRotation / DEG + (cfg.dynRot ? 0 : rotationDeg - p._spin0);
      }
      p.rotation = rotationDeg * DEG;
      const c0 = p._color0;
      const c1 = p._color1;
      const r = Math.round(255 * (c0[0] + (c1[0] - c0[0]) * t));
      const g = Math.round(255 * (c0[1] + (c1[1] - c0[1]) * t));
      const b = Math.round(255 * (c0[2] + (c1[2] - c0[2]) * t));
      p.tint = (r << 16) | (g << 8) | b;
      const lifeSeconds = (p.life || 1) / 1000;
      const age = t * lifeSeconds;
      let alpha = c0[3] + (c1[3] - c0[3]) * t;
      if (p._fadeIn > 0) alpha *= clamp01(age / p._fadeIn);
      if (p._fadeOut > 0) alpha *= clamp01((lifeSeconds - age) / p._fadeOut);
      p.alpha = clamp01(alpha * this.opacity);
    }

    update() {
      const sprite = this.sprite;
      const container = sprite.parentContainer;
      const screenX = sprite.x + (this.level.container?.x || 0);
      const pad = 200;
      const onScreen = screenX > -pad && screenX < screenWidth + pad;
      const active = onScreen && (!this.animateOnTrigger || this.triggered) && sprite.visible && sprite.active !== false && (container ? container.visible : true);
      if (!this.emitter) {
        if (!active) return;
        if (!this.create()) return;
      }
      const node = this.nodeTransform();
      const [gx, gy] = this.grouped ? this.toWorld(this.cfg.gravityX, this.cfg.gravityY, node, true) : [this.cfg.gravityX * 2, -this.cfg.gravityY * 2];
      this.gravityX = gx;
      this.gravityY = gy;
      this.opacity = clamp01(sprite.alpha ?? 1);
      if (this.grouped) {
        this.emitter.setPosition(sprite.x, sprite.y);
        this.emitter.particleX = 0;
        this.emitter.particleY = 0;
      } else {
        this.emitter.setPosition(0, 0);
        this.emitter.particleX = sprite.x;
        this.emitter.particleY = sprite.y;
      }
      if (this.restartPending) {
        this.restartPending = false;
        this.emitter.stop();
        this.emitter.killAll();
        this.started = false;
      }
      if (active && !this.emitter.emitting && !(this.started && this.cfg.duration > 0)) {
        this.emitter.start();
        if (this.quickStart && !this.started) this.emitter.fastForward(Math.max(0.01, this.cfg.life + this.cfg.lifeVar) * 1000);
        this.started = true;
      } else if (!active && this.emitter.emitting) {
        this.emitter.stop();
      }
    }

    activate() {
      this.triggered = true;
      this.restartPending = true;
    }

    reset() {
      this.triggered = false;
      this.restartPending = false;
      if (!this.emitter) return;
      this.emitter.stop();
      this.emitter.killAll();
      this.started = false;
    }
  }

  if (allObjects[2065]) {
    allObjects[2065].type = "deco";
    allObjects[2065].children = [];
  }
  const proto = window.LevelObject.prototype;

  proto._registerParticleObject = function (sprite, levelObj) {
    if (window.isEditor || !sprite) return;
    const cfg = parseParticleString(rawValue(levelObj?._raw, 145));
    if (!cfg) return;
    sprite.renderWebGL = () => {};
    sprite.renderCanvas = () => {};
    const system = new GDParticleSystem(this, sprite, levelObj, cfg);
    sprite._particleSystem = system;
    (this._particleObjects ||= []).push(system);
  };

  proto.updateParticleObjects = function () {
    if (!this._particleObjects) return;
    for (const system of this._particleObjects) system.update();
  };

  proto.resetParticleObjects = function () {
    if (!this._particleObjects) return;
    for (const system of this._particleObjects) system.reset();
  };
})();
