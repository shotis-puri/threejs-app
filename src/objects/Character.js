import * as THREE from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'

/** Animated character: walks to state.character.target, idles when it arrives. */
export default class Character {
  constructor(gltf, state) {
    this.state = state

    this.height = 1 // model is scaled to this height (world units)
    this.walkSpeed = 1.7 // units per second (keep ~1.7x height so feet do not slide)
    this.runSpeed = 4 // units per second
    this.turnSpeed = 10 // higher = faster turn
    this.stopDistance = 0.05

    // Collision: the character is a circle on the ground, obstacles are circles { x, z, radius }
    this.collisionRadius = 0.3
    this.obstacles = [] // set from World, e.g. forest.colliders
    this.stuckTime = 0
    this.stuckLimit = 0.4 // seconds blocked before giving up on the target

    // Never touch the cached gltf.scene, clone it (skinned-mesh safe)
    const model = clone(gltf.scene)
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        o.frustumCulled = false // skinned bounds can be wrong
      }
    })

    // Normalize size. Skinned meshes report wrong Box3 bounds (bone scale),
    // so measure the skeleton's span instead and add headroom above the head bone.
    model.updateMatrixWorld(true)
    const v = new THREE.Vector3()
    let minY = Infinity
    let maxY = -Infinity
    model.traverse((o) => {
      if (!o.isBone) return
      o.getWorldPosition(v)
      minY = Math.min(minY, v.y)
      maxY = Math.max(maxY, v.y)
    })
    const bodyHeight = (maxY - minY) * 1.1
    model.scale.multiplyScalar(this.height / bodyHeight)

    // root is what we move/rotate; model keeps its own scale
    this.root = new THREE.Group()
    this.root.add(model)
    this.root.position.copy(state.character.target)

    // Animations: one mixer per instance
    this.mixer = new THREE.AnimationMixer(model)
    this.actions = {}
    for (const clip of gltf.animations) {
      const name = clip.name.split('|').pop() // 'CharacterArmature|Walk' -> 'Walk'
      this.actions[name] = this.mixer.clipAction(clip)
    }

    // one-shot animations
    this.actions.HitReact?.setLoop(THREE.LoopOnce, 1)
    if (this.actions.Death) {
      this.actions.Death.setLoop(THREE.LoopOnce, 1)
      this.actions.Death.clampWhenFinished = true // stay on the last frame (lying down)
    }
    this.mixer.addEventListener('finished', (e) => {
      if (e.action === this.actions.HitReact) this.hitReacting = false
    })

    this.current = null
    this.moving = false // true while walking/running to the target
    this.dead = false
    this.hitReacting = false
    this.lastHealth = state.character.health
    this.play('Idle')
  }

  play(name, fade = 0.25, force = false) {
    const next = this.actions[name]
    if (!next || (next === this.current && !force)) return

    next.reset().fadeIn(fade).play()
    this.current?.fadeOut(fade)
    this.current = next
  }

  /** React to health changes: hit reaction, death, revive. */
  updateHealth() {
    const health = this.state.character.health

    if (health < this.lastHealth) {
      if (health <= 0) this.die()
      else this.hit()
    } else if (health > this.lastHealth && this.dead) {
      this.revive()
    }
    this.lastHealth = health
  }

  hit() {
    this.hitReacting = true
    this.play('HitReact', 0.1, true) // force: restart if already reacting
  }

  die() {
    this.dead = true
    this.hitReacting = false
    this.play('Death', 0.1)
  }

  revive() {
    this.dead = false
    this.hitReacting = false
    this.state.character.target.copy(this.root.position) // don't walk off to an old target
    this.play('Idle', 0.3)
  }

  update(delta) {
    this.updateHealth()

    // dead or flinching: stay in place, only advance the animation
    if (this.dead || this.hitReacting) {
      this.moving = false
      this.mixer.update(delta)
      return
    }

    const pos = this.root.position
    const target = this.state.character.target

    const dx = target.x - pos.x
    const dz = target.z - pos.z
    const dist = Math.hypot(dx, dz)

    if (dist > this.stopDistance) {
      // turn toward the target (glTF forward is +Z), shortest way round
      const wanted = Math.atan2(dx, dz)
      let diff = wanted - this.root.rotation.y
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      this.root.rotation.y += diff * (1 - Math.exp(-this.turnSpeed * delta))

      // move, never overshoot
      const run = this.state.character.run
      const step = Math.min((run ? this.runSpeed : this.walkSpeed) * delta, dist)
      const fromX = pos.x
      const fromZ = pos.z
      pos.x += (dx / dist) * step
      pos.z += (dz / dist) * step
      this.resolveCollisions()

      // blocked head-on (almost no progress): give up so we don't run in place forever
      const moved = Math.hypot(pos.x - fromX, pos.z - fromZ)
      this.stuckTime = moved < step * 0.2 ? this.stuckTime + delta : 0
      if (this.stuckTime > this.stuckLimit) {
        this.stuckTime = 0
        target.set(pos.x, 0, pos.z)
      }

      this.moving = true
      this.play(run ? 'Run' : 'Walk')
    } else {
      this.moving = false
      this.play('Idle')
    }

    this.mixer.update(delta)
  }

  /** Push the character out of any obstacle circle it overlaps (so it slides around them). */
  resolveCollisions() {
    const pos = this.root.position
    for (const o of this.obstacles) {
      let dx = pos.x - o.x
      let dz = pos.z - o.z
      let d = Math.hypot(dx, dz)
      const min = o.radius + this.collisionRadius
      if (d >= min) continue

      if (d === 0) { dx = 1; dz = 0; d = 1 }
      pos.x = o.x + (dx / d) * min
      pos.z = o.z + (dz / d) * min
    }
  }

  destroy() {
    this.mixer.stopAllAction()
    this.mixer.uncacheRoot(this.mixer.getRoot())
  }
}
