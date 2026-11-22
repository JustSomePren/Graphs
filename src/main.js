import './style.css'
import stories from './data/scenarios.json'
import { gameView, homeView, settingsView, statsView } from './views.js'
import { loadResults } from './storage.js'
import { applyTheme, setupStatusBar } from './native.js'
import { dailyPick } from './extras.js'

// Automatické scénáře jsou rozdělené po odvětvích a načítají se, až jsou potřeba
const parts = import.meta.glob('./data/auto/part-*.json', { import: 'default' })
const loadIndex = () => import('./data/auto/index.json').then((m) => m.default)
const loaded = {}

async function loadScenario(entry) {
  const key = `./data/auto/${entry.part}.json`
  loaded[key] ??= await parts[key]()
  return loaded[key].find((s) => s.id === entry.id)
}

const app = document.getElementById('app')
let homeMode = 0

function show(view) {
  app.replaceChildren(view)
  window.scrollTo(0, 0)
}

const screens = {
  home: () =>
    homeView(stories, {
      open: (s) => ((homeMode = 0), open(s)),
      quick,
      daily: { info: loadIndex().then((index) => dailyPick(index)), start: startDaily },
      stats: () => go('stats'),
      settings: () => go('settings'),
      mode: homeMode,
    }),
  stats: () => statsView(() => history.back()),
  settings: () => settingsView(() => history.back()),
}

function go(name) {
  history.pushState({ screen: name }, '')
  show(screens[name]())
}

// Další příběh: první neodehraný za aktuálním, jinak prostě následující
function nextStory(s) {
  const results = loadResults()
  const start = stories.indexOf(s)
  const ordered = [...stories.slice(start + 1), ...stories.slice(0, start)]
  return ordered.find((x) => !results[x.id]) ?? ordered[0]
}

// Rychlá hra: náhodný anonymní scénář, přednostně dosud nehraný
async function quick(horizon, replace = false) {
  homeMode = 1
  const results = loadResults()
  const pool = (await loadIndex()).filter((e) => !horizon || e.horizon === horizon)
  const fresh = pool.filter((e) => !results[e.id])
  const list = fresh.length ? fresh : pool
  const s = await loadScenario(list[Math.floor(Math.random() * list.length)])
  open(s, replace, () => quick(horizon, true))
}

async function startDaily() {
  const s = await loadScenario(dailyPick(await loadIndex()))
  open({ ...s, daily: true }, false, () => quick(null, true))
}

function open(s, replace = false, next = () => open(nextStory(s), true)) {
  history[replace ? 'replaceState' : 'pushState']({ id: s.id }, '')
  show(gameView(s, { back: () => history.back(), next }))
}

window.addEventListener('popstate', (e) => show(screens[e.state?.screen] ? screens[e.state.screen]() : screens.home()))
applyTheme()
setupStatusBar()
show(screens.home())
