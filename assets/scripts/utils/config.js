// editable config stuff 

if (window.mainColor == null) {
  window.mainColor = parseInt(localStorage.getItem("iconMainColor") || "04FF00", 16);
}
if (window.secondaryColor == null) {
  window.secondaryColor = parseInt(localStorage.getItem("iconSecondaryColor") || "00FBFF", 16);
}
window.currentPlayer = localStorage.getItem("iconCurrentPlayer") || "player_01";
window.currentShip   = localStorage.getItem("iconCurrentShip")   || "ship_01";
window.currentBall   = localStorage.getItem("iconCurrentBall")   || "player_ball_01";
window.currentWave   = localStorage.getItem("iconCurrentWave")   || "dart_01";
window.currentSpider = localStorage.getItem("iconCurrentSpider") || "spider_01";
window.currentBird   = localStorage.getItem("iconCurrentBird")   || "bird_01";
const storedUseDirectInternet = localStorage.getItem("gd_useDirectInternet");
window.useDirectInternet = storedUseDirectInternet === null ? true : storedUseDirectInternet === "true";
window.getGdApiBase = function () {
  if (window.useDirectInternet) return "https://www.boomlings.com/database";
  return (window._gdProxyUrl || "").replace(/\/$/, "");
};
window.getGdApiUrl = function (path) {
  const base = window.getGdApiBase();
  if (!base) return null;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
};
window.fetchGdApi = async function (path, options = {}) {
  const directUrl = window.useDirectInternet ? window.getGdApiUrl(path) : null;
  const proxyBase = (window._gdProxyUrl || "").replace(/\/$/, "");
  const proxyUrl = proxyBase ? `${proxyBase}${path.startsWith("/") ? "" : "/"}${path}` : null;
  const urls = [];
  if (directUrl) urls.push(directUrl);
  if (proxyUrl && proxyUrl !== directUrl) urls.push(proxyUrl);
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("No GD API endpoint available");
};
window.getGdAudioUrl = function (songUrl) {
  if (window.useDirectInternet) return songUrl;
  const proxyBase = (window._gdProxyUrl || "").replace(/\/$/, "");
  return proxyBase ? `${proxyBase}/audio-proxy?url=${encodeURIComponent(songUrl)}` : songUrl;
};
window.fetchGdAudio = async function (songUrl, options = {}) {
  const directUrl = window.useDirectInternet ? songUrl : null;
  const proxyBase = (window._gdProxyUrl || "").replace(/\/$/, "");
  const proxyUrl = proxyBase ? `${proxyBase}/audio-proxy?url=${encodeURIComponent(songUrl)}` : null;
  const urls = [];
  if (directUrl) urls.push(directUrl);
  if (proxyUrl && proxyUrl !== directUrl) urls.push(proxyUrl);
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("No audio endpoint available");
};
window.currentlevel = [
	"stereo_madness", // internal level name
	"Stereo Madness", // proper level name
	"level_1",        // level id in assets/levels
	["RobTop", "Forever Bound"]   // person who made the song
];
window.orbClickScale = 2.0;
window.orbClickShrinkTime = 250;
window.orbParticleSize = 3.5;

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('id')) {
  window.levelID = urlParams.get('id');
}

// -------------------------------

function hexToHexadecimal(str) {
  return parseInt(str, 16);
}

function hexadecimalToHex(num) {
  return num.toString(16).padStart(6, '0');
}

let screenWidth = 1138;
const screenHeight = 640;
const RES_SCALE = 2;

// Renders content at a higher pixel density without touching camera.zoom (which broke
// WebGL rendering on this codebase for still-unexplained reasons — see project memory).
// Nests every factory-created object into one scaled wrapper container instead, the same
// this.add.X monkey-patch technique the old UHD system used, proven safe in this codebase.
// Sprites swapped to higher-res UHD source atlases (see loading-screen.js's multi-source
// atlas loads) sample more texture detail than before but keep the same cutWidth/cutHeight
// as the source pixels -- Phaser's render quad size comes from cutWidth/cutHeight * scale,
// NOT from spriteSourceSize/sourceSize (verified empirically: setTrim() only affects the
// cosmetic .width/.height getters, not actual draw geometry). So each upgraded sprite must
// be explicitly scaled back down via setDisplaySize to its original on-screen footprint --
// that's what gives real per-sprite supersampling (GPU minification) instead of the sprite
// just rendering RES_SCALE-times too big.
function getUhdUpgradeLookup(scene) {
  if (window._uhdUpgradeLookup) return window._uhdUpgradeLookup;
  const manifest = scene.cache.json.get('_uhdUpgradedManifest');
  if (!manifest) return {};
  const lookup = {};
  for (const key in manifest) {
    lookup[key] = { frames: new Set(manifest[key].frames), ratio: manifest[key].ratio };
  }
  window._uhdUpgradeLookup = lookup;
  return lookup;
}

