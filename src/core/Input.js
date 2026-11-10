import * as THREE from 'three'

/**
 * Collects keyboard / pointer state.
 * Poll it from update(): input.isDown('KeyW'), input.wasPressed('Space'), input.pointer ...
 * Call endFrame() once per frame (App does this) to reset per-frame state.
 */
export default class Input {
  constructor(target = window) {
    this.target = target

    this.keysDown = new Set()
    this.keysPressed = new Set() // went down this frame
    this.keysReleased = new Set() // went up this frame

    this.pointer = new THREE.Vector2() // normalized device coords (-1..1)
    this.pointerDelta = new THREE.Vector2() // pixels moved this frame
    this.buttons = 0
    this.wheelDelta = 0
    this.clicked = false // true for one frame after a click (not a drag)
    this.doubleClicked = false // true for one frame on the 2nd click of a double click
    this.doubleClickTime = 300 // ms between clicks
    this._lastClickTime = -Infinity
    this._lastClickPos = new THREE.Vector2()
    this._downPos = new THREE.Vector2()

    this._onKeyDown = (e) => {
      if (e.repeat) return
      this.keysDown.add(e.code)
      this.keysPressed.add(e.code)
    }
    this._onKeyUp = (e) => {
      this.keysDown.delete(e.code)
      this.keysReleased.add(e.code)
    }
    this._updatePointer = (e) => {
      this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
    }
    this._onPointerMove = (e) => {
      this._updatePointer(e)
      this.pointerDelta.x += e.movementX
      this.pointerDelta.y += e.movementY
    }
    this._onPointerDown = (e) => {
      this._updatePointer(e)
      this._downPos.set(e.clientX, e.clientY)
      this.buttons = e.buttons
    }
    this._onPointerUp = (e) => {
      this._updatePointer(e)
      this.buttons = e.buttons
      const upPos = new THREE.Vector2(e.clientX, e.clientY)
      if (e.button === 0 && this._downPos.distanceTo(upPos) < 5) {
        this.clicked = true

        const now = performance.now()
        if (now - this._lastClickTime < this.doubleClickTime && this._lastClickPos.distanceTo(upPos) < 20) {
          this.doubleClicked = true
          this._lastClickTime = -Infinity // a 3rd click starts a new sequence
        } else {
          this._lastClickTime = now
          this._lastClickPos.copy(upPos)
        }
      }
    }
    this._onWheel = (e) => { this.wheelDelta += e.deltaY }
    this._onBlur = () => {
      this.keysDown.clear()
      this.buttons = 0
    }

    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
    window.addEventListener('blur', this._onBlur)
    target.addEventListener('pointermove', this._onPointerMove)
    target.addEventListener('pointerdown', this._onPointerDown)
    target.addEventListener('pointerup', this._onPointerUp)
    target.addEventListener('wheel', this._onWheel, { passive: true })
  }

  isDown(code) { return this.keysDown.has(code) }
  wasPressed(code) { return this.keysPressed.has(code) }
  wasReleased(code) { return this.keysReleased.has(code) }

  endFrame() {
    this.keysPressed.clear()
    this.keysReleased.clear()
    this.pointerDelta.set(0, 0)
    this.wheelDelta = 0
    this.clicked = false
    this.doubleClicked = false
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
    window.removeEventListener('blur', this._onBlur)
    this.target.removeEventListener('pointermove', this._onPointerMove)
    this.target.removeEventListener('pointerdown', this._onPointerDown)
    this.target.removeEventListener('pointerup', this._onPointerUp)
    this.target.removeEventListener('wheel', this._onWheel)
  }
}
