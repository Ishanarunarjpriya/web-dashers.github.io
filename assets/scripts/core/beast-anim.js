const BEAST_ANIM_OBJECT_IDS = [918, 1327, 1328, 1584, 2012];

const BEAST_ANIM_NAME_BY_ID = {
  918: "GJBeast01",
  1327: "GJBeast02",
  1328: "GJBeast03",
  1584: "GJBeast04",
  2012: "GJBeast05"
};

const BEAST_ANIM_DEFAULT_ANIM_ID = { 918: 0, 1327: 0, 1328: 0, 1584: 0, 2012: 0 };

const BEAST_ANIM_DEFS = {
  GJBeast01: {
    defaultAnimation: "bite",
    animations: {
      bite: { delay: 0.025, frames: 16, looped: true },
      attack01: { delay: 0.025, frames: 3, looped: false },
      attack01_loop: { delay: 0.025, frames: 7, looped: true },
      attack01_end: { delay: 0.04, frames: 6, looped: false },
      idle01: { delay: 0.05, frames: 8, looped: true }
    }
  },
  GJBeast02: {
    defaultAnimation: "idle01",
    animations: {
      idle01: { delay: 0.06, frames: 9, looped: false },
      idle02: { delay: 0.06, frames: 9, looped: false }
    }
  },
  GJBeast03: {
    defaultAnimation: "idle01",
    animations: {
      idle01: { delay: 0.06, frames: 9, looped: false },
      idle02: { delay: 0.06, frames: 9, looped: false }
    }
  },
  GJBeast04: {
    defaultAnimation: "idle01",
    animations: {
      idle01: { delay: 0.06, frames: 14, looped: false },
      idle02: { delay: 0.06, frames: 14, looped: false },
      idle03: { delay: 0.06, frames: 14, looped: false },
      attack01: { delay: 0.06, frames: 9, looped: false },
      attack02: { delay: 0.06, frames: 3, looped: false },
      attack02_loop: { delay: 0.05, frames: 6, looped: true },
      attack02_end: { delay: 0.06, frames: 5, looped: false },
      sleep: { delay: 0.06, frames: 9, looped: false },
      sleep_loop: { delay: 0.05, frames: 13, looped: true },
      sleep_end: { delay: 0.06, frames: 9, looped: false }
    }
  },
  GJBeast05: {
    defaultAnimation: "idle01",
    animations: {
      idle01: { delay: 0.06, frames: 13, looped: false },
      idle02: { delay: 0.06, frames: 12, looped: false },
      idle03: { delay: 0.06, frames: 9, looped: false },
      toAttack01: { delay: 0.045, frames: 8, looped: false },
      attack01: { delay: 0.06, frames: 13, looped: true },
      attack02: { delay: 0.06, frames: 13, looped: false },
      toAttack03: { delay: 0.045, frames: 8, looped: false },
      attack03: { delay: 0.04, frames: 4, looped: true },
      fromAttack03: { delay: 0.05, frames: 9, looped: false }
    }
  }
};

const BEAST_ANIM_NAMES_BY_ID = {
  918: ["bite", "attack01", "attack01_end", "idle01", "attack01_loop"],
  1584: ["idle01", "idle02", "idle03", "attack01", "attack02", "attack02_end", "sleep", "sleep_loop", "sleep_end", "attack02_loop"],
  2012: ["idle01", "idle02", "toAttack01", "attack01", "attack02", "toAttack03", "attack03", "idle03", "fromAttack03"]
};

const BEAST_ANIM_EYES = {
  918: { frame: "GJBeast01_03_001.png", parent: "GJBeast01_01_001.png" }
};

const BEAST_ANIM_30FPS_DELAY = 1 / 30;

const BEAST_ANIM_UNIT_SCALE = 2;

const BEAST_ANIM_TWEEN_TIME = 0.15;

function beastAnimAnimDef(animName, base) {
  const defs = BEAST_ANIM_DEFS[animName];
  return (defs && defs.animations && defs.animations[base]) || null;
}

