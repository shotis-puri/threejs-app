import * as THREE from 'three'
import Camera from './Camera.js'
import Input from './Input.js'
import Raycaster from './Raycaster.js'
import State from './State.js'
import HealthBar from '../ui/HealthBar.js'
import Backpack from '../ui/Backpack.js'
import AssetManager from './AssetManager.js'
import manifest from '../config/assets.js'
import World from '../world/World.js'

/** Main class: owns renderer, scene, camera, input, world and the frame loop. */
export default class App {
  constructor(canvas) {
    this.canvas = canvas
    this.sizes = { width: window.innerWidth, height: window.innerHeight, pixelRatio: 1 }

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x111111)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.camera = new Camera(this)
    this.input = new Input(canvas)
    this.state = new State()
    this.raycaster = new Raycaster(this)
    this.healthBar = new HealthBar(document.querySelector('#ui'), this.state)
    this.backpack = new Backpack(document.querySelector('#ui'), this.state, this.input)
    this.assets = new AssetManager()
    this.world = null

    this.timer = new THREE.Timer()
    this._onResize = () => this.resize()
    window.addEventListener('resize', this._onResize)
    this.resize()
  }

  /** Load assets first, then build the world and start the loop. */
  async start() {
    await this.assets.load(manifest)
    this.world = new World(this)
    this.renderer.setAnimationLoop((time) => this.update(time))
  }

  stop() {
    this.renderer.setAnimationLoop(null)
  }

  resize() {
    this.sizes.width = window.innerWidth
    this.sizes.height = window.innerHeight
    this.sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

    this.renderer.setSize(this.sizes.width, this.sizes.height)
    this.renderer.setPixelRatio(this.sizes.pixelRatio)
    this.camera.resize()
  }

  update(time) {
    this.timer.update(time)
    const delta = this.timer.getDelta()
    const elapsed = this.timer.getElapsed()

    this.camera.update(delta)
    this.world?.update(delta, elapsed)
    this.healthBar.update()
    this.backpack.update()
    this.renderer.render(this.scene, this.camera.instance)

    this.input.endFrame()
  }

  destroy() {
    this.stop()
    window.removeEventListener('resize', this._onResize)
    this.input.destroy()
    this.healthBar.destroy()
    this.backpack.destroy()
    this.camera.destroy()
    this.assets.dispose()
    this.renderer.dispose()
  }
}
