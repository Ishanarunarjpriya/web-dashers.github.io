# Changelog

All notable changes to this fork of Web Dashers compared to vanilla.

## Features & Improvements

### Rendering & Performance
- **Flat Depth System** — New rendering optimization for low-end devices (`_flatDepth`) that uses shared additive/normal containers instead of per-section containers, reducing draw calls
- **Low Device Mode (LDM)** — Added `_eeCulled` sprite culling; off-screen sprites are hidden via camera filters instead of destroying/recreating containers
- **Sprite culling** — Objects outside the visible section range are culled rather than rendered invisibly, improving performance on weak devices
- **FPS counter** — Fixed FPS text initialization order; now respects `showFPS` setting correctly at startup
- **Orb particle colors** — Extracted to shared `ORB_PARTICLE_COLORS` constant for reuse

### Color Channels
- **Additive blending per color channel** — Each channel can now have its own additive blend mode
- **Initial channel state** — Supports `_initialCopies` and `_initialOpacity` for per-level channel configuration
- **Alpha fix** — Fixed `getHex()` to return correct RGB without forcing opaque alpha (removed `0xFF000000 |`)
- **Glow suppression** — Objects with raw[96] === "1" skip glow rendering

### Player & Physics
- **GD Cube Slopes** — Implemented Geometry Dash-style slope collision for cube mode (`_usesGdCubeSlopes()`, `_gdCubeSlopeCollision()`)
- **Slope back-wall hit detection** — Added `_gdSlopeBackWallHit()` for accurate slope wall collisions
- **Slope flat cap landing** — Added `_slopeFlatCapLand()` for proper slope edge transitions
- **Slope tangent handling** — Fixed tangent speed calculation using `slopeTangentD`
- **Rotation fix** — Slope angle is now negated (`-bestSlopeCandidate.slopeAngle`) for correct visual orientation
- **Wave mode fix** — Cube mode no longer triggers rotation action on launch (`isCube` check)
- **Collision tracking** — Added `_lastCollisionWorldX/Y` to prevent duplicate collision events

### Triggers
- **Trigger engine fixes** — Fixed spawn, move, stop, follow, toggle, animation, shake, on-death, touch, pickup, count, and instant-count triggers
- **Shake triggers** — Improved screen shake implementation with `applyShakeToOffsets()` and per-container shake application
- **Death shake** — Automatic screen shake on player death (2.4 strength, 100ms duration)
- **Checkpoint triggers** — Toggle/pickup/count/on-death/touch triggers now properly reset and re-evaluate at checkpoints
- **Macro bot indicator** — Botted indicator now hides during menu, pause, and level complete states

### Beast Animations
- **Animated GJBeasts** — Added beast animation system with `GJBeast01-05_AnimDesc.json` support
- **Sync on level load** — `_syncBeastAnimDescs()` ensures beast animation data is loaded before level creation
- **Beast tint fix** — Fixed beast tinting and added optimization
- **Collision safety** — Prevents beasts from being crushed by level objects

### Input & UI
- **Jump input deduplication** — Input handler is now only defined once per scene lifecycle
- **Click cancel fix** — UI click detection now correctly cancels jump input when hovering UI elements
- **Settings sync** — Moved `_loadSettings()` earlier in scene init for proper initialization order
- **Song name display** — Fixed song name text display in menu (was incorrectly using `songTitleText` variable)
- **Percentage decimals** — Optimized percentage label updates to avoid unnecessary setText calls

### Death & Checkpoints
- **Teleport ignore** — Added `_ignoreTeleportUntilClear` to prevent teleport glitches on checkpoint respawn
- **Dual player death** — Both players now properly reset collision state on checkpoint
- **On-death triggers** — Added `triggerOnDeath()` call in death handler
- **Death timer** — Fixed death screen timer to respect `_hadNewBest` flag

### Level Editor
- **Level editor improvements** — Various fixes to editor functionality and object placement

### Misc
- **Hitbox trail refactored** — Extracted `_pushHitboxTrail()` helper for cleaner code
- **Camera shake** — All container positions now include shake offset for synchronized screen shake
- **Web bot hidden** — Removed/hid web bot from game

---

## Technical Details

### Files Modified
- `assets/scripts/core/game-scene.js` — Main game loop, rendering, UI, settings
- `assets/scripts/core/level.js` — Level loading, object management, color channels, triggers, flat depth system
- `assets/scripts/core/player.js` — Physics, slope collision, gamemode handling
- `assets/scripts/core/triggers.js` — Color manager, trigger engine
- `assets/scripts/game/allObjects.js` — Object definitions

### New Files
- `assets/scripts/core/beast-anim.js` — Beast animation system
- `assets/sheets/GJBeast0{1-5}_AnimDesc.json` — Beast animation descriptors
- `extras/Geometry-Dash-Miscellaneous-Decomp-Tools-main/` — GD decompilation tools and reference data
