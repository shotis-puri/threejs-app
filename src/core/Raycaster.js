import * as THREE from 'three'

/** Casts a ray from the camera through the pointer position. */
export default class Raycaster {
  constructor(app) {
    this.app = app
    this.instance = new THREE.Raycaster()
  }

  /** All hits under the pointer, nearest first. */
  intersect(objects, recursive = true) {
    this.instance.setFromCamera(this.app.input.pointer, this.app.camera.instance)
    return this.instance.intersectObjects(objects, recursive)
  }

  /** Nearest hit under the pointer, or null. */
  first(objects, recursive = true) {
    return this.intersect(objects, recursive)[0] ?? null
  }
}
