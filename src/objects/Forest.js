import * as THREE from 'three'

/** Tree types: asset name, height range (world units), trunk radius as a fraction of height. */
const TREE_TYPES = [
  // { asset: 'pine', height: [3.5, 5], trunk: 0.04 },
  // { asset: 'tree-quaternius', height: [3, 4.5], trunk: 0.04 },
  { asset: 'tree-marc', height: [3, 5], trunk: 0.12 },
  { asset: 'tree-poly', height: [3, 4.5], trunk: 0.08 },
]

/**
 * Scatters random trees on a square ground, no two footprints overlap.
 * Each tree is a circle on the ground (crown radius); circles never intersect.
 */
export default class Forest {
  /**
   * @param assets    AssetManager
   * @param size      ground side length (centered on 0,0)
   * @param count     how many trees to try to place
   * @param gap       extra free space between two trees
   * @param clearance free radius around (0,0) where the character spawns
   * @param crownScale how much of the bounding box counts as footprint (<1: crowns are round)
   * @param seed      number for a repeatable layout, null = different every load
   */
  constructor(assets, { size = 20, count = 20, gap = 0.3, clearance = 2.5, crownScale = 0.8, seed = null } = {}) {
    this.root = new THREE.Group()
    this.trees = [] // { root, x, z, radius }  radius = crown footprint (used for spacing)
    this.colliders = [] // { x, z, radius }  radius = trunk (what the character bumps into)

    this.random = seed === null ? Math.random : Forest.seededRandom(seed)
    this.prototypes = TREE_TYPES.map((type) => ({ ...type, ...this.createPrototype(assets.get(type.asset), crownScale) }))

    this.scatter({ size, count, gap, clearance })
  }

  /**
   * Normalize a model: height 1, base on y=0, centered on x/z.
   * Returns the group to clone plus its footprint radius at height 1.
   */
  createPrototype(gltf, crownScale) {
    const model = gltf.scene.clone() // never touch the cached scene
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })

    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    const scale = 1 / size.y
    model.scale.multiplyScalar(scale)
    model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale)

    const root = new THREE.Group()
    root.add(model)

    return { root, radius: (Math.max(size.x, size.z) * scale * crownScale) / 2 }
  }

  scatter({ size, count, gap, clearance }) {
    const half = size / 2
    const maxAttempts = 80

    for (let i = 0; i < count; i++) {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const type = this.prototypes[Math.floor(this.random() * this.prototypes.length)]
        const height = type.height[0] + this.random() * (type.height[1] - type.height[0])
        const radius = type.radius * height

        // stay fully inside the ground
        const x = (this.random() * 2 - 1) * (half - radius)
        const z = (this.random() * 2 - 1) * (half - radius)

        if (Math.hypot(x, z) < radius + clearance) continue // spawn point
        if (this.trees.some((t) => Math.hypot(x - t.x, z - t.z) < radius + t.radius + gap)) continue // overlap

        const root = type.root.clone()
        root.scale.setScalar(height)
        root.position.set(x, 0, z)
        root.rotation.y = this.random() * Math.PI * 2

        this.root.add(root)
        this.trees.push({ root, x, z, radius })
        this.colliders.push({ x, z, radius: type.trunk * height })
        break
      }
    }

    if (this.trees.length < count) {
      console.warn(`[Forest] placed ${this.trees.length}/${count} trees (no free space left, lower count/gap or enlarge ground)`)
    }
  }

  /** Small deterministic random generator (mulberry32). */
  static seededRandom(seed) {
    let a = seed >>> 0
    return () => {
      a = (a + 0x6d2b79f5) >>> 0
      let t = a
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  destroy() {
    this.root.removeFromParent()
    this.trees.length = 0
    this.colliders.length = 0
  }
}
