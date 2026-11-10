import * as THREE from 'three'
import ITEMS from '../config/items.js'

/** Shared app state. Systems write to it, objects read from it. */
export default class State {
  constructor() {
    this.raycaster = {
      hit: false, // did the last click hit the ground?
      point: new THREE.Vector3(), // world coordinates of the last ground hit
    }

    this.character = {
      target: new THREE.Vector3(0, 0, 0), // where the character walks to
      run: false, // true = run to the target (double click), false = walk
      health: 5, // current hearts
      maxHealth: 5,
    }

    this.inventory = {
      size: 20, // slots
      slots: Array.from({ length: 20 }, () => null), // null or { id, count }
      version: 0, // bumped on every change, the UI redraws when it differs
    }
  }

  /**
   * Put items in the backpack: fills existing stacks first, then empty slots.
   * Returns how many did NOT fit (0 = everything added).
   */
  addItem(id, count = 1) {
    const max = ITEMS[id]?.maxStack ?? 99
    const slots = this.inventory.slots
    let left = count

    for (const slot of slots) {
      if (left === 0) break
      if (slot?.id !== id || slot.count >= max) continue
      const add = Math.min(max - slot.count, left)
      slot.count += add
      left -= add
    }
    for (let i = 0; i < slots.length && left > 0; i++) {
      if (slots[i]) continue
      const add = Math.min(max, left)
      slots[i] = { id, count: add }
      left -= add
    }

    if (left !== count) this.inventory.version++
    return left
  }

  /** Lower character health, never below 0. Returns the new value. */
  damage(amount = 1) {
    const c = this.character
    c.health = Math.max(0, c.health - amount)
    return c.health
  }

  /** Raise character health, never above maxHealth. Returns the new value. */
  heal(amount = 1) {
    const c = this.character
    c.health = Math.min(c.maxHealth, c.health + amount)
    return c.health
  }
}
