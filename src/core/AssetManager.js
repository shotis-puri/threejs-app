import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

/**
 * Loads and stores all assets. Every loader shares ONE THREE.LoadingManager,
 * so progress is reported for the whole queue.
 *
 *   await app.assets.load(manifest)
 *   const gltf = app.assets.get('robot')
 */
export default class AssetManager {
  constructor() {
    this.items = new Map()

    // Optional hooks: assign functions from UI code (loading screen, etc.)
    this.onStart = null // (url, loaded, total)
    this.onProgress = null // (url, loaded, total, ratio)
    this.onLoad = null // ()
    this.onError = null // (url)

    this.manager = new THREE.LoadingManager()
    this.manager.onStart = (url, loaded, total) => this.onStart?.(url, loaded, total)
    this.manager.onProgress = (url, loaded, total) =>
      this.onProgress?.(url, loaded, total, total ? loaded / total : 1)
    this.manager.onLoad = () => this.onLoad?.()
    this.manager.onError = (url) => {
      console.error(`[AssetManager] failed to load: ${url}`)
      this.onError?.(url)
    }

    this.loaders = {
      gltf: new GLTFLoader(this.manager),
      texture: new THREE.TextureLoader(this.manager),
      audio: new THREE.AudioLoader(this.manager), // -> AudioBuffer
    }
  }

  /** Load a list of { name, type, path, ...options }. Resolves when all are done. */
  async load(manifest = []) {
    await Promise.all(manifest.map((asset) => this.loadOne(asset)))
  }

  async loadOne({ name, type, path, colorSpace }) {
    if (this.items.has(name)) return this.items.get(name)

    const loader = this.loaders[type]
    if (!loader) throw new Error(`[AssetManager] unknown asset type "${type}" for "${name}"`)

    const item = await loader.loadAsync(path)
    if (type === 'texture' && colorSpace === 'srgb') item.colorSpace = THREE.SRGBColorSpace

    this.items.set(name, item)
    return item
  }

  get(name) {
    const item = this.items.get(name)
    if (!item) throw new Error(`[AssetManager] asset "${name}" is not loaded`)
    return item
  }

  /** Free GPU memory for everything loaded. */
  dispose() {
    for (const item of this.items.values()) {
      item.dispose?.() // textures
      item.scene?.traverse((o) => {
        o.geometry?.dispose()
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        mats.forEach((m) => {
          if (!m) return
          for (const v of Object.values(m)) if (v?.isTexture) v.dispose()
          m.dispose()
        })
      })
    }
    this.items.clear()
  }
}
