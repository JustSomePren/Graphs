import './style.css'
import scenarios from './data/scenarios.json'
import { gameView, homeView } from './views.js'
import { loadResults } from './storage.js'

const app = document.getElementById('app')

function show(view) {
  app.replaceChildren(view)
  window.scrollTo(0, 0)
}

const home = () => show(homeView(scenarios, open))

// Další scénář: první neodehraný za aktuálním, jinak prostě následující
function nextAfter(s) {
  const results = loadResults()
  const start = scenarios.indexOf(s)
  const ordered = [...scenarios.slice(start + 1), ...scenarios.slice(0, start)]
  return ordered.find((x) => !results[x.id]) ?? ordered[0]
}

function open(s, replace = false) {
  history[replace ? 'replaceState' : 'pushState']({ id: s.id }, '')
  show(gameView(s, { back: () => history.back(), next: () => open(nextAfter(s), true) }))
}

window.addEventListener('popstate', home)
home()
