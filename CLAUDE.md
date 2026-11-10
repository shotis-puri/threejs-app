# Three.js app (Vite, vanilla JS)

## Structure
- `src/core/` – App (main class), Camera, Input, AssetManager
- `src/world/` – World: everything that lives in the scene
- `src/objects/` – one class per game object (owns its mesh + `update(delta, elapsed)`)
- `src/systems/` – logic that spans objects
- `src/utils/` – small helpers
- `src/ui/` – HTML overlay HUD (HealthBar, Backpack); reads State, redraws only on change
- `src/config/assets.js` – asset manifest
- `src/config/items.js` – item definitions (name, icon, maxStack) for the backpack
- `public/models`, `public/textures` – asset files

## Code rules
- ES modules, one class per file, default export, file name = class name.
- Import three as `import * as THREE from 'three'`; addons from `three/addons/...`.
- Anything with listeners or GPU resources must have `destroy()` / `dispose()`.
- Use `delta` from the App loop, never `Date.now()` or fixed per-frame steps.

## Loading models and textures
1. Format: **glTF binary (`.glb`)**. No FBX/OBJ unless explicitly requested.
2. Put files in `public/models/` (textures in `public/textures/`); reference them by root path, e.g. `/models/robot.glb`.
3. Register every asset in `src/config/assets.js` as `{ name, type, path }`.
   Types: `gltf`, `texture`. Add a new loader to `AssetManager.loaders` for new types.
4. **Only load through `AssetManager`** (`app.assets`). Never create a loader
   directly in an object or `World`. All loaders must share the
   `THREE.LoadingManager` inside `AssetManager`, so progress covers everything.
5. Load before building the world: `await app.assets.load(manifest)`, then
   `app.assets.get('name')`. Objects must not start loading in their constructor.
6. Progress / loading screen: use `assets.onStart`, `onProgress`, `onLoad`, `onError`.
   Don't create another LoadingManager.
7. Reuse, don't re-load: to place the same model many times use
   `gltf.scene.clone()` (use `SkeletonUtils.clone` for skinned meshes).
   Never mutate the cached `gltf.scene` itself.
8. Color textures (albedo/emissive) need `colorSpace: 'srgb'` in the manifest;
   data textures (normal, roughness, ao) stay linear.
9. Animations: keep `gltf.animations` from the cached asset, create one
   `THREE.AnimationMixer` per instance and update it in the object's `update(delta)`.
10. Compressed models (Draco / KTX2 / meshopt): add the decoder to `AssetManager`
    using the same manager, with decoder files served from `public/`.
11. Cleanup: remove objects with `scene.remove()`; call `assets.dispose()` only
    when assets are no longer needed anywhere.
12. Failures: `AssetManager` logs and rejects on a bad path. Don't swallow the error.

## Commands
- `npm run dev` – dev server
- `npm run build` – production build
