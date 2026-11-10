import * as THREE from 'three'
import ITEMS from '../config/items.js'

/**
 * Collectible items lying on the ground. Walk close to one to put it in the backpack.
 * Spawned at random free spots (away from trees, spawn point and each other).
 */
export default class Pickups {
  /**
   * @param state     shared State (inventory lives there)
   * @param size      ground side length
   * @param count     how many to place
   * @param avoid     circles { x, z, radius } to stay away from (tree trunks)
   * @param onCollect (id, item) => void, called after an item went into the backpack
   */
  constructor(state, { size = 20, count = 12, avoid = [], onCollect = null } = {}) {
    this.state = state
    this.onCollect = onCollect
    this.collectRadius = 0.8
    this.root = new THREE.Group()
    this.items = [] // { id, group, sprite, phase }
    this.fullCooldown = 0

    // one emoji texture per item type
    this.textures = {}
    for (const [id, def] of Object.entries(ITEMS)) this.textures[id] = Pickups.emojiTexture(def.icon)

    this.glowGeometry = new THREE.CircleGeometry(0.3, 24)
    this.glowMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false })

    this.scatter({ size, count, avoid })
  }

  static emojiTexture(emoji) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d')
    ctx.font = '96px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(emoji, 64, 70)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  scatter({ size, count, avoid }) {
    const half = size / 2 - 1
    const ids = Object.keys(ITEMS)

    for (let i = 0; i < count; i++) {
      for (let attempt = 0; attempt < 60; attempt++) {
        const x = (Math.random() * 2 - 1) * half
        const z = (Math.random() * 2 - 1) * half

        if (Math.hypot(x, z) < 1.5) continue // not on the spawn point
        if (avoid.some((o) => Math.hypot(x - o.x, z - o.z) < o.radius + 0.9)) continue // not inside trees
        if (this.items.some((p) => Math.hypot(x - p.group.position.x, z - p.group.position.z) < 1.2)) continue

        this.add(ids[Math.floor(Math.random() * ids.length)], x, z)
        break
      }
    }
  }

  add(id, x, z) {
    const group = new THREE.Group()
    group.position.set(x, 0, z)

    const glow = new THREE.Mesh(this.glowGeometry, this.glowMaterial)
    glow.rotation.x = -Math.PI / 2
    glow.position.y = 0.02
    group.add(glow)

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.textures[id], transparent: true, depthWrite: false }))
    sprite.scale.setScalar(0.7)
    sprite.position.y = 0.55
    group.add(sprite)

    this.root.add(group)
    this.items.push({ id, group, sprite, phase: Math.random() * Math.PI * 2 })
  }

  /** @param character object with root.position and `dead` */
  update(delta, elapsed, character) {
    this.fullCooldown = Math.max(0, this.fullCooldown - delta)
    const pos = character.root.position

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i]
      item.sprite.position.y = 0.55 + Math.sin(elapsed * 2.5 + item.phase) * 0.08 // bob

      if (character.dead) continue
      const near = Math.hypot(pos.x - item.group.position.x, pos.z - item.group.position.z) < this.collectRadius
      if (!near) continue

      if (this.state.addItem(item.id) === 0) {
        this.root.remove(item.group)
        item.sprite.material.dispose()
        this.items.splice(i, 1)
        this.onCollect?.(item.id, ITEMS[item.id])
      } else if (this.fullCooldown === 0) {
        this.fullCooldown = 2
        this.onCollect?.('full', null) // backpack has no room
      }
    }
  }

  destroy() {
    this.root.removeFromParent()
    for (const item of this.items) item.sprite.material.dispose()
    for (const t of Object.values(this.textures)) t.dispose()
    this.glowGeometry.dispose()
    this.glowMaterial.dispose()
    this.items.length = 0
  }
}