function wrapSceneForResScale(scene) {
  const factory = scene.add;
  if (!factory._origContainer) {
    factory._origContainer = factory.container.bind(factory);
  }
  scene._resContainer = factory._origContainer(0, 0).setScale(RES_SCALE);
  // Containers render children in insertion order, NOT by .depth -- only the
  // Scene's own top-level display list auto depth-sorts every frame (via its
  // own queueDepthSort()/depthSort() pair, which Container does NOT inherit --
  // Container only has the generic List.sort(property) method, confirmed
  // empirically: Container.prototype has no depthSort/queueDepthSort of its
  // own). Nesting everything into this one container (below) silently broke
  // every .setDepth() call in the codebase: a later-added, lower-depth object
  // still paints over an earlier-added, higher-depth one (verified
  // empirically -- e.g. the main-menu open-submenu fade-in graphic, added
  // before the submenu content, got instantly painted over despite its
  // higher depth, so the fade never showed; the close transition's fade-out
  // graphic is added *after* the content it covers, so insertion order
  // accidentally matched depth order there and it looked fine). Re-sorting
  // by depth every frame restores real depth ordering; the container is
  // small enough (per-scene UI, not thousands of objects) that an
  // unconditional sort every frame is cheap -- no dirty-flag plumbing needed.
  if (!scene._resContainerDepthSortBound) {
    scene._resContainerDepthSortBound = true;
    scene.events.on('update', () => scene._resContainer.sort('depth'));
  }
  const uhdLookup = getUhdUpgradeLookup(scene);

  if (!factory._resPatched) {
    const methods = ['image', 'container', 'rectangle', 'text', 'tileSprite', 'graphics',
      'particles', 'zone', 'circle', 'polygon', 'nineslice', 'bitmapText'];
    methods.forEach(method => {
      if (typeof factory[method] !== 'function') return;
      const orig = factory[method].bind(factory);
      factory[method] = (...args) => {
        const obj = orig(...args);
        scene._resContainer.add(obj);
        if (obj.texture && obj.frame) {
          const entry = uhdLookup[obj.texture.key];
          // NineSlice's width/height are live setters that actually resize/re-tile it --
          // unlike Image, where .width is just a cosmetic snapshot decoupled from the real
          // render quad -- so this whole compensation block (built for that Image mismatch)
          // does real, compounding damage to a NineSlice: setScale() shrinks its displayed
          // size by 1/ratio, then the .width/.height override below resizes it a second time
          // down to the pre-upgrade footprint, on top of that scale -- the net result renders
          // at a small fraction of the width/height the caller explicitly requested (verified
          // empirically: the Quick Search grid's nineslice backgrounds, asked for ~227x59,
          // rendered as a tiny ~90px pill). NineSlice already reads the frame's real
          // cutWidth/cutHeight/border geometry itself to figure out how to tile at whatever
          // width/height the caller passes in, so none of this correction is needed there.
          if (entry && entry.frames.has(obj.frame.name) && obj.type !== 'NineSlice') {
            // Render size = cutWidth/cutHeight * scaleX/scaleY (verified empirically -- NOT
            // spriteSourceSize/sourceSize, those don't affect draw geometry), so this is the
            // only reliable way to shrink the higher-res sprite back to its original footprint.
            obj.setScale(obj.scaleX / entry.ratio, obj.scaleY / entry.ratio);
            // Any scale a caller sets afterward (the common `.setScale(x)` chained straight
            // onto this.add.image(...) throughout this codebase) is expressed in "pre-upgrade"
            // terms -- i.e. what it would need to be against the original lower-res atlas.
            // Left unwrapped, that call overwrites the compensation above with an absolute
            // value and renders at entry.ratio times too large (verified empirically: the
            // creator-menu grid buttons, which chain .setScale(0.77), rendered at displayWidth
            // 321.86 instead of the intended 160.93 -- exactly double). Wrap setScale so any
            // later caller-supplied scale gets the same ratio compensation applied.
            const origSetScale = obj.setScale.bind(obj);
            obj.setScale = (x, y) => {
              const sx = x === undefined ? 1 : x;
              const sy = y === undefined ? sx : y;
              return origSetScale(sx / entry.ratio, sy / entry.ratio);
            };
            // GameObject.width/.height are a snapshot taken from frame.realWidth at creation
            // time (setSizeToFrame), not a live getter -- other code in this codebase reads
            // .width/.height for layout math (e.g. positioning sibling buttons), so they still
            // need correcting back down to the sprite's original footprint here. displayWidth
            // (scaleX * realWidth) is a live getter and already reports correctly since
            // realWidth naturally matches cutWidth for these untrimmed upgraded frames -- no
            // separate fix needed there.
            const origSizes = window._uhdOrigSizes && window._uhdOrigSizes[obj.texture.key];
            const origSize = origSizes && origSizes[obj.frame.name];
            if (origSize) {
              obj.width = origSize.w;
              obj.height = origSize.h;
              // Phaser's updateDisplayOrigin() computes displayOriginX/Y as originX/Y *
              // this.width/height -- so ANY explicit .setOrigin(...) call chained after
              // creation (default origin from setOriginFromFrame() at construction time,
              // BEFORE the .width/.height override above, is unaffected) recomputes the
              // pivot from the now-corrected (smaller) .width/.height, while the actual
              // render quad stays at the larger cutWidth/cutHeight * scale. That mismatch
              // pulls the visual/interactive pivot toward the top-left corner of the real
              // (bigger) rendered sprite -- verified empirically on the search menu's
              // difficulty-filter icons and search/find-people/delete buttons, all of which
              // chain .setOrigin(0.5) after creation. Wrap setOrigin to recompute the pivot
              // from the frame's real (uncorrupted) size instead.
              const origSetOrigin = obj.setOrigin.bind(obj);
              obj.setOrigin = (x, y) => {
                origSetOrigin(x, y);
                obj._displayOriginX = obj.originX * obj.frame.realWidth;
                obj._displayOriginY = obj.originY * obj.frame.realHeight;
                return obj;
              };
              // setInteractive() with no args builds its default hit area straight from
              // .width/.height in RAW local-frame units, then lets scaleX/scaleY (already
              // compensated above) shrink it back down during hit-testing -- exactly like it
              // does for the render quad. Building that default hit area from the now-corrected
              // (smaller) .width/.height double-applies the shrink: the hit area ends up scaled
              // down twice, so it's both mispositioned and half the size it should be on screen.
              // Wrap setInteractive so its default hit area is instead built from the natural
              // (raw) frame size -- recovered from displayOriginX/Y / originX/Y, which the
              // setOrigin wrap above now keeps correct regardless of call order -- which comes
              // out correctly sized and centered once scaleX/scaleY are applied during
              // hit-testing.
              const origSetInteractive = obj.setInteractive.bind(obj);
              obj.setInteractive = (...siArgs) => {
                origSetInteractive(...siArgs);
                if (siArgs.length === 0 && obj.input && obj.input.hitArea) {
                  const naturalWidth = obj.originX ? obj.displayOriginX / obj.originX : obj.width;
                  const naturalHeight = obj.originY ? obj.displayOriginY / obj.originY : obj.height;
                  obj.input.hitArea.setTo(0, 0, naturalWidth, naturalHeight);
                }
                return obj;
              };
            }
          }
        }
        return obj;
      };
    });
    factory._resPatched = true;
  }
}
const a = 60;
const o = 180;
let centerX = screenWidth / 2 - 150;
function l(screenWidth) {
  this.screenWidth = screenWidth;
  centerX = screenWidth / 2 - 150;
}
const u = 1 / 240;
const SpeedPortal = {
  HALF: 9.30222544655,
  ONE_TIMES: 11.540004,
  TWO_TIMES: 14.3488938625,
  THREE_TIMES: 17.3333393414,
  FOUR_TIMES: 21.3333407279
}
let playerSpeed = SpeedPortal.ONE_TIMES;
const d = 0.9;
const p = 1.916398;
const f = 600;
const g = a;
const jumpPadType = "jump_pad";
const jumpRingType = "jump_ring";
const T = 460;
function b(y) {
  return T - y;
}
let S = Phaser.BlendModes.ADD;
let E = Phaser.BlendModes.NORMAL;