function beastAnimDelay(state) {
  const def = beastAnimAnimDef(state.animName, state.base);
  return def && Number.isFinite(def.delay) && def.delay > 0 ? def.delay : BEAST_ANIM_30FPS_DELAY;
}

function beastAnimFrameCount(state) {
  const def = beastAnimAnimDef(state.animName, state.base);
  const group = state.desc.groups[state.animName + "_" + state.base];
  const available = group ? group.length : 0;
  if (def && Number.isFinite(def.frames) && def.frames > 0) return Math.min(def.frames, available);
  return available;
}

function beastAnimIsLoopingBase(state, base) {
  const def = beastAnimAnimDef(state.animName, base);
  if (def) return !!def.looped;
  return typeof base === "string" && /_loop$/.test(base);
}

function beastAnimRandomizeTimer(state) {
  if (!state) return;
  state.rng = Math.random();
  state.timer = state.rng * beastAnimDelay(state);
}

const beastAnimCache = {};

function beastAnimParsePair(str, defX, defY) {
  if (typeof str !== "string") return { x: defX, y: defY };
  const m = str.match(/\{\s*([^,]+)\s*,\s*([^}]+)\s*\}/);
  if (!m) return { x: defX, y: defY };
  return { x: parseFloat(m[1]) || 0, y: parseFloat(m[2]) || 0 };
}

function beastAnimReadSceneDesc(descKey) {
  try {
    const sceneRef = window.scene;
    const scene = sceneRef && sceneRef.systems && sceneRef.systems.scene ? sceneRef.systems.scene : sceneRef;
    if (scene && scene.cache && scene.cache.json) return scene.cache.json.get(descKey) || null;
  } catch (err) {}
  return null;
}

function beastAnimGetDesc(animName) {
  const key = animName;
  if (beastAnimCache[key] !== undefined) return beastAnimCache[key];
  let data = null;
  try {
    if (typeof window !== "undefined") data = window[animName + "_AnimDesc"] || null;
    if (!data) {
      data = beastAnimReadSceneDesc(animName + "_AnimDesc");
      if (data && typeof window !== "undefined") window[animName + "_AnimDesc"] = data;
    }
  } catch (err) { data = null; }
  if (!data && typeof BEAST_DESC_FALLBACK !== "undefined") data = null;
  if (!data || !data.animationContainer) {
    beastAnimCache[key] = null;
    return null;
  }
  const groups = {};
  const container = data.animationContainer;
  for (const frameKey of Object.keys(container)) {
    const m = frameKey.match(/^(.*?)_(\d+)\.png$/);
    if (!m) continue;
    const base = m[1];
    if (!groups[base]) groups[base] = [];
    groups[base].push(frameKey);
  }
  for (const base of Object.keys(groups)) {
    groups[base].sort((a, b) => {
      const na = parseInt((a.match(/_(\d+)\.png$/) || [0, 0])[1], 10) || 0;
      const nb = parseInt((b.match(/_(\d+)\.png$/) || [0, 0])[1], 10) || 0;
      return na - nb;
    });
  }
  const desc = { raw: data, groups, container };
  beastAnimCache[key] = desc;
  return desc;
}

function beastAnimGetGroup(animName, base) {
  const desc = beastAnimGetDesc(animName);
  return desc ? (desc.groups[animName + "_" + base] || null) : null;
}

function beastAnimFrameExists(animName, base) {
  const desc = beastAnimGetDesc(animName);
  return !!(desc && desc.groups[animName + "_" + base] && desc.groups[animName + "_" + base].length);
}

function beastAnimResolveBase(id) {
  return BEAST_ANIM_NAME_BY_ID[id] || null;
}

function beastAnimAnimNameForCommand(id, animIdx) {
  const names = BEAST_ANIM_NAMES_BY_ID[id];
  if (names && animIdx >= 0 && animIdx < names.length) return names[animIdx];
  return null;
}

