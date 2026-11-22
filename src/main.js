import './style.css'
import stories from './data/scenarios.json'
import { gameView, homeView } from './views.js'
import { loadResults } from './storage.js'
import { setupStatusBar } from './native.js'

const app = document.getElementById('app')
let homeMode = 0
let autoScenarios

function show(view) {
  app.replaceChildren(view)
  window.scrollTo(0, 0)
}

const home = () => show(homeView(stories, { open: (s) => ((homeMode = 0), open(s)), quick, mode: homeMode }))

// Další příběh: první neodehraný za aktuálním, jinak prostě následující
function nextStory(s) {
  const results = loadResults()
  const start = stories.indexOf(s)
  const ordered = [...stories.slice(start + 1), ...stories.slice(0, start)]
  return ordered.find((x) => !results[x.id]) ?? ordered[0]
}

// Rychlá hra: náhodný anonymní scénář, přednostně dosud nehraný
async function randomAuto(horizon) {
  autoScenarios ??= (await import('./data/auto.json')).default
  const results = loadResults()
  const pool = autoScenarios.filter((s) => !horizon || s.horizon === horizon)
  const fresh = pool.filter((s) => !results[s.id])
  const list = fresh.length ? fresh : pool
  return list[Math.floor(Math.random() * list.length)]
}

async function quick(horizon, replace = false) {
  homeMode = 1
  open(await randomAuto(horizon), replace, () => quick(horizon, true))
}

function open(s, replace = false, next = () => open(nextStory(s), true)) {
  history[replace ? 'replaceState' : 'pushState']({ id: s.id }, '')
  show(gameView(s, { back: () => history.back(), next }))
}

window.addEventListener('popstate', home)
setupStatusBar()
home()
