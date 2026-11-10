import * as THREE from 'three'
import Character from '../objects/Character.js'
import ClickMarker from '../objects/ClickMarker.js'
import Forest from '../objects/Forest.js'
import Pickups from '../objects/Pickups.js'
import FootstepAudio from '../systems/FootstepAudio.js'

/** Everything that lives in the scene. Add new objects/systems here. */
export default class World {
  constructor(app) {
    this.app = app
    const scene = app.scene

    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const sun = new THREE.DirectionalLight(0xffffff, 2)
    sun.position.set(10, 16, 6) // far enough to see the whole 20x20 ground
    sun.castShadow = true
    sun.shadow.mapSize.set(4096, 4096)
    // shadow box must cover the ground: half-size 10 -> corner distance ~14.2
    sun.shadow.camera.left = -15
    sun.shadow.camera.right = 15
    sun.shadow.camera.top = 15
    sun.shadow.camera.bottom = -15
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 45
    sun.shadow.bias = -0.0005
    sun.shadow.normalBias = 0.02
    scene.add(sun)
    scene.add(new THREE.GridHelper(20, 20))

    // Clickable ground (slightly below the grid to avoid z-fighting)
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({
        color: 0x1e3f20, // Глубокий темно-зеленый цвет (Травяной/Лесной)
        roughness: 0.6, // Умеренная шероховатость (чтобы трава не блестела как пластик)
        metalness: 0.1, // Практически полное отсутствие металлического блеска
      }),
    );
    this.ground.rotation.x = -Math.PI / 2
    this.ground.position.y = -0.001
    this.ground.receiveShadow = true
    scene.add(this.ground)

    // Random trees that never overlap each other or the spawn point
    this.forest = new Forest(app.assets, { size: 20, count: 10 })
    scene.add(this.forest.root)

    this.character = new Character(app.assets.get('sam'), app.state)
    scene.add(this.character.root)
    this.character.obstacles = this.forest.colliders // trees block the character

    // Items on the map: walk over them to collect
    this.pickups = new Pickups(app.state, {
      size: 20,
      count: 12,
      avoid: this.forest.colliders,
      onCollect: (id, item) => app.backpack.notify(id === 'full' ? 'Backpack is full' : `+1 ${item.icon} ${item.name}`),
    })
    scene.add(this.pickups.root)

    this.marker = new ClickMarker()
    scene.add(this.marker.root)

    this.footsteps = new FootstepAudio(app, this.character)

    app.camera.follow(this.character.root)
  }

  update(delta, elapsed) {
    const { input, raycaster, state } = this.app

    // TEMP test keys: H = take 1 damage, J = heal 1 (remove when real gameplay exists)
    if (input.wasPressed('KeyH')) state.damage(1)
    if (input.wasPressed('KeyJ')) state.heal(1)

    if (input.clicked && !this.character.dead) {
      const hit = raycaster.first([this.ground])
      state.raycaster.hit = !!hit
      if (hit) {
        state.raycaster.point.copy(hit.point)
        state.character.target.set(hit.point.x, 0, hit.point.z)
        state.character.run = input.doubleClicked // single click = walk, double click = run
        this.marker.show(hit.point, state.character.run)
      }
    }

    this.character.update(delta)
    this.pickups.update(delta, elapsed, this.character)
    this.marker.update(delta, this.character.moving)
    this.footsteps.update()
  }
}
