import * as THREE from 'three'

/** Plays a looping walk/run sound while the character moves, silence when it stops. */
export default class FootstepAudio {
  constructor(app, character) {
    this.app = app
    this.character = character

    this.listener = new THREE.AudioListener()
    app.camera.instance.add(this.listener)

    this.sounds = {
      walk: this.createSound('walk', 0.6),
      run: this.createSound('run', 0.7),
    }
    this.current = null
  }

  createSound(assetName, volume) {
    const sound = new THREE.Audio(this.listener)
    sound.setBuffer(this.app.assets.get(assetName))
    sound.setLoop(true)
    sound.setVolume(volume)
    return sound
  }

  update() {
    // Browsers keep audio suspended until a user gesture; resume on the first click
    const context = this.listener.context
    if (context.state === 'suspended' && this.app.input.clicked) context.resume()

    let wanted = null
    if (this.character.moving) wanted = this.app.state.character.run ? this.sounds.run : this.sounds.walk

    if (wanted === this.current) return

    this.current?.stop()
    wanted?.play()
    this.current = wanted
  }

  destroy() {
    this.current?.stop()
    this.app.camera.instance.remove(this.listener)
  }
}