const fs = 1000;
const gs = 1001;

const atlasList = [
  "GJ_WebSheet",
  "GJ_GameSheet",
  "GJ_GameSheet02",
  "GJ_GameSheet03",
  "GJ_GameSheet04",
  "GJ_GameSheetEditor",
  "GJ_GameSheetGlow",
  "GJ_GameSheetIcons",
  "GJ_LaunchSheet",
  "player_ball_00",
  "player_dart_00",
  "GJ_ParticleSheet-uhd",
  "GJ_ParticleSheet",
  "PixelSheet_01-hd",
  "FireSheet_01-hd"
];
function getAtlasFrame(scene, frameName) {
  if (frameName.startsWith("player_")) {
    const playerAtlasPriority = ["GJ_GameSheet03", "GJ_GameSheet", "GJ_GameSheet02", "GJ_GameSheet04", "GJ_GameSheetEditor", "GJ_GameSheetGlow", "GJ_GameSheetIcons", "GJ_WebSheet", "GJ_LaunchSheet", "player_ball_00", "player_dart_00"];
    for (let atlasName of playerAtlasPriority) {
      if (scene.textures.exists(atlasName)) {
        if (scene.textures.get(atlasName).has(frameName)) {
          return {
            atlas: atlasName,
            frame: frameName
          };
        }
      }
    }
  }
  for (let atlasName of atlasList) {
    if (scene.textures.exists(atlasName)) {
      if (scene.textures.get(atlasName).has(frameName)) {
        return {
          atlas: atlasName,
          frame: frameName
        };
      }
    }
  }
  return null;
}
function addImageToScene(scene, x, y, textureName) {
  let textureInfo = getAtlasFrame(scene, textureName);
  if (textureInfo) {
    return scene.add.image(x, y, textureInfo.atlas, textureInfo.frame);
  } else if (scene.textures.exists(textureName)) {
    return scene.add.image(x, y, textureName);
  } else {
    return null;
  }
}
