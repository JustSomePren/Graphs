import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
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

// Události: jeden soubor, seskupený podle události
let eventScenarios
const loadEvents = async () => (eventScenarios ??= (await import('./data/events.json')).default)
async function eventGroups() {
  const list = await loadEvents()
  const groups = new Map()
  for (const s of list) {
    if (!groups.has(s.event)) groups.set(s.event, { id: s.event, title: s.title, categoryLabel: s.categoryLabel, date: s.eventDate ?? s.series.find(([d]) => d.slice(0, 10) > s.decisionDate)[0].slice(0, 10), tickers: [], items: [] })
    const g = groups.get(s.event)
    if (!g.tickers.includes(s.ticker)) g.tickers.push(s.ticker)
    g.items.push(s)
  }
  return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date))
}

async function startEvent(id, replace = false) {
  homeMode = 1
  const list = await loadEvents()
  const s = list.find((x) => x.id === id)
  // Další: náhodný jiný, dosud nehraný scénář z událostí
  const next = () => {
    const results = loadResults()
    const fresh = list.filter((x) => !results[x.id] && x.id !== id)
    const pick = (fresh.length ? fresh : list)[Math.floor(Math.random() * (fresh.length || list.length))]
    startEvent(pick.id, true)
  }
  open(s, replace, next)
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
      events: { list: eventGroups(), start: (id) => startEvent(id) },
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
  homeMode = 2
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
