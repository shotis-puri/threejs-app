import './style.css'
import App from './core/App.js'

const app = new App(document.querySelector('#scene'))
app.start()

// Handy for debugging in the console
window.app = app
