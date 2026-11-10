import ITEMS from '../config/items.js'

/**
 * Backpack HUD: a button (or key B) opens a window with the inventory grid.
 * Reads state.inventory, only redraws when it changed. Esc closes.
 */
export default class Backpack {
  constructor(parent, state, input) {
    this.state = state
    this.input = input
    this.shownVersion = -1
    this.previous = [] // last drawn "id:count" per slot, to animate new items

    // open button
    this.button = document.createElement('button')
    this.button.className = 'backpack-btn'
    this.button.innerHTML = '<span class="bag">🎒</span><span class="key">B</span><span class="badge"></span>'
    this.button.addEventListener('click', () => this.toggle())

    // window
    this.window = document.createElement('div')
    this.window.className = 'backpack-window'
    this.window.hidden = true
    this.window.innerHTML = `
      <div class="backpack-header">
        <span>🎒 Backpack</span>
        <button class="backpack-close" aria-label="Close">✕</button>
      </div>
      <div class="backpack-grid"></div>
      <div class="backpack-footer"></div>`
    this.window.querySelector('.backpack-close').addEventListener('click', () => this.close())
    this.grid = this.window.querySelector('.backpack-grid')
    this.footer = this.window.querySelector('.backpack-footer')

    this.slots = []
    for (let i = 0; i < state.inventory.size; i++) {
      const slot = document.createElement('div')
      slot.className = 'slot'
      this.grid.appendChild(slot)
      this.slots.push(slot)
    }

    // short messages ("+1 Mushroom")
    this.toasts = document.createElement('div')
    this.toasts.className = 'toasts'

    parent.append(this.button, this.window, this.toasts)
    this.render()
  }

  get isOpen() { return !this.window.hidden }
  open() { this.window.hidden = false }
  close() { this.window.hidden = true }
  toggle() { this.isOpen ? this.close() : this.open() }

  /** Pop-up message at the bottom of the screen. */
  notify(text) {
    const toast = document.createElement('div')
    toast.className = 'toast'
    toast.textContent = text
    toast.addEventListener('animationend', () => toast.remove())
    this.toasts.appendChild(toast)
  }

  update() {
    if (this.input.wasPressed('KeyB')) this.toggle()
    if (this.input.wasPressed('Escape')) this.close()
    if (this.state.inventory.version !== this.shownVersion) this.render()
  }

  render() {
    const inv = this.state.inventory
    let used = 0

    inv.slots.forEach((entry, i) => {
      const slot = this.slots[i]
      const signature = entry ? `${entry.id}:${entry.count}` : ''

      if (signature !== this.previous[i]) {
        slot.textContent = ''
        slot.classList.toggle('filled', !!entry)
        slot.title = ''

        if (entry) {
          const def = ITEMS[entry.id]
          slot.title = `${def.name} x${entry.count}`
          slot.innerHTML = `<span class="icon">${def.icon}</span>` + (entry.count > 1 ? `<span class="count">${entry.count}</span>` : '')
          slot.classList.remove('pop')
          void slot.offsetWidth // restart animation
          slot.classList.add('pop')
        }
        this.previous[i] = signature
      }
      if (entry) used++
    })

    this.footer.textContent = `${used} / ${inv.size} slots`
    this.button.querySelector('.badge').textContent = used || ''
    this.shownVersion = inv.version
  }

  destroy() {
    this.button.remove()
    this.window.remove()
    this.toasts.remove()
  }
}
