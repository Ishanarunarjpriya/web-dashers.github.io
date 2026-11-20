(() => {
  const proto = window.LevelObject.prototype;

  const LEGACY_LISTS = [
    ["_colorTriggers", "color"],
    ["_enterEffectTriggers", "enterEffect"],
    ["_moveTriggers", "_startMoveTriggerTween"],
    ["_spawnTriggers", "_queueSpawnTrigger"],
    ["_alphaTriggers", "_startAlphaTriggerTween"],
    ["_rotateTriggers", "_startRotateTriggerTween"],
    ["_stopTriggers", "_executeStopTrigger"],
    ["_followPlayerYTriggers", "_startFollowPlayerYTween"],
    ["_followTriggers", "_startFollowTriggerTween"],
    ["_toggleTriggers", "_executeToggleTrigger"],
    ["_animationTriggers", "_executeAnimationTrigger"],
    ["_shakeTriggers", "_executeShakeTrigger"],
    ["_playerVisTriggers", "playerVis"],
    ["_onDeathTriggers", "_armOnDeathTrigger"],
    ["_touchTriggers", "_armTouchTrigger"],
    ["_pickupTriggers", "_executePickupTrigger"],
    ["_countTriggers", "_armCountTrigger"],
    ["_instantCountTriggers", "_executeInstantCountTrigger"],
    ["_collisionTriggers", "_armCollisionTrigger"],
    ["_pulseTriggers", "pulse"],
    ["_genericTriggers", "generic"]
  ];

  const sortKeys = {
    4: (t) => Math.trunc(t.x / 2),
    1: (t) => Math.trunc(t.y / 2),
    3: (t) => -Math.trunc(t.x / 2),
    2: (t) => -Math.trunc(t.y / 2)
  };

  proto._setupTriggerChannels = function () {
    this._channelLists = null;
    if (window.isEditor) return;
    const rotates = (this._genericTriggers || []).filter(t => t.kind === "rotateGameplay" && t.changeChannel);
    let used = rotates.length > 0;
    if (!used) {
      for (const [name] of LEGACY_LISTS) {
        if ((this[name] || []).some(t => t && t.triggerChannel)) {
          used = true;
          break;
        }
      }
    }
    if (!used) return;
    for (const r of this._genericTriggers || []) {
      if (r.kind === "rotateGameplay" && !r.realTouch && !r.spawnTriggered) r.touchTriggered = false;
    }
    const channelDir = new Map();
    for (const r of [...rotates].sort((a, b) => a.x - b.x)) {
      if (!channelDir.has(r.targetChannel)) channelDir.set(r.targetChannel, r.move);
    }
    const lists = new Map();
    for (const [name, exec] of LEGACY_LISTS) {
      const list = this[name];
      if (!Array.isArray(list)) continue;
      const keep = [];
      for (const trig of list) {
        if (!trig || trig.spawnTriggered || trig.touchTriggered || trig.passive) {
          keep.push(trig);
          continue;
        }
        const ch = trig.triggerChannel || 0;
        if (!lists.has(ch)) lists.set(ch, []);
        lists.get(ch).push({ trig, exec });
      }
      if (keep.length !== list.length) {
        list.length = 0;
        list.push(...keep);
      }
    }
    for (const [ch, entries] of lists) {
      const key = sortKeys[channelDir.get(ch)] || sortKeys[4];
      entries.sort((a, b) => (a.trig.ord || 0) - (b.trig.ord || 0) || key(a.trig) - key(b.trig) || (a.trig.uid ?? 0) - (b.trig.uid ?? 0));
    }
    this._channelLists = lists;
    this._genericSortedLength = -1;
    this.resetTriggerChannels();
  };

  proto.resetTriggerChannels = function () {
    this.activeTriggerChannel = 0;
    this._channelIdx = new Map();
    this._channelReversed = new Map();
  };

  proto.setActiveTriggerChannel = function (channel, reversed) {
    if (!this._channelLists) return;
    this.activeTriggerChannel = channel;
    this._channelReversed.set(channel, !!reversed);
  };

  proto._fireChannelEntry = function (entry, colorManager) {
    const { trig, exec } = entry;
    if (!this._isTriggerSaveObjectLive(trig.uid)) return;
    if (exec === "color") {
      const apply = this._scene?._applyColorTriggerFn;
      if (apply) apply(trig);
      else if (colorManager?.triggerColor) {
        colorManager.triggerColor(trig.index, trig.color, trig.duration, trig.copy, trig.opacity);
        this.setChannelBlending(trig.index, !!trig.blending);
      }
    } else if (exec === "enterEffect") {
      this._activeEnterEffect = trig.effect;
      this._activeExitEffect = trig.effect;
    } else if (exec === "playerVis") {
      this.playerHidden = trig.hide;
    } else if (exec === "pulse") {
      if (!window.enableLDM) this._startPulseTrigger(trig);
    } else if (exec === "generic") {
      this._fireGenericTrigger(trig, colorManager);
    } else {
      this[exec]?.(trig, colorManager);
    }
  };

  proto.stepTriggerChannels = function (colorManager) {
    const lists = this._channelLists;
    if (!lists) return;
    const scene = this._scene;
    if (!scene || scene._inSidewaysStep) return;
    const px = Number(scene._playerWorldX) || 0;
    const py = Number(scene._state?.y) || 0;
    const sideways = !!this.gameplaySideways;
    for (;;) {
      const ch = this.activeTriggerChannel || 0;
      const entries = lists.get(ch);
      if (!entries) return;
      const idx = this._channelIdx.get(ch) || 0;
      if (idx >= entries.length) return;
      const entry = entries[idx];
      const reversed = !!this._channelReversed.get(ch);
      const pos = sideways ? py : px;
      const t = sideways ? entry.trig.y : entry.trig.x;
      if (reversed ? t < pos : pos < t) return;
      this._channelIdx.set(ch, idx + 1);
      this._fireChannelEntry(entry, colorManager);
    }
  };
  const FAST_FORWARD = new Set(["color", "_executeToggleTrigger", "_executeAnimationTrigger", "_executePickupTrigger", "_armCountTrigger", "_armCollisionTrigger", "_executeInstantCountTrigger", "_armOnDeathTrigger", "_armTouchTrigger"]);

  proto.fastForwardTriggerChannels = function (targetX, colorManager) {
    const entries = this._channelLists?.get(0);
    if (!entries) return;
    let idx = this._channelIdx.get(0) || 0;
    while (idx < entries.length && entries[idx].trig.x <= targetX) {
      const entry = entries[idx++];
      if (!FAST_FORWARD.has(entry.exec) || !this._isTriggerSaveObjectLive(entry.trig.uid)) continue;
      if (entry.exec === "color") {
        colorManager?.triggerColor?.(entry.trig.index, entry.trig.color, 0, entry.trig.copy, entry.trig.opacity);
        this.setChannelBlending(entry.trig.index, !!entry.trig.blending);
      } else {
        this[entry.exec]?.(entry.trig, colorManager);
      }
    }
    this._channelIdx.set(0, idx);
  };
})();