function beastAnimCreateState(objectId) {
  const animName = beastAnimResolveBase(objectId);
  if (!animName) return null;
  const desc = beastAnimGetDesc(animName);
  if (!desc) return null;
  const state = {
    objectId,
    animName,
    desc,
    animId: 0,
    base: null,
    frameIdx: 0,
    timer: 0,
    rng: Math.random()
  };
  beastAnimDefaultBase(state);
  return state;
}

function beastAnimSetBase(state, base, animId) {
  const group = state.desc.groups[state.animName + "_" + base];
  if (!group || !group.length) return false;
  state.base = base;
  state.frameIdx = 0;
  state.timer = 0;
  if (animId !== undefined) state.animId = animId;
  return true;
}

function beastAnimFinishAction(state) {
  const id = state.objectId;
  const rnd = Math.random();
  switch (id) {
    case 918: {
      const prev = state.base;
      if (prev === "attack01") {
        if (beastAnimFrameExists(state.animName, "attack01_loop")) {
          beastAnimSetBase(state, "attack01_loop", 1);
          beastAnimRandomizeTimer(state);
          return;
        }
        beastAnimSetBase(state, "bite", 0);
        beastAnimRandomizeTimer(state);
        return;
      }
      if (prev === "bite") return;
      beastAnimSetBase(state, "idle01", 3);
      beastAnimRandomizeTimer(state);
      return;
    }
    case 1327: {
      if (rnd <= 0.75) beastAnimSetBase(state, "idle01", 0);
      else beastAnimSetBase(state, "idle02", 0);
      beastAnimRandomizeTimer(state);
      return;
    }
    case 1328: {
      if (rnd <= 0.9) beastAnimSetBase(state, "idle01", 0);
      else beastAnimSetBase(state, "idle02", 0);
      beastAnimRandomizeTimer(state);
      return;
    }
    case 1584: {
      const prev = state.base;
      if (prev === "attack02") {
        if (beastAnimFrameExists(state.animName, "attack02_loop")) {
          beastAnimSetBase(state, "attack02_loop", 9);
          beastAnimRandomizeTimer(state);
          return;
        }
      }
      if (prev === "sleep") {
        if (beastAnimFrameExists(state.animName, "sleep_loop")) {
          beastAnimSetBase(state, "sleep_loop", 7);
          beastAnimRandomizeTimer(state);
          return;
        }
      }
      if (prev === "sleep_loop") {
        if (beastAnimFrameExists(state.animName, "sleep_end")) {
          beastAnimSetBase(state, "sleep_end", 8);
          beastAnimRandomizeTimer(state);
          return;
        }
      }
      if (prev === "sleep_end") {
        beastAnimSetBase(state, "idle01", 0);
        beastAnimRandomizeTimer(state);
        return;
      }
      if (prev === "attack02_loop" || prev === "attack02_end") {
        beastAnimSetBase(state, "idle01", 0);
        beastAnimRandomizeTimer(state);
        return;
      }
      if (prev === "attack01") {
        beastAnimSetBase(state, "idle01", 0);
        beastAnimRandomizeTimer(state);
        return;
      }
      if (rnd <= 0.75) beastAnimSetBase(state, "idle01", 0);
      else beastAnimSetBase(state, "idle02", 0);
      beastAnimRandomizeTimer(state);
      return;
    }
    case 2012: {
      const prev = state.base;
      if (prev === "toAttack03") {
        beastAnimSetBase(state, "attack03", 6);
        beastAnimRandomizeTimer(state);
        return;
      }
      if (prev === "fromAttack03" || prev === "attack02" || prev === "toAttack01") {
        beastAnimSetBase(state, "attack01", 3);
        beastAnimRandomizeTimer(state);
        return;
      }
      if (prev === "attack01" || prev === "attack03") {
          if (rnd <= 0.75) beastAnimSetBase(state, "idle01", 0);
          else beastAnimSetBase(state, "idle02", 0);
          beastAnimRandomizeTimer(state);
          return;
        }
      if (prev === "idle01") {
        if (rnd <= 0.75) beastAnimSetBase(state, "idle01", 0);
        else beastAnimSetBase(state, "idle02", 1);
        beastAnimRandomizeTimer(state);
        return;
      }
      beastAnimSetBase(state, "idle01", 0);
      beastAnimRandomizeTimer(state);
      return;
    }
  }
  beastAnimSetBase(state, "idle01", 0);
  beastAnimRandomizeTimer(state);
}

