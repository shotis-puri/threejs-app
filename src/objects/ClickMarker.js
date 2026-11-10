import * as THREE from 'three'

/**
 * Ground marker for click-to-move, built from code (no assets):
 *  - a ripple that expands and fades where you clicked
 *  - a pulsing target ring + dot that stays while the character is on its way
 * Blue = walk, orange = run.
 */
export default class ClickMarker {
  constructor() {
    this.walkColor = new THREE.Color(0x44aaff)
    this.runColor = new THREE.Color(0xffaa33)

    this.root = new THREE.Group()
    this.root.position.y = 0.02 // just above the grid
    this.root.visible = false

    const makeMaterial = () =>
      new THREE.MeshBasicMaterial({
        color: this.walkColor,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    const flat = (mesh) => {
      mesh.rotation.x = -Math.PI / 2
      mesh.castShadow = false
      mesh.receiveShadow = false
      return mesh
    }

    // one-shot ripple
    this.ripple = flat(new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), makeMaterial()))
    // persistent target: ring + dot
    this.ring = flat(new THREE.Mesh(new THREE.RingGeometry(0.28, 0.35, 48), makeMaterial()))
    this.dot = flat(new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), makeMaterial()))

    this.root.add(this.ripple, this.ring, this.dot)

    this.rippleTime = Infinity // seconds since the click
    this.rippleDuration = 0.6
    this.rippleSize = 0.9
    this.targetOpacity = 0 // fade the persistent marker toward this
    this.pulse = 0
  }

  /** Show the marker at a world point. */
  show(point, run = false) {
    const color = run ? this.runColor : this.walkColor
    for (const m of [this.ripple, this.ring, this.dot]) m.material.color.copy(color)

    this.root.position.x = point.x
    this.root.position.z = point.z
    this.root.visible = true

    this.rippleTime = 0
    this.targetOpacity = 1
  }

  /** moving = is the character still on its way? */
  update(delta, moving) {
    if (!this.root.visible) return
    if (!moving && this.rippleTime > 0.1) this.targetOpacity = 0 // arrived: fade out

    // ripple: grows and fades
    this.rippleTime += delta
    const t = Math.min(this.rippleTime / this.rippleDuration, 1)
    const eased = 1 - (1 - t) * (1 - t)
    this.ripple.scale.setScalar(0.2 + eased * this.rippleSize)
    this.ripple.material.opacity = (1 - t) * 0.9

    // target ring + dot: pulse while walking, fade when done
    this.pulse += delta * 6
    this.ring.scale.setScalar(1 + Math.sin(this.pulse) * 0.12)
    const fade = 1 - Math.exp(-12 * delta)
    const op = this.ring.material.opacity + (this.targetOpacity * 0.9 - this.ring.material.opacity) * fade
    this.ring.material.opacity = op
    this.dot.material.opacity = op

    if (this.targetOpacity === 0 && op < 0.01 && t >= 1) this.root.visible = false
  }

  destroy() {
    for (const m of [this.ripple, this.ring, this.dot]) {
      m.geometry.dispose()
      m.material.dispose()
    }
  }
}
