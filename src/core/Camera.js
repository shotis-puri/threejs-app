import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export default class Camera {
  constructor(app) {
    this.app = app

    this.instance = new THREE.PerspectiveCamera(60, app.sizes.width / app.sizes.height, 0.1, 100)
    this.instance.position.set(2, 2, 4)

    this.controls = new OrbitControls(this.instance, app.canvas)
    this.controls.enableDamping = true

    // Follow mode: the orbit target tracks an object, user can still orbit/zoom
    this.followObject = null
    this.followOffset = new THREE.Vector3(0, 0.5, 0) // aim at the chest, not the feet
    this.followSpeed = 5 // higher = tighter follow
    this._goal = new THREE.Vector3()
    this._shift = new THREE.Vector3()
  }

  /** Follow an Object3D (pass null to stop). Snaps to it immediately. */
  follow(object) {
    this.followObject = object
    if (!object) return

    this._goal.copy(object.position).add(this.followOffset)
    this._shift.subVectors(this._goal, this.controls.target)
    this.instance.position.add(this._shift)
    this.controls.target.copy(this._goal)
  }

  resize() {
    this.instance.aspect = this.app.sizes.width / this.app.sizes.height
    this.instance.updateProjectionMatrix()
  }

  update(delta) {
    if (this.followObject) {
      this._goal.copy(this.followObject.position).add(this.followOffset)

      // move target toward the goal, and move the camera by the same amount
      // so the orbit angle and distance the user picked are preserved
      const t = 1 - Math.exp(-this.followSpeed * delta)
      this._shift.subVectors(this._goal, this.controls.target).multiplyScalar(t)
      this.controls.target.add(this._shift)
      this.instance.position.add(this._shift)
    }

    this.controls.update()
  }

  destroy() {
    this.controls.dispose()
  }
}
