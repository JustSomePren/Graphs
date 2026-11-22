import './style.css'
import scenarios from './data/scenarios.json'
import { gameView, homeView } from './views.js'

const app = document.getElementById('app')

function show(view) {
  app.replaceChildren(view)
  window.scrollTo(0, 0)
}

const home = () => show(homeView(scenarios, open))
const open = (s) => {
  history.pushState({ id: s.id }, '')
  show(gameView(s, () => history.back()))
}

window.addEventListener('popstate', home)
home()
