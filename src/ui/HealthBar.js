const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'

/** Row of hearts (HTML overlay) that mirrors state.character.health. */
export default class HealthBar {
  constructor(parent, state) {
    this.state = state
    this.shown = null // last health value drawn

    this.root = document.createElement('div')
    this.root.className = 'health'
    parent.appendChild(this.root)

    this.hearts = []
    for (let i = 0; i < state.character.maxHealth; i++) {
      const heart = document.createElement('div')
      heart.className = 'heart'
      heart.innerHTML = `<svg viewBox="0 0 24 24"><path d="${HEART_PATH}"/></svg>`
      this.root.appendChild(heart)
      this.hearts.push(heart)
    }
    this.update()
  }

  /** Cheap: only touches the DOM when health changed. */
  update() {
    const health = this.state.character.health
    if (health === this.shown) return

    const lost = this.shown !== null && health < this.shown
    this.hearts.forEach((heart, i) => {
      const full = i < health
      // the heart that just emptied plays a small shake
      if (lost && !full && i < this.shown) {
        heart.classList.remove('hit')
        void heart.offsetWidth // restart the CSS animation
        heart.classList.add('hit')
      }
      heart.classList.toggle('empty', !full)
    })

    this.root.setAttribute('aria-label', `Health ${health} of ${this.state.character.maxHealth}`)
    this.shown = health
  }

  destroy() {
    this.root.remove()
  }
}