function beastAnimCommand(state, animIdx) {
  const base = beastAnimAnimNameForCommand(state.objectId, animIdx);
  if (!base || !beastAnimFrameExists(state.animName, base)) return false;
  beastAnimSetBase(state, base, animIdx);
  beastAnimRandomizeTimer(state);
  return true;
}

function beastAnimDefaultBase(state) {
  const id = state.objectId;
  const defs = BEAST_ANIM_DEFS[state.animName];
  const defaultAnim = defs && defs.defaultAnimation;
  if (defaultAnim && beastAnimSetBase(state, defaultAnim)) {
    const total = beastAnimFrameCount(state);
    if (total > 1) state.frameIdx = Math.floor(Math.random() * total);
    beastAnimRandomizeTimer(state);
    return;
  }
  const def = BEAST_ANIM_DEFAULT_ANIM_ID[id];
  if (def !== undefined) {
    const base = beastAnimAnimNameForCommand(id, def);
    if (base && beastAnimSetBase(state, base, def)) {
      beastAnimRandomizeTimer(state);
      return;
    }
  }
  beastAnimSetBase(state, "idle01", 0);
  const defGroup = state.desc.groups[state.animName + "_idle01"];
  if (defGroup && defGroup.length > 1) {
    state.frameIdx = Math.floor(Math.random() * defGroup.length);
  }
  beastAnimRandomizeTimer(state);
}

function beastAnimAdvance(state, dt) {
  if (!state || !state.base) return;
  if (!Number.isFinite(state.timer)) state.timer = 0;
  if (!Number.isFinite(state.frameIdx)) state.frameIdx = 0;
  if (!Number.isFinite(dt) || dt <= 0) return;
  if (dt > 0.1) dt = 0.1;
  state.timer += dt;
  let guard = 0;
  while (guard++ < 240) {
    const delay = beastAnimDelay(state);
    if (state.timer < delay) break;
    state.timer -= delay;
    state.frameIdx++;
    const total = beastAnimFrameCount(state);
    if (!total) {
      beastAnimDefaultBase(state);
      break;
    }
    if (state.frameIdx >= total) {
      if (beastAnimIsLoopingBase(state, state.base)) {
        state.frameIdx = 0;
        continue;
      }
      beastAnimFinishAction(state);
      break;
    }
  }
}

window.BeastAnim = {
  IDS: BEAST_ANIM_OBJECT_IDS,
  EYES: BEAST_ANIM_EYES,
  eyeFor: function (objectId) { return BEAST_ANIM_EYES[objectId] || null; },
  TWEEN_TIME: BEAST_ANIM_TWEEN_TIME,
  UNIT_SCALE: BEAST_ANIM_UNIT_SCALE,
  getDesc: beastAnimGetDesc,
  frameExists: beastAnimFrameExists,
  isLoopingBase: beastAnimIsLoopingBase,
  animDef: beastAnimAnimDef,
  delayFor: beastAnimDelay,
  frameCount: beastAnimFrameCount,
  createState: beastAnimCreateState,
  setBase: beastAnimSetBase,
  defaultBase: beastAnimDefaultBase,
  command: beastAnimCommand,
  advance: beastAnimAdvance,
  animNameForCommand: beastAnimAnimNameForCommand,
  resolveBase: beastAnimResolveBase,
  parsePair: beastAnimParsePair
};
