(() => {
  const GENERIC_TRIGGER_KINDS = {
    1912: "random",
    2068: "advRandom",
    3607: "sequence",
    3619: "itemEdit",
    3620: "itemCompare",
    3641: "itemPersist",
    3614: "timer",
    3615: "timeEvent",
    3617: "timeControl",
    2067: "scale",
    1935: "timeWarp",
    3600: "end",
    3618: "reset",
    1916: "cameraOffset",
    1913: "cameraZoom",
    2015: "cameraRotate",
    2899: "options",
    3029: "changeBackground",
    3030: "changeGround",
    2904: "shader",
    2910: "shader",
    2911: "shader",
    2919: "shader",
    2920: "shader",
    2921: "shader",
    2922: "shader",
    2923: "shader",
    1917: "reverse",
    2066: "gravity",
    1932: "playerControl",
    3022: "teleport",
    1934: "song",
    3602: "sfx",
    3605: "editSong",
    3603: "editSfx",
    2900: "rotateGameplay",
    1914: "staticCamera"
  };
  const HIDDEN_TRIGGER_IDS = [
    1913, 1914, 1916, 1917, 1931, 1932, 1934, 2015, 2016, 2062, 2066, 2899, 2900, 2901, 2903, 2904, 2905, 2907, 2909, 2910,
    2911, 2912, 2913, 2914, 2915, 2916, 2917, 2919, 2920, 2921, 2922, 2923, 2924, 2925, 2999, 3006, 3007, 3008, 3009, 3010,
    3011, 3012, 3013, 3014, 3015, 3016, 3017, 3018, 3019, 3020, 3021, 3022, 3023, 3024, 3029, 3030, 3031, 3032, 3033, 3602,
    3603, 3604, 3605, 3606, 3608, 3609, 3612, 3613, 3640, 3642, 3643, 3660, 3661, 3662
  ];
  for (const id of [...Object.keys(GENERIC_TRIGGER_KINDS), ...HIDDEN_TRIGGER_IDS]) {
    const def = allObjects[id];
    if (def) def.type = triggerType;
  }

  const rawValue = (raw, key) => raw?.[key] ?? raw?.[String(key)];
  const rawInt = (raw, key, fallback = 0) => {
    const parsed = parseInt(rawValue(raw, key) ?? fallback, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const rawFloat = (raw, key, fallback = 0) => {
    const parsed = parseFloat(rawValue(raw, key) ?? fallback);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const rawBool = (raw, key) => String(rawValue(raw, key) ?? "0") === "1";
  const rawPairs = (raw, key) => {
    const parts = String(rawValue(raw, key) ?? "").split(".").map(part => parseInt(part, 10));
    const pairs = [];
    for (let i = 0; i + 1 < parts.length; i += 2) {
      if (Number.isFinite(parts[i]) && Number.isFinite(parts[i + 1])) pairs.push([parts[i], parts[i + 1]]);
    }
    return pairs;
  };
  const truncMod = (value) => Math.trunc(value * 1000) / 1000;
  const applyRound = (value, mode) => mode === 1 ? Math.round(value) : mode === 2 ? Math.floor(value) : mode === 3 ? Math.ceil(value) : value;
  const applySign = (value, mode) => mode === 1 ? Math.abs(value) : mode === 2 ? -Math.abs(value) : value;
  const applyOp = (a, b, op) => {
    if (op === 1) return a + b;
    if (op === 2) return a - b;
    if (op === 3) return a * b;
    if (op === 4) return b !== 0 ? a / b : 0;
    return 0;
  };
  const hasItemSource = (type, id) => type !== 0 && (id > 0 || type === 3 || type === 4);

  const proto = window.LevelObject.prototype;

  proto._parseGenericTrigger = function (levelObj, triggerBase) {
    if (String(levelObj.id) === "2016") {
      const groups = String(levelObj._raw?.[57] ?? "").split(".").map(g => parseInt(g, 10)).filter(g => g > 0);
      this._cameraGuides ||= new Map();
      for (const g of groups) if (!this._cameraGuides.has(g)) this._cameraGuides.set(g, { x: levelObj.x * 2, y: levelObj.y * 2 });
      return;
    }
    const kind = GENERIC_TRIGGER_KINDS[levelObj.id];
    if (!kind) return;
    const raw = levelObj._raw || {};
    const trig = {
      ...triggerBase,
      kind,
      x: levelObj.x * 2,
      y: levelObj.y * 2,
      touchTriggered: rawBool(raw, 11),
      multiTrigger: rawBool(raw, 87),
      targetGroup: rawInt(raw, 51),
      centerGroup: rawInt(raw, 71)
    };
    if (kind === "random") {
      trig.chance = Math.max(0, Math.min(100, rawFloat(raw, 10)));
    } else if (kind === "advRandom") {
      trig.choices = rawPairs(raw, 152).filter(pair => pair[0] > 0 && pair[1] > 0);
    } else if (kind === "sequence") {
      trig.sequence = rawPairs(raw, 435).filter(pair => pair[0] > 0 && pair[1] > 0);
      trig.sequenceTotal = trig.sequence.reduce((sum, pair) => sum + pair[1], 0);
      trig.mode = rawInt(raw, 436);
      trig.minInterval = rawFloat(raw, 437);
      trig.resetTime = rawFloat(raw, 438);
      trig.resetStep = rawInt(raw, 439) !== 0;
    } else if (kind === "itemEdit" || kind === "itemCompare") {
      trig.item1 = rawInt(raw, 80);
      trig.item2 = rawInt(raw, 95);
      trig.type1 = rawInt(raw, 476);
      trig.type2 = rawInt(raw, 477);
      trig.targetType = rawInt(raw, 478);
      trig.mod1 = rawFloat(raw, 479, kind === "itemEdit" ? 0 : 1);
      trig.mod2 = rawFloat(raw, 483, 1);
      trig.op1 = rawInt(raw, 480);
      trig.op2 = rawInt(raw, 481);
      trig.op3 = rawInt(raw, 482);
      trig.tolerance = rawFloat(raw, 484);
      trig.round1 = rawInt(raw, 485);
      trig.round2 = rawInt(raw, 486);
      trig.sign1 = rawInt(raw, 578);
      trig.sign2 = rawInt(raw, 579);
    } else if (kind === "itemPersist") {
      trig.item1 = rawInt(raw, 80);
      trig.persistent = rawBool(raw, 491);
      trig.targetAll = rawBool(raw, 492);
      trig.resetItem = rawBool(raw, 493);
      trig.isTimer = rawBool(raw, 494);
    } else if (kind === "timer") {
      trig.item1 = rawInt(raw, 80);
      trig.startTime = rawFloat(raw, 467);
      trig.stopTime = rawFloat(raw, 473);
      trig.stopTimeEnabled = rawBool(raw, 474);
      trig.dontOverride = rawBool(raw, 468);
      trig.ignoreTimeWarp = rawBool(raw, 469);
      trig.timeMod = rawFloat(raw, 470);
      trig.startPaused = rawBool(raw, 471);
    } else if (kind === "timeEvent") {
      trig.item1 = rawInt(raw, 80);
      trig.targetTime = rawFloat(raw, 473);
      trig.multiActivate = rawBool(raw, 475);
    } else if (kind === "timeControl") {
      trig.item1 = rawInt(raw, 80);
      trig.stop = rawInt(raw, 472) === 1;
    } else if (kind === "scale") {
      const scaleX = rawFloat(raw, 150, 1);
      const scaleY = rawFloat(raw, 151, 1);
      trig.scaleX = rawBool(raw, 153) ? (scaleX !== 0 ? 1 / scaleX : 1) : scaleX;
      trig.scaleY = rawBool(raw, 154) ? (scaleY !== 0 ? 1 / scaleY : 1) : scaleY;
      trig.duration = Math.max(0, rawFloat(raw, 10));
      trig.easingType = rawInt(raw, 30);
      trig.easingRate = rawFloat(raw, 85, 2);
      trig.onlyMove = rawBool(raw, 133);
    } else if (kind === "timeWarp") {
      trig.timeMod = Math.max(0.1, Math.min(2, rawFloat(raw, 120, 1)));
    } else if (kind === "cameraOffset") {
      trig.offsetX = rawFloat(raw, 28) * 2;
      trig.offsetY = rawFloat(raw, 29) * 2;
      trig.axis = rawInt(raw, 101);
      trig.duration = Math.max(0, rawFloat(raw, 10));
      trig.easingType = rawInt(raw, 30);
      const rate = rawFloat(raw, 85);
      trig.easingRate = rate > 0 ? rate : 2;
    } else if (kind === "shader") {
      trig.objectId = levelObj.id;
      this._parseShaderTrigger(trig, raw);
    } else if (kind === "changeBackground" || kind === "changeGround") {
      trig.artId = rawInt(raw, 533);
    } else if (kind === "options") {
      trig.hideGround = rawInt(raw, 161);
      trig.hideP1 = rawInt(raw, 162);
      trig.hideP2 = rawInt(raw, 163);
      trig.disableP1 = rawInt(raw, 165);
      trig.disableP2 = rawInt(raw, 199);
      trig.hideAttempts = rawInt(raw, 532);
      trig.respawnMode = rawInt(raw, 573);
      trig.respawnTime = rawFloat(raw, 574);
    } else if (kind === "cameraRotate") {
      trig.degrees = rawFloat(raw, 68);
      trig.add = rawBool(raw, 70);
      trig.snap360 = rawBool(raw, 394);
      trig.duration = Math.max(0, rawFloat(raw, 10));
      trig.easingType = rawInt(raw, 30);
      const rotateRate = rawFloat(raw, 85);
      trig.easingRate = rotateRate > 0 ? rotateRate : 2;
    } else if (kind === "staticCamera") {
      trig.targetGroup = rawInt(raw, 71);
      trig.duration = Math.max(0, rawFloat(raw, 10));
      trig.easingType = rawInt(raw, 30);
      const staticRate = rawFloat(raw, 85);
      trig.easingRate = staticRate > 0 ? staticRate : 2;
      trig.axis = rawInt(raw, 101);
      trig.exit = rawBool(raw, 110);
      trig.exitInstant = rawBool(raw, 465);
    } else if (kind === "cameraZoom") {
      const zoom = rawFloat(raw, 371, 1);
      trig.zoom = zoom <= 0 ? 1 : Math.max(0.4, Math.min(3, zoom));
      trig.duration = Math.max(0, rawFloat(raw, 10));
      trig.easingType = rawInt(raw, 30);
      const rate = rawFloat(raw, 85);
      trig.easingRate = rate > 0 ? rate : 2;
    } else if (kind === "end") {
      trig.noEffects = rawBool(raw, 460);
      trig.noSFX = rawBool(raw, 461);
      trig.instant = rawBool(raw, 487);
    } else if (kind === "rotateGameplay") {
      trig.touchTriggered = true;
      trig.ground = rawInt(raw, 166, 2);
      trig.move = rawInt(raw, 167, 4);
      trig.editVelocity = rawBool(raw, 169);
      trig.overrideVelocity = rawBool(raw, 584);
      trig.velocityModX = rawFloat(raw, 582);
      trig.velocityModY = rawFloat(raw, 583);
      trig.channelOnly = rawBool(raw, 172);
      trig.dontSlide = rawBool(raw, 585);
    } else if (kind === "gravity") {
      const gravityValue = rawFloat(raw, 148, 1);
      trig.gravity = Math.max(0.1, Math.min(2, gravityValue));
      trig.p1 = !rawBool(raw, 200);
      trig.p2 = !rawBool(raw, 138) && !rawBool(raw, 201);
    } else if (kind === "playerControl") {
      trig.stopJump = rawBool(raw, 540);
      trig.stopMove = rawBool(raw, 541);
      trig.stopRotate = rawBool(raw, 542);
      trig.stopSlide = rawBool(raw, 543);
      trig.p1 = rawBool(raw, 138) || !rawBool(raw, 200);
      trig.p2 = !rawBool(raw, 138) || rawBool(raw, 200);
    } else if (kind === "teleport") {
      trig.gravityMode = rawInt(raw, 354);
      trig.teleportY = rawValue(raw, 54) !== undefined ? rawFloat(raw, 54) : null;
      trig.usePlayerX = rawBool(raw, 352);
      trig.usePlayerY = rawBool(raw, 353);
      trig.noEffects = rawBool(raw, 443);
    } else if (kind === "song" || kind === "sfx" || kind === "editSong" || kind === "editSfx") {
      trig.soundId = rawInt(raw, 392);
      trig.volume = Math.max(0, Math.min(2, rawFloat(raw, 406, 1)));
      trig.speed = Math.pow(2, rawInt(raw, 404) / 12);
      trig.pitch = rawInt(raw, 405);
      trig.loop = rawBool(raw, 414);
      trig.prep = rawBool(raw, 399);
      trig.loadPrep = rawBool(raw, 400);
      trig.trackId = rawInt(raw, 432);
      trig.start = Math.max(0, rawInt(raw, 408) / 1000);
      trig.fadeIn = Math.max(0, rawInt(raw, 409) / 1000);
      trig.end = Math.max(0, rawInt(raw, 410) / 1000);
      trig.fadeOut = Math.max(0, rawInt(raw, 411) / 1000);
    }
    this._genericTriggers.push(trig);
  };

  proto._initGenericTriggers = function () {
    this._genericTriggers = [];
    this._cameraGuides = new Map();
    this._groupScales = {};
    this._scaledSprites = new Set();
    this._scaledColliders = new Set();
    this._persistentItems = new Set();
    this._persistentTimers = new Set();
    this.resetGenericTriggers(true);
  };

  proto.resetGenericTriggers = function (clearPersistent = false) {
    this.resetParticleObjects?.();
    this.staticCamera = null;
    this._genericTriggerIdx = 0;
    this._genericFired = new Set();
    this._genericTouching = new Map();
    this._sequenceStates = new Map();
    this._activeScaleTweens = [];
    this._activeTimeEvents = [];
    this._levelTime = 0;
    this._points = 0;
    this.timeWarp = 1;
    this.endTriggered = null;
    this.cameraOffsetX = 0;
    this.cameraOffsetY = 0;
    this._appliedCameraOffsetY = 0;
    this._cameraOffsetTweens = { x: null, y: null };
    this.cameraZoom = 1;
    this._cameraZoomTween = null;
    this.cameraAngle = 0;
    this._cameraAngleTarget = 0;
    this._cameraAngleTween = null;
    this.groundHidden = false;
    this.optionHideP1 = false;
    this.optionHideP2 = false;
    this.p1ControlsDisabled = false;
    this.p2ControlsDisabled = false;
    this.direction = 1;
    this.gameplaySideways = false;
    this._sidewaysProxies = new Map();
    this.p1GravityScale = 1;
    this.p2GravityScale = 1;
    this._preppedSong = null;
    this._directionDirty = false;
    this._reverseIdx = -1;
    this._scene?._audio?.stopTriggerChannels?.();
    this._scene?._applyTriggerGravity?.(1, 1);
    this.attemptsHidden = false;
    this.respawnTime = null;
    this.resetShaders();
    if (this._initialArt) {
      this._scene?._applyArtChange?.("background", this._initialArt.background);
      this._scene?._applyArtChange?.("ground", this._initialArt.ground);
      this._initialArt = null;
    }
    const keptTimers = {};
    if (!clearPersistent && this._timers) {
      for (const id of this._persistentTimers) {
        if (this._timers[id]) keptTimers[id] = this._timers[id];
      }
    }
    this._timers = keptTimers;
    if (clearPersistent) {
      this._persistentItems.clear();
      this._persistentTimers.clear();
    }
    this._groupScales = {};
    this._hasGroupScales = false;
    for (const spr of this._scaledSprites) {
      spr._eeGroupScaleX = 1;
      spr._eeGroupScaleY = 1;
      if (spr.scene && !spr._beastManaged) this._setEffectScale(spr, spr._eeEffectMult ?? 1);
    }
    this._scaledSprites.clear();
    for (const col of this._scaledColliders) {
      col.w = col._eeInitialW;
      col.h = col._eeInitialH;
    }
    this._scaledColliders.clear();
  };

  proto._spawnGroupNow = function (groupId) {
    const targetGroup = parseInt(groupId ?? 0, 10);
    if (!Number.isFinite(targetGroup) || targetGroup <= 0) return;
    for (const pending of this._activeSpawnDelays) {
      if (pending.targetGroup === targetGroup && pending.delay === 0 && pending.elapsed === 0) return;
    }
    this._activeSpawnDelays.push({ targetGroup, delay: 0, elapsed: 0 });
  };

  proto._getLegacyTriggerLists = function () {
    return [
      this._colorTriggers, this._moveTriggers, this._alphaTriggers, this._spawnTriggers, this._stopTriggers,
      this._followPlayerYTriggers, this._followTriggers, this._toggleTriggers, this._animationTriggers, this._shakeTriggers,
      this._playerVisTriggers, this._onDeathTriggers, this._touchTriggers, this._pickupTriggers, this._countTriggers, this._instantCountTriggers
    ];
  };

  proto._getTouchActivatedSets = function () {
    const sets = [];
    for (const key in this) {
      if (key.startsWith("_touch") && key.endsWith("Activated") && this[key] instanceof Set) sets.push(this[key]);
    }
    return sets;
  };

  proto._releaseMultiTouchTriggers = function (playerX, playerY, player2Y) {
    const lists = this._getLegacyTriggerLists();
    let total = 0;
    for (const list of lists) total += Array.isArray(list) ? list.length : 0;
    if (this._multiTouchLegacyTotal !== total) {
      this._multiTouchLegacyTotal = total;
      this._multiTouchLegacy = [];
      const seen = new Set();
      for (const list of lists) {
        if (!Array.isArray(list)) continue;
        for (const trig of list) {
          if (!trig || !trig.touchTriggered || !trig.multiTrigger || trig.spawnTriggered || seen.has(trig.uid)) continue;
          seen.add(trig.uid);
          this._multiTouchLegacy.push(trig);
        }
      }
    }
    const triggers = this._multiTouchLegacy;
    if (!triggers.length) return;
    const halfHitbox = 30 + (typeof playerSize === "number" ? playerSize : 20);
    let sets = null;
    for (const trig of triggers) {
      if (Math.abs(playerX - trig.x) > halfHitbox) {
        sets = sets || this._getTouchActivatedSets();
        for (const set of sets) set.delete(trig.uid);
        continue;
      }
      const trigY = trig.y ?? 0;
      const touching = Math.abs(playerY - trigY) <= halfHitbox || (player2Y !== null && player2Y !== undefined && Math.abs(player2Y - trigY) <= halfHitbox);
      if (touching) continue;
      sets = sets || this._getTouchActivatedSets();
      for (const set of sets) set.delete(trig.uid);
    }
  };

  proto._getItemValue = function (type, id) {
    if (type === 2) return this._timers[id]?.value || 0;
    if (type === 3) return this._points || 0;
    if (type === 4) return this._levelTime || 0;
    if (type === 5) return Number(this._scene?._attempts) || 0;
    return this._itemCounts[id] || 0;
  };

  proto._setItemValue = function (type, id, value, colorManager) {
    if (type === 3) {
      this._points = Math.trunc(value);
      return;
    }
    if (type === 2) {
      const clamped = Math.max(-9999999, Math.min(9999999, value));
      const timer = this._timers[id] || (this._timers[id] = { value: 0, running: false, timeMod: 1, stopped: false });
      timer.value = clamped;
      return;
    }
    this._itemCounts[id] = Math.trunc(value);
    this._checkCountTriggers(id, colorManager);
  };

  proto._fireGenericTrigger = function (trig, colorManager) {
    if (!trig || !this._isTriggerSaveObjectLive(trig.uid) || this._isTriggerToggledOff(trig)) return;
    const kind = trig.kind;
    if (kind === "random") {
      this._spawnGroupNow(Math.random() * 100 < trig.chance ? trig.targetGroup : trig.centerGroup);
    } else if (kind === "advRandom") {
      let total = 0;
      for (const choice of trig.choices) total += choice[1];
      if (total <= 0) return;
      let roll = Math.random() * total;
      for (const choice of trig.choices) {
        roll -= choice[1];
        if (roll < 0) {
          this._spawnGroupNow(choice[0]);
          return;
        }
      }
      this._spawnGroupNow(trig.choices[trig.choices.length - 1][0]);
    } else if (kind === "sequence") {
      this._fireSequenceTrigger(trig);
    } else if (kind === "itemEdit") {
      this._fireItemEditTrigger(trig, colorManager);
    } else if (kind === "itemCompare") {
      this._fireItemCompareTrigger(trig);
    } else if (kind === "itemPersist") {
      const store = trig.isTimer ? this._persistentTimers : this._persistentItems;
      if (trig.resetItem) {
        if (trig.targetAll) store.clear();
        else store.delete(trig.item1);
        if (trig.isTimer) delete this._timers[trig.item1];
        else if (trig.targetAll) this._itemCounts = {};
        else delete this._itemCounts[trig.item1];
      } else if (trig.persistent) {
        store.add(trig.item1);
      } else {
        store.delete(trig.item1);
      }
    } else if (kind === "timer") {
      const existing = this._timers[trig.item1];
      const timer = existing || (this._timers[trig.item1] = { value: 0 });
      timer.running = !trig.startPaused;
      timer.timeMod = trig.timeMod;
      timer.ignoreTimeWarp = trig.ignoreTimeWarp;
      timer.stopTime = trig.stopTime;
      timer.stopTimeEnabled = trig.stopTimeEnabled;
      timer.targetGroup = trig.targetGroup;
      timer.stopped = false;
      if (!existing || !trig.dontOverride) timer.value = trig.startTime;
    } else if (kind === "timeEvent") {
      if (!this._activeTimeEvents.some(event => event.trig === trig)) this._activeTimeEvents.push({ trig });
    } else if (kind === "timeControl") {
      const timer = this._timers[trig.item1];
      if (timer) timer.running = !trig.stop;
    } else if (kind === "scale") {
      if (!(trig.targetGroup > 0)) return;
      this._hasGroupScales = true;
      this._activeScaleTweens.push({ trig, elapsed: 0, prevX: 1, prevY: 1 });
    } else if (kind === "cameraOffset") {
      if (trig.axis !== 2) this._startCameraOffsetTween("x", trig.offsetX, trig);
      if (trig.axis !== 1) this._startCameraOffsetTween("y", trig.offsetY, trig);
    } else if (kind === "shader") {
      this._fireShaderTrigger(trig);
    } else if (kind === "changeBackground" || kind === "changeGround") {
      if (trig.artId <= 0) return;
      if (!this._initialArt) this._initialArt = { background: window._backgroundId, ground: window._groundId };
      if (kind === "changeBackground") this._scene?._applyArtChange?.("background", String(trig.artId).padStart(2, "0"));
      else this._scene?._applyArtChange?.("ground", getGroundTextureId(trig.artId));
    } else if (kind === "options") {
      if (trig.hideGround) this.groundHidden = trig.hideGround === 1;
      if (trig.hideP1) this.optionHideP1 = trig.hideP1 === 1;
      if (trig.hideP2) this.optionHideP2 = trig.hideP2 === 1;
      if (trig.disableP1) this.p1ControlsDisabled = trig.disableP1 === 1;
      if (trig.disableP2) this.p2ControlsDisabled = trig.disableP2 === 1;
      if (trig.hideAttempts) this.attemptsHidden = trig.hideAttempts === 1;
      if (trig.respawnMode) this.respawnTime = trig.respawnMode === 1 ? Math.min(10, Math.max(1, trig.respawnTime)) : null;
    } else if (kind === "cameraRotate") {
      this._startCameraRotate(trig);
    } else if (kind === "cameraZoom") {
      if (trig.duration <= 0) {
        this.cameraZoom = trig.zoom;
        this._cameraZoomTween = null;
      } else {
        this._cameraZoomTween = { from: this.cameraZoom, to: trig.zoom, elapsed: 0, trig };
      }
    } else if (kind === "timeWarp") {
      this.timeWarp = trig.timeMod;
    } else if (kind === "end") {
      if (!this.endTriggered) this.endTriggered = trig;
      this._spawnGroupNow(trig.targetGroup);
    } else if (kind === "staticCamera") {
      const cam = this.staticCamera || (this.staticCamera = { x: null, y: null });
      const axes = trig.axis === 1 ? ["x"] : trig.axis === 2 ? ["y"] : ["x", "y"];
      for (const axis of axes) {
        const prev = cam[axis];
        if (trig.exit) {
          if (prev && !prev.exiting) cam[axis] = { ...prev, exiting: true, elapsed: 0, trig, instant: trig.exitInstant };
        } else {
          cam[axis] = { group: trig.targetGroup, elapsed: 0, trig, exiting: false, from: prev ? prev.last : null };
        }
      }
    } else if (kind === "rotateGameplay") {
      if (!trig.channelOnly) this._scene?._rotateGameplay?.(trig);
    } else if (kind === "reverse") {
      this.direction = (this.direction || 1) * -1;
      this._directionDirty = true;
    } else if (kind === "gravity") {
      if (trig.p1) this.p1GravityScale = trig.gravity;
      if (trig.p2) this.p2GravityScale = trig.gravity;
      this._scene?._applyTriggerGravity?.(this.p1GravityScale, this.p2GravityScale);
    } else if (kind === "playerControl") {
      this._scene?._applyPlayerControlTrigger?.(trig);
    } else if (kind === "teleport") {
      this._scene?._teleportPlayerFromTrigger?.(trig);
    } else if (kind === "song") {
      if (trig.prep) this._preppedSong = trig;
      else if (trig.loadPrep) {
        if (this._preppedSong) this._scene?._audio?.playSongTrigger?.(this._preppedSong);
        this._preppedSong = null;
      } else this._scene?._audio?.playSongTrigger?.(trig);
    } else if (kind === "sfx") {
      this._scene?._audio?.playSfxTrigger?.(trig);
    } else if (kind === "editSong") {
      this._scene?._audio?.editSongTrigger?.(trig);
    } else if (kind === "editSfx") {
      this._scene?._audio?.editSfxTrigger?.(trig);
    } else if (kind === "reset") {
      this._fireResetTrigger(trig);
    }
  };

  proto._fireSequenceTrigger = function (trig) {
    if (!trig.sequenceTotal) return;
    const state = this._sequenceStates.get(trig) || { index: 0, lastTime: -1 };
    this._sequenceStates.set(trig, state);
    const now = this._levelTime;
    const elapsed = now - state.lastTime;
    if (trig.minInterval > 0 && state.lastTime >= 0 && elapsed < trig.minInterval) return;
    let index = state.index;
    if (index > 0 && trig.resetTime > 0 && state.lastTime >= 0 && elapsed > trig.resetTime) {
      index = trig.resetStep ? Math.max(0, index - Math.floor(elapsed / trig.resetTime)) : 0;
    }
    state.lastTime = now;
    let position = index + 1;
    if (index >= trig.sequenceTotal) {
      if (trig.mode === 0) {
        state.index = index;
        return;
      }
      position = trig.mode === 1 ? 1 : trig.sequenceTotal;
    }
    state.index = position;
    let covered = 0;
    for (const entry of trig.sequence) {
      covered += entry[1];
      if (position <= covered) {
        this._spawnGroupNow(entry[0]);
        return;
      }
    }
  };

  proto._fireItemEditTrigger = function (trig, colorManager) {
    const targetType = trig.targetType < 2 ? 1 : trig.targetType;
    if (trig.targetGroup < 1 && targetType !== 3) return;
    const has1 = hasItemSource(trig.type1, trig.item1);
    const has2 = hasItemSource(trig.type2, trig.item2);
    const mod = truncMod(trig.mod1);
    let value = mod;
    if (has1 || has2) {
      let source;
      if (has1 && has2) {
        source = applyOp(this._getItemValue(trig.type1, trig.item1), this._getItemValue(trig.type2, trig.item2), trig.op2 < 2 ? 1 : trig.op2);
      } else if (has1) {
        source = this._getItemValue(trig.type1, trig.item1);
      } else {
        source = this._getItemValue(trig.type2, trig.item2);
      }
      value = applyOp(source, mod, trig.op3 < 4 ? 3 : 4);
    }
    value = applySign(applyRound(value, trig.round1), trig.sign1);
    if (trig.op1 !== 0) value = applyOp(this._getItemValue(targetType, trig.targetGroup), value, trig.op1);
    value = applySign(applyRound(value, trig.round2), trig.sign2);
    this._setItemValue(targetType, Math.max(0, Math.min(9999, trig.targetGroup)), value, colorManager);
  };

  proto._fireItemCompareTrigger = function (trig) {
    const type1 = trig.type1 < 2 ? 1 : trig.type1;
    const left = applySign(applyRound(applyOp(this._getItemValue(type1, trig.item1), truncMod(trig.mod1), trig.op1 > 0 ? trig.op1 : 3), trig.round1), trig.sign1);
    const mod2 = truncMod(trig.mod2);
    let right = mod2;
    if (hasItemSource(trig.type2, trig.item2)) {
      right = applyOp(this._getItemValue(trig.type2, trig.item2), mod2, trig.op2 > 0 ? trig.op2 : 3);
    }
    right = applySign(applyRound(right, trig.round2), trig.sign2);
    const tolerance = truncMod(trig.tolerance);
    let matched;
    if (trig.op3 === 1) matched = left + tolerance > right;
    else if (trig.op3 === 2) matched = left + tolerance >= right;
    else if (trig.op3 === 3) matched = left - tolerance < right;
    else if (trig.op3 === 4) matched = left - tolerance <= right;
    else if (trig.op3 === 5) matched = Math.abs(left - right) > tolerance;
    else matched = Math.abs(left - right) <= tolerance;
    this._spawnGroupNow(matched ? trig.targetGroup : trig.centerGroup);
  };

  proto._fireResetTrigger = function (trig) {
    const targetGroup = trig.targetGroup;
    if (!(targetGroup > 0)) return;
    const touchSets = this._getTouchActivatedSets();
    const lists = [this._genericTriggers, ...this._getLegacyTriggerLists(), this._rotateTriggers, this._pulseTriggers, this._collisionTriggers];
    for (const list of lists) {
      if (!Array.isArray(list)) continue;
      for (const other of list) {
        if (!other || !this._triggerHasGroup(other, targetGroup)) continue;
        this._genericFired.delete(other.uid);
        this._spawnFiredUids.delete(other.uid);
        for (const set of touchSets) set.delete(other.uid);
      }
    }
  };

  proto._stepTimers = function (dt, rawDt) {
    const timers = this._timers;
    for (const id in timers) {
      const timer = timers[id];
      if (!timer.running || timer.stopped) continue;
      const before = timer.value;
      let after = before + timer.timeMod * (timer.ignoreTimeWarp ? rawDt : dt);
      if (timer.stopTimeEnabled) {
        const stop = timer.stopTime;
        if ((before < stop && after >= stop) || (before > stop && after <= stop)) {
          after = stop;
          timer.stopped = true;
          this._spawnGroupNow(timer.targetGroup);
        }
      }
      timer.value = after;
      const events = this._activeTimeEvents;
      for (let i = events.length - 1; i >= 0; i--) {
        const event = events[i].trig;
        if (String(event.item1) !== id) continue;
        const target = event.targetTime;
        if ((before < target && after >= target) || (before > target && after <= target)) {
          this._spawnGroupNow(event.targetGroup);
          if (!event.multiActivate) events.splice(i, 1);
        }
      }
    }
  };

  proto._startCameraOffsetTween = function (axis, target, trig) {
    const key = axis === "x" ? "cameraOffsetX" : "cameraOffsetY";
    if (trig.duration <= 0) {
      this[key] = target;
      this._cameraOffsetTweens[axis] = null;
      return;
    }
    this._cameraOffsetTweens[axis] = { from: this[key], to: target, elapsed: 0, trig };
  };

  proto._stepCameraOffsetTweens = function (dt) {
    for (const axis of ["x", "y"]) {
      const tween = this._cameraOffsetTweens[axis];
      if (!tween) continue;
      tween.elapsed += dt;
      const progress = Math.min(tween.elapsed / tween.trig.duration, 1);
      const sample = Easing.sample(tween.trig.easingType, tween.trig.easingRate, progress);
      this[axis === "x" ? "cameraOffsetX" : "cameraOffsetY"] = tween.from + (tween.to - tween.from) * sample;
      if (progress >= 1) this._cameraOffsetTweens[axis] = null;
    }
    const angleTween = this._cameraAngleTween;
    if (angleTween) {
      angleTween.elapsed += dt;
      const progress = Math.min(angleTween.elapsed / angleTween.trig.duration, 1);
      const sample = Easing.sample(angleTween.trig.easingType, angleTween.trig.easingRate, progress);
      this.cameraAngle = angleTween.from + (angleTween.to - angleTween.from) * sample;
      if (progress >= 1) this._cameraAngleTween = null;
    }
    const zoomTween = this._cameraZoomTween;
    if (zoomTween) {
      zoomTween.elapsed += dt;
      const progress = Math.min(zoomTween.elapsed / zoomTween.trig.duration, 1);
      const sample = Easing.sample(zoomTween.trig.easingType, zoomTween.trig.easingRate, progress);
      this.cameraZoom = zoomTween.from + (zoomTween.to - zoomTween.from) * sample;
      if (progress >= 1) this._cameraZoomTween = null;
    }
  };

  const wrapAngle = (angle) => {
    if (angle >= -180 && angle <= 180) return angle;
    const turns = Math.trunc(Math.trunc(Math.abs(angle) / 180) * 0.5);
    return angle + (angle < -180 ? 360 : -360) * turns;
  };

  proto._startCameraRotate = function (trig) {
    let target = trig.add ? this._cameraAngleTarget + trig.degrees : trig.degrees;
    if (trig.snap360) {
      this.cameraAngle = wrapAngle(this.cameraAngle);
      target = wrapAngle(target);
    }
    this._cameraAngleTarget = target;
    if (trig.duration <= 0) {
      this.cameraAngle = trig.degrees;
      this._cameraAngleTween = null;
      return;
    }
    this._cameraAngleTween = { from: this.cameraAngle, to: target, elapsed: 0, trig };
  };

  proto.getViewPad = function () {
    const zoom = this.cameraZoom || 1;
    const radians = (this.cameraAngle || 0) * Math.PI / 180;
    const visibleWidth = (screenWidth * Math.abs(Math.cos(radians)) + screenHeight * Math.abs(Math.sin(radians))) / zoom;
    return visibleWidth > screenWidth ? (visibleWidth - screenWidth) / 2 : 0;
  };

  proto._stepScaleTweens = function (dt) {
    const tweens = this._activeScaleTweens;
    if (!tweens.length) return;
    const dirtyGroups = this._getDirtyGroupSet();
    let i = 0;
    while (i < tweens.length) {
      const anim = tweens[i];
      const trig = anim.trig;
      anim.elapsed += dt;
      const progress = trig.duration > 0 ? Math.min(anim.elapsed / trig.duration, 1) : 1;
      const sample = Easing.sample(trig.easingType, trig.easingRate, progress);
      const factorX = 1 + (trig.scaleX - 1) * sample;
      const factorY = 1 + (trig.scaleY - 1) * sample;
      const state = this._groupScales[trig.targetGroup] || (this._groupScales[trig.targetGroup] = { sx: 1, sy: 1, centerGroupId: 0, onlyMove: false });
      if (anim.prevX !== 0) state.sx *= factorX / anim.prevX;
      if (anim.prevY !== 0) state.sy *= factorY / anim.prevY;
      anim.prevX = factorX;
      anim.prevY = factorY;
      state.centerGroupId = trig.centerGroup || 0;
      state.onlyMove = trig.onlyMove;
      dirtyGroups.add(trig.targetGroup);
      if (progress >= 1) tweens.splice(i, 1);
      else i++;
    }
    this._applyGroupTransforms(dirtyGroups);
  };

  proto._applyGroupScaleToSprite = function (spr, ids, position) {
    const scales = this._groupScales;
    let scaleX = 1;
    let scaleY = 1;
    for (let i = 0; i < ids.length; i++) {
      const state = scales[ids[i]];
      if (!state) continue;
      if (state.centerGroupId > 0) {
        const center = this._getGroupCenter(state.centerGroupId);
        position.x = center.cx + (position.x - center.cx) * state.sx;
        position.y = center.cy + (position.y - center.cy) * state.sy;
      }
      if (!state.onlyMove) {
        scaleX *= state.sx;
        scaleY *= state.sy;
      }
    }
    if ((spr._eeGroupScaleX ?? 1) !== scaleX || (spr._eeGroupScaleY ?? 1) !== scaleY) {
      spr._eeGroupScaleX = scaleX;
      spr._eeGroupScaleY = scaleY;
      this._scaledSprites.add(spr);
      if (!spr._beastManaged) this._setEffectScale(spr, spr._eeEffectMult ?? 1);
    }
  };

  proto._applyGroupScaleToCollider = function (col, ids, position) {
    const scales = this._groupScales;
    let scaleX = 1;
    let scaleY = 1;
    for (let i = 0; i < ids.length; i++) {
      const state = scales[ids[i]];
      if (!state) continue;
      if (state.centerGroupId > 0) {
        const center = this._getGroupCenter(state.centerGroupId);
        const centerY = this._screenYToCollisionY(center.cy);
        position.x = center.cx + (position.x - center.cx) * state.sx;
        position.y = centerY + (position.y - centerY) * state.sy;
      }
      if (!state.onlyMove) {
        scaleX *= state.sx;
        scaleY *= state.sy;
      }
    }
    if (col.type === slopeType) return;
    if (col._eeInitialW === undefined) {
      col._eeInitialW = col.w;
      col._eeInitialH = col.h;
    }
    const width = col._eeInitialW * Math.abs(scaleX);
    const height = col._eeInitialH * Math.abs(scaleY);
    if (col.w !== width || col.h !== height) {
      col.w = width;
      col.h = height;
      this._scaledColliders.add(col);
    }
  };

  proto._checkGenericTouch = function (playerY, playerSlot, playerX, colorManager) {
    const halfHitbox = 30 + (typeof playerSize === "number" ? playerSize : 20);
    for (const trig of this._touchGenericTriggers) {
      if (trig.spawnTriggered) continue;
      const inside = Math.abs(playerX - trig.x) <= halfHitbox && Math.abs(playerY - trig.y) <= halfHitbox;
      const key = trig.uid * 2 + playerSlot;
      const wasInside = this._genericTouching.get(key) === true;
      if (inside === wasInside) continue;
      this._genericTouching.set(key, inside);
      if (!inside) continue;
      if (!trig.multiTrigger) {
        if (this._genericFired.has(trig.uid)) continue;
        this._genericFired.add(trig.uid);
      }
      this._fireGenericTrigger(trig, colorManager);
    }
  };

  proto.updateGenericTriggers = function (playerX, playerY, player2Y, rawDt, colorManager) {
    const triggers = this._genericTriggers;
    const dt = rawDt * (this.timeWarp || 1);
    this._levelTime += dt;
    this.updateParticleObjects?.();
    if (triggers.length) {
      if (this._genericSortedLength !== triggers.length) {
        triggers.sort((a, b) => a.x - b.x);
        this._touchGenericTriggers = triggers.filter(trig => trig.touchTriggered);
        this._genericSortedLength = triggers.length;
      }
      if (this._directionDirty) {
        this._directionDirty = false;
        let lo = 0;
        let hi = triggers.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (triggers[mid].x < playerX) lo = mid + 1;
          else hi = mid;
        }
        this._reverseIdx = lo - 1;
        let forward = 0;
        hi = triggers.length;
        while (forward < hi) {
          const mid = (forward + hi) >> 1;
          if (triggers[mid].x <= playerX) forward = mid + 1;
          else hi = mid;
        }
        this._genericTriggerIdx = forward;
      }
      if ((this.direction || 1) < 0) {
        while (this._reverseIdx >= 0) {
          const trig = triggers[this._reverseIdx];
          if (trig.x <= playerX) break;
          if ((this.direction || 1) > 0) break;
          this._reverseIdx--;
          if (trig.spawnTriggered || trig.touchTriggered) continue;
          if (!trig.multiTrigger && this._genericFired.has(trig.uid)) continue;
          this._genericFired.add(trig.uid);
          this._fireGenericTrigger(trig, colorManager);
        }
      } else {
        while (this._genericTriggerIdx < triggers.length) {
          if ((this.direction || 1) < 0) break;
          const trig = triggers[this._genericTriggerIdx];
          if (trig.x > playerX) break;
          if (!trig.spawnTriggered && !trig.touchTriggered) this._fireGenericTrigger(trig, colorManager);
          this._genericTriggerIdx++;
        }
      }
      if (this._touchGenericTriggers.length && playerY !== null) {
        this._checkGenericTouch(Number(playerY) || 0, 0, playerX, colorManager);
        if (player2Y !== null && player2Y !== undefined) this._checkGenericTouch(Number(player2Y) || 0, 1, playerX, colorManager);
      }
    }
    if (playerY !== null) this._releaseMultiTouchTriggers(playerX, Number(playerY) || 0, player2Y);
    this._stepTimers(dt, rawDt);
    this._stepScaleTweens(dt);
    this._stepCameraOffsetTweens(dt);
    this.stepShaders(dt);
  };

  proto._activateSpawnedGenericTriggers = function (targetGroup, colorManager) {
    const triggers = this._genericTriggers;
    for (let i = 0; i < triggers.length; i++) {
      const trig = triggers[i];
      if (!trig.spawnTriggered || !this._triggerHasGroup(trig, targetGroup)) continue;
      if (!trig.multiTrigger) {
        if (this._genericFired.has(trig.uid)) continue;
        this._genericFired.add(trig.uid);
      }
      this._fireGenericTrigger(trig, colorManager);
    }
  };
})();
