import { DAY, el, fmtBig, fmtDate, fmtMonth, fmtNum, fmtPct, fmtPp, fmtPrice, fmtX, plural, toTs } from './format.js'
import { buildModel } from './model.js'
import { createChart, ZOOMS } from './chart.js'
import { scorePrediction } from './score.js'
import { derived, signals } from './signals.js'
import { dailyDone, earnedBadges, getFlag, loadHistory, loadResults, loadSettings, rank, resetProgress, saveResult, saveSettings, setFlag, streak, BADGES } from './storage.js'
import { applyTheme, enterLandscape, exitLandscape, share, success, tap } from './native.js'
import { playerStats, shareText } from './extras.js'
import { icon } from './icons.js'

const HORIZONS = [
  { label: 'Vše', test: () => true },
  { label: 'Krátké', test: (days) => days <= 45 },
  { label: 'Střední', test: (days) => days > 45 && days <= 120 },
  { label: 'Dlouhé', test: (days) => days > 120 },
]
const QUICK_HORIZONS = ['Vše', 'týden', 'měsíc', '3 měsíce', '6 měsíců', 'rok', '5 let']

const horizonDays = (s) => (toTs(s.endDate) - toTs(s.decisionDate)) / DAY
const tier = (score) => (score >= 80 ? 'great' : score >= 55 ? 'ok' : 'low')

// Obtížnost = jak velký pohyb je při dané volatilitě a horizontu běžný
export function difficulty(s) {
  const expectedMove = (s.metrics.volatility ?? 0.4) * Math.sqrt(horizonDays(s) / 365)
  return expectedMove < 0.1 ? 'lehká' : expectedMove < 0.22 ? 'střední' : 'těžká'
}

const iconButton = (name, label, onclick, cls = '') => el('button', { class: `icon-btn ${cls}`, 'aria-label': label, title: label, onclick }, icon(name))

// --- domovská obrazovka ---

export function homeView(stories, { open, quick, daily, events, stats, settings, mode = 0 }) {
  const results = loadResults()
  const body = el('div', { class: 'tab-body' })
  const panels = [() => storiesPanel(stories, results, open), () => eventsPanel(events, results), () => quickPanel(quick)]
  const showMode = (i) => body.replaceChildren(panels[i]())
  const modes = segmented(['Příběhy', 'Události', 'Rychlá hra'], mode, showMode, 'tabs main-tabs')
  showMode(mode)

  return el(
    'main',
    { class: 'screen' },
    el(
      'header',
      { class: 'masthead' },
      el('div', { class: 'wordmark' }, el('b', {}, 'KAM TO PŮJDE'), el('small', {}, 'trénink odhadu vývoje akcií')),
      iconButton('stats', 'Statistiky', stats),
      iconButton('gear', 'Nastavení', settings),
    ),
    getFlag('intro') ? null : introCard(),
    dailyRow(daily),
    profileStrip(),
    modes,
    body,
    el('p', { class: 'foot' }, 'Data: SEC EDGAR, FRED, denní a hodinové ceny. Nejde o investiční doporučení.'),
  )
}

// Denní výzva – info o dnešním scénáři se načte až s indexem automatických scénářů
function dailyRow(daily) {
  const done = dailyDone()
  const info = el('small', {}, 'Načítám…')
  const row = el(
    'button',
    { class: 'daily' + (done ? ' done' : ''), onclick: () => daily.start() },
    icon(done ? 'check' : 'calendar'),
    el('span', { class: 'grow' }, el('b', {}, done ? 'Denní výzva splněna' : 'Denní výzva'), info),
    icon('next'),
  )
  daily.info.then((pick) => (info.textContent = `Anonymní firma · ${pick.sector} · ${pick.horizon}${done ? ' · zítra nová' : ''}`)).catch(() => row.remove())
  return row
}

function introCard() {
  const card = el(
    'section',
    { class: 'notice intro' },
    el('b', {}, 'Jak hrát'),
    el(
      'ol',
      {},
      el('li', {}, 'Vyber příběh, událost, nebo rychlou hru s anonymní firmou.'),
      el('li', {}, 'Prostuduj graf a data. Pak přepni na Malovat a nakresli, kam půjde cena.'),
      el('li', {}, 'Nejvíc se počítá konečná cena, bonus dostaneš za trefený tvar.'),
    ),
    el('button', { class: 'link', onclick: () => (setFlag('intro'), card.remove()) }, 'Rozumím'),
  )
  return card
}

function profileStrip() {
  const history = loadHistory()
  const r = rank(history)
  return el(
    'section',
    { class: 'strip' },
    el('div', {}, el('small', {}, 'Hodnost'), el('b', {}, r.label)),
    el('div', {}, el('small', {}, 'Průměr'), el('b', { class: 'num' }, r.avg ?? '–')),
    el('div', {}, el('small', {}, 'Série dní'), el('b', { class: 'num' }, streak(history))),
    el('div', {}, el('small', {}, 'Odznaky'), el('b', { class: 'num' }, `${earnedBadges().length}/${BADGES.length}`)),
  )
}

function storiesPanel(stories, results, open) {
  const list = el('div', { class: 'watchlist' })
  const render = (filter) => list.replaceChildren(...stories.filter((s) => filter.test(horizonDays(s))).map((s) => storyRow(s, results[s.id], open)))
  render(HORIZONS[0])
  return el('div', {}, segmented(HORIZONS.map((h) => h.label), 0, (i) => render(HORIZONS[i]), 'chips'), list)
}

function storyRow(s, result, open) {
  return el(
    'button',
    { class: 'wl-row', onclick: () => open(s) },
    el('span', { class: 'tk' }, s.ticker),
    el('span', { class: 'wl-main' }, el('b', {}, s.title), el('small', {}, `${fmtDate(s.decisionDate)} · ${s.horizon} · ${difficulty(s)}`)),
    sparkline(s),
    el('span', { class: `wl-score ${result ? tier(result.best) : ''}` }, result ? String(result.best) : '–'),
  )
}

// Události: rozbalíš kartu a vybereš firmu a horizont
function eventsPanel(events, results) {
  const list = el('div', { class: 'events' }, el('p', { class: 'muted' }, 'Načítám události…'))
  events.list.then((groups) => {
    const categories = [...new Set(groups.map((g) => g.categoryLabel))]
    list.replaceChildren(
      el('p', { class: 'muted small' }, 'Odhadni, jak konkrétní událost pohne akciemi vybraných firem. Situaci popisujeme jen tak, jak byla známá v daný moment.'),
      ...categories.flatMap((cat) => [el('h4', {}, cat), ...groups.filter((g) => g.categoryLabel === cat).map((g) => eventCard(g, results, events.start))]),
    )
  })
  return list
}

function eventCard(g, results, start) {
  let ticker = g.tickers[0]
  let horizon = null
  const body = el('div', { class: 'ev-body', hidden: true })
  const played = g.items.filter((s) => results[s.id]).length
  const renderBody = () => {
    const horizons = g.items.filter((s) => s.ticker === ticker).map((s) => s.horizon)
    if (!horizons.includes(horizon)) horizon = horizons[0]
    const chosen = g.items.find((s) => s.ticker === ticker && s.horizon === horizon)
    body.replaceChildren(
      el('small', {}, 'Firma'),
      segmented(g.tickers, g.tickers.indexOf(ticker), (i) => ((ticker = g.tickers[i]), renderBody()), 'chips'),
      el('small', {}, 'Horizont'),
      segmented(horizons, horizons.indexOf(horizon), (i) => ((horizon = horizons[i]), renderBody()), 'chips'),
      el('button', { class: 'primary', onclick: () => start(chosen.id) }, `Hrát: ${ticker} · ${horizon}${results[chosen.id] ? ` (nejlépe ${results[chosen.id].best})` : ''}`),
    )
  }
  renderBody()
  const head = el(
    'button',
    { class: 'ev-head', 'aria-expanded': 'false', onclick: () => {
      body.hidden = !body.hidden
      head.setAttribute('aria-expanded', String(!body.hidden))
    } },
    el('span', { class: 'ev-date num' }, fmtDate(g.date)),
    el('span', { class: 'wl-main' }, el('b', {}, g.title), el('small', {}, `${g.tickers.join(' · ')}${played ? ` · odehráno ${played}/${g.items.length}` : ''}`)),
    icon('next'),
  )
  return el('section', { class: 'ev-card' }, head, body)
}

function quickPanel(quick) {
  const history = loadHistory().filter((h) => h.auto)
  const avg = history.length ? Math.round(history.reduce((s, h) => s + h.score, 0) / history.length) : '–'
  let horizon = null
  return el(
    'section',
    { class: 'quick' },
    el('p', {}, 'Náhodně vybraná americká firma v den zveřejnění výsledků. Nevíš, kdo to je – máš jen čísla, graf a výňatky z tiskové zprávy. Jméno se dozvíš po vyhodnocení.'),
    el('div', { class: 'strip' }, el('div', {}, el('small', {}, 'Odehráno'), el('b', { class: 'num' }, history.length)), el('div', {}, el('small', {}, 'Průměr'), el('b', { class: 'num' }, avg))),
    el('small', {}, 'Horizont'),
    segmented(QUICK_HORIZONS, 0, (i) => (horizon = i ? QUICK_HORIZONS[i] : null), 'chips'),
    el('button', { class: 'primary', onclick: () => quick(horizon) }, icon('shuffle'), 'Hrát náhodnou firmu'),
  )
}

// Náhled historie bez budoucnosti
function sparkline(s) {
  const history = s.series.filter(([d]) => d.slice(0, 10) <= s.decisionDate).map(([, p]) => Math.log(p))
  const step = Math.max(1, Math.floor(history.length / 60))
  const pts = history.filter((_, i) => i % step === 0)
  const lo = Math.min(...pts)
  const hi = Math.max(...pts)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${((i / (pts.length - 1)) * 100).toFixed(1)},${(30 - ((p - lo) / (hi - lo || 1)) * 28).toFixed(1)}`).join('')
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 100 32')
  svg.setAttribute('preserveAspectRatio', 'none')
  svg.setAttribute('class', 'spark')
  svg.setAttribute('aria-hidden', 'true')
  svg.innerHTML = `<path d="${d}" fill="none" vector-effect="non-scaling-stroke"/>`
  return svg
}

// --- hra ---

const MODES = ['view', 'finger', 'points']

export function gameView(s, { back, next }) {
  const model = buildModel(s)
  const state = { revealed: false }
  const name = s.auto ? `Anonymní firma · ${s.sector}` : `${s.name} (${s.ticker})`
  const canvas = el('canvas', { class: 'chart', role: 'img', 'aria-label': chartDescription(s, model) })
  const action = el('button', { class: 'primary', disabled: true })
  const resultBox = el('div', { 'aria-live': 'polite' })
  let chart
  let zoomIndex = 0

  const refresh = () => {
    action.disabled = !chart.complete
    action.textContent = chart.complete ? 'Vyhodnotit' : chart.points.length ? 'Dokresli až ke konci' : 'Přepni na Malovat a nakresli odhad'
  }

  const zoomButton = el('button', { class: 'icon-btn wide', 'aria-label': 'Rozsah osy', title: 'Rozsah osy', onclick: () => cycleZoom() })
  const showZoom = () => zoomButton.replaceChildren(icon('zoom'), el('span', { class: 'num' }, `×${ZOOMS[zoomIndex].toLocaleString('cs-CZ')}`))
  const cycleZoom = () => {
    zoomIndex = (zoomIndex + 1) % ZOOMS.length
    chart.setZoom(ZOOMS[zoomIndex])
    showZoom()
  }

  const extra = derived(s)
  const bandButton = iconButton('band', 'Pásmo běžného pohybu', () => toggleBand())
  bandButton.setAttribute('aria-pressed', 'false')
  const toggleBand = (on = bandButton.getAttribute('aria-pressed') !== 'true') => {
    bandButton.setAttribute('aria-pressed', String(on))
    bandButton.classList.toggle('active', on)
    chart.setBand(on ? extra.expectedMove : null)
    saveSettings({ band: on })
  }

  const modeSwitch = segmented(
    [
      [icon('hand'), 'Prohlížet'],
      [icon('pencil'), 'Malovat'],
      [icon('dots'), 'Body'],
    ],
    0,
    (i) => chart.setMode(MODES[i]),
    'segmented modes',
  )

  const toolbar = el(
    'div',
    { class: 'toolbar-wrap' },
    el('div', { class: 'toolbar' }, modeSwitch, iconButton('expand', 'Kreslit na celou obrazovku', () => openFullscreen(), 'accent')),
    el(
      'div',
      { class: 'toolbar small' },
      zoomButton,
      extra.expectedMove ? bandButton : null,
      iconButton('reset', 'Celý graf', () => chart.showAll()),
      iconButton('undo', 'Vrátit krok', () => chart.undo()),
      iconButton('close', 'Smazat odhad', () => chart.clear()),
    ),
  )

  // Kreslení na celou obrazovku na šířku: historie přes celý displej, při malování se graf přesune na budoucnost
  async function openFullscreen() {
    const canvasFull = el('canvas', { class: 'chart-full', role: 'img', 'aria-label': chartDescription(s, model) })
    const hint = el('p', { class: 'fs-hint' }, 'Prohlížet: posun prstem · Malovat: kresli do zóny vpravo · dva prsty: posun a přiblížení')
    let full
    const close = async () => {
      chart.setPoints(full.points)
      refresh()
      full.destroy()
      overlay.remove()
      document.body.classList.remove('no-scroll')
      await exitLandscape()
    }
    const current = MODES.indexOf(chart.mode ?? 'view')
    const side = el(
      'div',
      { class: 'fs-side' },
      segmented([icon('hand'), icon('pencil'), icon('dots')], current, (i) => full.setMode(MODES[i]), 'segmented vertical'),
      el('button', { class: 'icon-btn label-btn', 'aria-label': 'Posunout do budoucnosti', onclick: () => full.showFuture() }, 'Budoucnost', icon('next')),
      iconButton('reset', 'Celý graf', () => full.showAll()),
      iconButton('undo', 'Vrátit krok', () => full.undo()),
      iconButton('close', 'Smazat odhad', () => full.clear()),
      el('button', { class: 'primary small', onclick: close }, icon('check'), 'Hotovo'),
    )
    const overlay = el('div', { class: 'fullscreen', role: 'dialog', 'aria-label': 'Kreslení na celou obrazovku' }, el('div', { class: 'fs-chart' }, canvasFull, hint), side)
    document.body.append(overlay)
    document.body.classList.add('no-scroll')
    await enterLandscape(overlay)
    full = createChart(canvasFull, model, { layout: 'full', points: chart.points, onChange: (c) => (tap(), chart.setPoints(c.points), refresh()) })
    full.setZoom(chart.zoom)
    full.setPoints(chart.points)
    full.setLayers(chart.layers)
    full.setMode(MODES[current])
    if (bandButton.getAttribute('aria-pressed') === 'true') full.setBand(extra.expectedMove)
    setTimeout(() => hint.classList.add('fade'), 4000)
  }

  // Vrstvy grafu: srovnání s indexem a klouzavé průměry
  const layerButton = (label, key, title) => {
    const b = el('button', { class: 'layer', 'aria-pressed': 'false', title, onclick: () => {
      const on = b.getAttribute('aria-pressed') !== 'true'
      b.setAttribute('aria-pressed', String(on))
      chart.setLayers({ [key]: on })
    } }, label)
    return b
  }
  const legend = el(
    'div',
    { class: 'legend' },
    el('span', { class: 'key hist' }, 'Cena'),
    el('span', { class: 'key guess' }, 'Odhad'),
    model.intraday ? el('span', { class: 'pill' }, 'hodinová data') : null,
    el(
      'span',
      { class: 'layers' },
      model.market.length ? layerButton('S&P 500', 'market', 'Srovnání s indexem S&P 500') : null,
      layerButton('Ø50', 'ma50', 'Klouzavý průměr 50 dní'),
      layerButton('Ø200', 'ma200', 'Klouzavý průměr 200 dní'),
    ),
  )
  const title = s.daily ? 'Denní výzva' : s.auto ? 'Kam půjde akcie po výsledcích?' : s.title
  const subtitle = el('small', {}, `${name}${s.categoryLabel ? ` · ${s.categoryLabel}` : ''} · odhad do ${fmtDate(model.future.at(-1).date.slice(0, 10))} · ${difficulty(s)}`)

  const screen = el(
    'main',
    { class: 'screen game' },
    el('div', { class: 'topbar' }, iconButton('back', 'Zpět na seznam', back), el('div', { class: 'grow' }, el('strong', {}, title), subtitle)),
    el('section', { class: 'chart-card' }, legend, canvas),
    toolbar,
    firstTip(),
    resultBox,
    analysisTabs(s, model, state),
    el('div', { class: 'action-bar' }, action),
  )

  chart = createChart(canvas, model, { onChange: () => (tap(), refresh()) })
  const setMode = chart.setMode
  chart.setMode = (m) => ((chart.mode = m), setMode(m))
  chart.setMode('view')
  if (loadSettings().band && extra.expectedMove) toggleBand(true)
  zoomIndex = ZOOMS.indexOf(chart.zoom)
  showZoom()
  refresh()

  action.addEventListener('click', () => {
    if (action.dataset.done) return next()
    const score = scorePrediction(model, chart.points)
    const badges = saveResult(s, score)
    toolbar.remove()
    screen.querySelector('.tip')?.remove()
    action.disabled = true
    chart.reveal(() => {
      state.revealed = true
      success()
      if (s.auto) subtitle.textContent = `${s.ticker} · ${s.sector}`
      legend.querySelector('.layers')?.before(el('span', { class: `key real ${score.actualEnd >= 0 ? 'up' : 'down'}` }, 'Realita'))
      resultBox.replaceChildren(resultCard(s, model, score, badges, chart.points))
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' })
      action.dataset.done = '1'
      action.disabled = false
      action.textContent = s.auto ? 'Další firma' : 'Další scénář'
    })
  })

  return screen
}

// Jednorázový tip pro nové hráče
function firstTip() {
  if (getFlag('tip-band')) return null
  const tip = el(
    'p',
    { class: 'notice tip' },
    'Graf posouvej prstem. Pro odhad přepni na Malovat – graf se přesune na budoucnost. Klepnutím na „E“ uvidíš čísla minulých výsledků.',
    el('button', { class: 'link', onclick: () => (setFlag('tip-band'), tip.remove()) }, 'OK'),
  )
  return tip
}

function chartDescription(s, model) {
  const first = model.history[0]
  return `Graf ceny od ${fmtDate(first.date)} (${fmtPrice(first.price)}) do ${fmtDate(s.decisionDate)} (${fmtPrice(model.p0)}). Vpravo je prázdná zóna pro tvůj odhad do ${fmtDate(model.future.at(-1).date.slice(0, 10))}.`
}

function resultCard(s, model, score, badges, points) {
  const flat = scorePrediction(model, [{ t: 1, r: 0 }])
  const flatTotal = flat.total + flat.bonus
  const shareButton = el('button', { class: 'secondary', onclick: async () => {
    const result = await share(shareText(s, model, points, score))
    if (result === 'copied') shareButton.replaceChildren(icon('check'), 'Zkopírováno do schránky')
  } }, icon('share'), 'Sdílet výsledek')
  const verdict = score.total >= 85 ? 'Výborný odhad' : score.total >= 65 ? 'Dobrý odhad' : score.total >= 40 ? 'Napůl trefa' : 'Trh šel jinam'
  return el(
    'section',
    { class: 'result' },
    el(
      'div',
      { class: 'score-head' },
      el('b', { class: `score-big ${tier(score.total)}`, role: 'img', 'aria-label': `Skóre ${score.total + score.bonus}` }, String(score.total + score.bonus)),
      el('div', {}, el('strong', {}, verdict), el('small', { class: 'num' }, `${score.total} + ${score.bonus} bonus za tvar`)),
    ),
    badges.length ? el('div', { class: 'new-badges' }, badges.map((b) => el('span', {}, `Nový odznak: ${b.label}`))) : null,
    el('div', { class: 'compare' }, stat('Tvůj odhad', fmtPct(score.predEnd)), stat('Realita', fmtPct(score.actualEnd)), stat('Rozdíl', `${Math.round(Math.abs(score.gapPoints))} p.b.`)),
    el('div', { class: 'bars' }, score.parts.map((p) => el('div', { class: 'bar' }, el('span', {}, p.label), el('i', { style: `--w:${(p.value / p.max) * 100}%` }), el('b', { class: 'num' }, `${p.value}/${p.max}`)))),
    el('p', { class: 'naive' }, score.total + score.bonus > flatTotal ? `Porazil jsi „rovnou čáru“ – odhad beze změny by dostal ${flatTotal} b.` : `Rovná čára (žádná změna) by dostala ${flatTotal} b. – tentokrát víc než tvůj odhad.`),
    score.checks.length ? el('ul', { class: 'checks' }, score.checks.map((c) => el('li', { class: c.ok ? 'ok' : '' }, icon(c.ok ? 'check' : 'close'), c.label))) : null,
    el('h3', {}, 'Proč to dopadlo takhle'),
    el('p', {}, s.outcome.summary),
    s.outcome.points.length ? el('ul', { class: 'plain' + (s.outcome.english ? ' quote' : '') }, s.outcome.points.map((p) => el('li', {}, p))) : null,
    s.outcome.english ? el('p', { class: 'muted small' }, 'Body výše jsou výňatky z tiskové zprávy firmy (anglicky).') : null,
    model.upcomingEarnings.length ? el('p', { class: 'links' }, 'Zdroj: ', model.upcomingEarnings.map((e) => el('a', { href: e.url, target: '_blank' }, `8-K ${fmtDate(e.date)}`))) : null,
    shareButton,
  )
}

// --- analytická část ---

function analysisTabs(s, model, state) {
  const panes = [
    ['Přehled', () => overviewPane(s, model)],
    ['Data', () => dataPane(s, model)],
    ['Konkurence', () => peersPane(s)],
    ['Články', () => articlesPane(s, model, state)],
  ]
  const body = el('div', { class: 'pane' })
  const show = (i) => body.replaceChildren(panes[i][1]())
  const tabs = segmented(panes.map(([name]) => name), 0, show, 'tabs')
  show(0)
  return el('section', { class: 'analysis' }, tabs, body)
}

function overviewPane(s, model) {
  const m = s.metrics
  const d = derived(s)
  const list = signals(s)
  const areas = [...new Set(list.map((x) => x.area))]
  return el(
    'div',
    {},
    el('p', { class: 'lead' }, s.situation),
    model.upcomingEarnings.length
      ? el('p', { class: 'note' }, 'V období vyjdou výsledky: ', model.upcomingEarnings.map((e) => `${fmtDate(e.date)}${e.afterClose ? ' po zavření burzy' : ''}`).join(', '))
      : null,
    el('h4', {}, 'Klíčová čísla'),
    el(
      'div',
      { class: 'tiles' },
      tile('Cena', fmtPrice(m.price), `kap. ${fmtBig(m.marketCap)}`),
      tile('P/E', pe(m), d.peerPe ? `konkurence ${fmtX(d.peerPe)}` : `P/S ${fmtX(m.ps)}`),
      tile('Růst tržeb', fmtPct(m.lastQuarterGrowth), 'posl. kvartál r/r'),
      tile('Provozní marže', fmtPct(m.operatingMargin, false), d.marginChange != null ? `${fmtPp(d.marginChange)} r/r` : '12 měsíců'),
      tile('Za 6 měsíců', fmtPct(m.change6m), `za rok ${fmtPct(m.change1y)}`),
      tile('Běžný pohyb', d.expectedMove ? `±${fmtPct(d.expectedMove, false)}` : '–', `za ${s.horizon} (1σ)`),
      tile('Reakce na výsledky', d.typicalReaction ? `±${fmtPct(d.typicalReaction, false)}` : '–', 'průměr minulých'),
      tile('Volatilita', fmtPct(m.volatility, false), `beta ${num(m.beta)}`),
    ),
    rangeBar(m, d),
    timeline(s, model),
    el('h4', {}, 'Fakta v kostce'),
    areas.map((area) =>
      el('div', { class: 'signal-group' }, el('span', { class: 'area' }, area), el('ul', { class: 'signals' }, list.filter((x) => x.area === area).map((x) => el('li', {}, x.text)))),
    ),
    el('p', { class: 'muted small' }, 'Údaje známé k datu rozhodnutí, bez hodnocení. Podrobnosti najdeš v záložce Data.'),
  )
}

// Časová osa: minulé události a výsledky (s reakcí trhu), nejnovější nahoře
function timeline(s, model) {
  const items = [
    ...model.events.filter((e) => e.date <= s.decisionDate).map((e) => ({ date: e.date, label: e.label })),
    ...model.pastEarnings.map((e) => ({ date: e.date, label: e.preliminary ? 'Předběžné údaje' : 'Výsledky', move: e.reaction })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12)
  if (!items.length) return null
  return el(
    'div',
    {},
    el('h4', {}, 'Časová osa'),
    el('ol', { class: 'timeline' }, items.map((it) => el('li', {}, el('span', { class: 'num' }, fmtDate(it.date)), el('span', {}, it.label), el('span', { class: 'num' }, it.move != null ? fmtPct(it.move) : '')))),
  )
}

const tile = (label, value, hint) => el('div', { class: 'tile' }, el('span', {}, label), el('b', { class: 'num' }, value), el('small', {}, hint))

// Kde je cena v rámci ročního rozpětí
function rangeBar(m, d) {
  if (d.rangePosition == null) return null
  return el(
    'div',
    { class: 'range', role: 'img', 'aria-label': `Cena je na ${Math.round(d.rangePosition * 100)} % ročního rozpětí` },
    el('div', { class: 'range-track' }, el('i', { style: `left:${d.rangePosition * 100}%` })),
    el('div', { class: 'range-labels' }, el('small', {}, `min ${fmtPrice(m.low52)}`), el('small', {}, '52 týdnů'), el('small', {}, `max ${fmtPrice(m.high52)}`)),
  )
}

const row = (label, value, hint) => el('div', { class: 'row' }, el('span', {}, label, hint ? el('small', {}, hint) : null), el('b', {}, value ?? '–'))
const section = (title, open, ...rows) => el('details', { class: 'section', open }, el('summary', {}, title), el('div', { class: 'rows' }, rows))
const pe = (r) => (r.pe ? fmtX(r.pe) : r.epsTtm < 0 ? 'ztráta' : '–')
const num = fmtNum

function dataPane(s, model) {
  const m = s.metrics
  return el(
    'div',
    {},
    section(
      'Valuace',
      true,
      row('Tržní kapitalizace', fmtBig(m.marketCap)),
      row('P/E', pe(m), 'cena / zisk za 12 měsíců'),
      row('P/S', fmtX(m.ps), 'cena / tržby'),
      row('EV / tržby', fmtX(m.evSales), 'včetně dluhu a hotovosti'),
      row('Výnos volného cash flow', fmtPct(m.fcfYield, false)),
      row('Forward P/E', 'není k dispozici', 'odhady analytiků jsou placená data – viz výhled vedení v Článcích'),
    ),
    section(
      'Růst',
      true,
      row('Tržby za 12 měsíců', fmtBig(m.revenueTtm), `meziročně ${fmtPct(m.revenueTtmGrowth)}`),
      row('Poslední kvartál', fmtBig(m.lastQuarterRevenue), `${fmtPct(m.lastQuarterGrowth)} r/r · ${fmtPct(m.lastQuarterQoq)} proti minulému`),
      row('EPS za 12 měsíců', m.epsTtm != null ? fmtPrice(m.epsTtm) : '–', m.epsTtmGrowth != null ? `meziročně ${fmtPct(m.epsTtmGrowth)}` : null),
      quartersChart(m.quarterly ?? []),
    ),
    earningsSection(model),
    section(
      'Ziskovost',
      false,
      row('Hrubá marže', fmtPct(m.grossMargin, false)),
      row('Provozní marže', fmtPct(m.operatingMargin, false)),
      row('Čistá marže', fmtPct(m.netMargin, false)),
      row('Volné cash flow', fmtBig(m.fcfTtm), m.fcfMargin != null ? `marže ${fmtPct(m.fcfMargin, false)}` : null),
      row('ROE', fmtPct(m.roe, false), 'zisk / vlastní kapitál'),
      row('Výzkum a vývoj', fmtPct(m.rndShare, false), 'podíl na tržbách'),
    ),
    section(
      'Rozvaha',
      false,
      row('Hotovost a investice', fmtBig(m.cashAndInvestments)),
      row('Dluh', fmtBig(m.debt)),
      row('Zásoby meziročně', fmtPct(m.inventoryGrowth)),
      row('Zpětné odkupy (12 m.)', fmtBig(m.buybacksTtm)),
      row('Dividendy (12 m.)', fmtBig(m.dividendsTtm)),
      row('Počet akcií meziročně', fmtPct(m.sharesGrowth), '+ ředění, − odkupy'),
    ),
    section(
      'Cena a volatilita',
      false,
      row('52týdenní max / min', `${fmtPrice(m.high52)} / ${fmtPrice(m.low52)}`, `od maxima ${fmtPct(m.fromHigh)}`),
      row('Změna 1 / 6 / 12 měsíců', `${fmtPct(m.change1m)} / ${fmtPct(m.change6m)} / ${fmtPct(m.change1y)}`),
      row('Vs. průměr 200 dní', fmtPct(m.vsMa200)),
      row('Volatilita', fmtPct(m.volatility, false), 'roční, z posledních 60 dní'),
      row('Beta', num(m.beta), 'citlivost na S&P 500'),
    ),
    s.insiders ? insidersSection(s.insiders) : null,
    s.macro ? macroSection(s.macro) : null,
    el('p', { class: 'muted small' }, `Poslední výkaz: ${m.reportForm ?? ''} podaný ${m.reportFiled ? fmtDate(m.reportFiled) : '–'} (SEC EDGAR). Ekonomika: FRED.`),
  )
}

// Jak trh reagoval na minulé výsledky a jaká byla čísla
function earningsSection(model) {
  const past = model.pastEarnings.filter((e) => !e.preliminary).slice(-6).reverse()
  if (!past.length) return null
  const cell = (text, cls = '') => el('td', { class: cls }, text)
  return section(
    'Minulé výsledky a reakce trhu',
    true,
    el(
      'table',
      { class: 'peers compact' },
      el('thead', {}, el('tr', {}, ['Výsledky', 'Tržby r/r', 'Marže', 'P/E', 'Reakce'].map((h) => el('th', {}, h)))),
      el(
        'tbody',
        {},
        past.map((e) =>
          el(
            'tr',
            {},
            cell(fmtDate(e.date)),
            cell(fmtPct(e.snapshot?.growth)),
            cell(fmtPct(e.snapshot?.operatingMargin, false)),
            cell(e.snapshot?.pe ? fmtX(e.snapshot.pe) : '–'),
            cell(fmtPct(e.reaction)),
          ),
        ),
      ),
    ),
    el('p', { class: 'muted small' }, 'Reakce = změna ceny v den, kdy trh na výsledky zareagoval. Marže = provozní za kvartál.'),
  )
}

function quartersChart(quarters) {
  if (!quarters.length) return null
  const max = Math.max(...quarters.map((q) => q.revenue))
  return el(
    'div',
    { class: 'qbars', role: 'img', 'aria-label': 'Tržby po kvartálech: ' + quarters.map((q) => `${q.end.slice(0, 7)} ${fmtBig(q.revenue)}`).join(', ') },
    quarters.map((q) =>
      el(
        'div',
        { class: 'qbar' },
        el('em', {}, q.growth != null ? fmtPct(q.growth) : ''),
        el('i', { style: `--h:${(q.revenue / max) * 100}%` }),
        el('small', {}, q.end.slice(2, 7).replace('-', '/')),
      ),
    ),
  )
}

function insidersSection(ins) {
  const people = (n) => plural(n, 'osoba', 'osoby', 'osob')
  return section(
    'Insideři (6 měsíců)',
    false,
    row('Nákupy na trhu', ins.buyValue ? fmtBig(ins.buyValue) : 'žádné', ins.buyValue ? people(ins.buyPeople) : null),
    row('Prodeje na trhu', ins.sellValue ? fmtBig(ins.sellValue) : 'žádné', ins.sellValue ? people(ins.sellPeople) : null),
    ...ins.topSellers.map((t) => row(t.name, fmtBig(t.value), t.title || 'insider')),
  )
}

function macroSection(mc) {
  const rate = (v) => (v?.value == null ? '–' : `${num(v.value)} %`)
  const before = (v) => (v?.before != null ? `před 6 měsíci ${num(v.before)} %` : null)
  return section(
    'Ekonomika USA',
    false,
    row('Úrok Fedu', rate(mc.fedFunds), before(mc.fedFunds)),
    row('Výnos 10letého dluhopisu', rate(mc.rate10y), before(mc.rate10y)),
    row('Spread 10 let − 2 roky', rate(mc.spread10y2y), before(mc.spread10y2y)),
    row('Inflace', rate(mc.inflation), `za ${fmtMonth(mc.inflation.asOf)}`),
    row('Nezaměstnanost', rate(mc.unemployment), before(mc.unemployment)),
  )
}

function peersPane(s) {
  const rows = [s.metrics, ...s.peerMetrics]
  const cell = (text, cls = '') => el('td', { class: cls }, text)
  const label = (r, i) => (r.ticker === '^GSPC' ? 'S&P 500' : i === 0 && s.auto ? 'Tato firma' : r.ticker)
  return el(
    'div',
    {},
    el(
      'table',
      { class: 'peers' },
      el('thead', {}, el('tr', {}, ['', '12 m.', 'P/E', 'P/S', 'Růst', 'Marže'].map((h) => el('th', {}, h)))),
      el(
        'tbody',
        {},
        rows.map((r, i) =>
          el(
            'tr',
            { class: i === 0 ? 'me' : '' },
            cell(label(r, i)),
            cell(fmtPct(r.change1y)),
            cell(r.ticker === '^GSPC' ? '–' : pe(r)),
            cell(fmtX(r.ps)),
            cell(fmtPct(r.revenueTtmGrowth)),
            cell(fmtPct(r.operatingMargin, false)),
          ),
        ),
      ),
    ),
    el('p', { class: 'muted small' }, 'Hodnoty k datu rozhodnutí. Růst = tržby za 12 měsíců meziročně, marže = provozní.'),
  )
}

function articlesPane(s, model, state) {
  // U anonymní firmy by odkaz na SEC prozradil jméno – ukážeme ho až po vyhodnocení
  const showLinks = !s.auto || state.revealed
  return el(
    'div',
    {},
    s.articles.map((a, i) => el('details', { class: 'article', open: i === 0 }, el('summary', {}, a.title), el('p', {}, a.body))),
    !s.auto && s.press ? pressCard(s.press, showLinks) : null,
    showLinks && model.pastEarnings.length
      ? el(
          'div',
          { class: 'links' },
          el('h4', {}, 'Originální zprávy na SEC'),
          model.pastEarnings
            .slice(-4)
            .reverse()
            .map((e) => el('a', { href: e.url, target: '_blank' }, `${e.preliminary ? 'Předběžné údaje' : 'Výsledky'} ${fmtDate(e.date)}`)),
        )
      : null,
  )
}

function pressCard(press, showLink) {
  const list = (items) => el('ul', { class: 'plain quote' }, items.map((t) => el('li', {}, t)))
  return el(
    'details',
    { class: 'article' },
    el('summary', {}, `Tisková zpráva ${fmtDate(press.date)} – originál`),
    press.highlights.length ? [el('h4', {}, 'Hlavní body'), list(press.highlights)] : null,
    el('h4', {}, 'Výhled vedení'),
    press.outlook.length ? list(press.outlook) : el('p', { class: 'muted' }, 'Firma v tiskové zprávě číselný výhled neuvádí (často ho sděluje až na hovoru s analytiky).'),
    showLink ? el('a', { href: press.url, target: '_blank' }, 'Celá zpráva na SEC') : null,
  )
}

// --- sdílené prvky ---

const stat = (label, value) => el('div', { class: 'stat' }, el('b', {}, String(value)), el('span', {}, label))

function segmented(labels, active, onPick, cls = 'segmented') {
  const buttons = labels.map((label, i) => el('button', { class: i === active ? 'active' : '', role: 'tab', 'aria-selected': String(i === active), onclick: () => pick(i) }, ...(Array.isArray(label) ? label : [label])))
  const pick = (i) => {
    buttons.forEach((b, j) => {
      b.classList.toggle('active', i === j)
      b.setAttribute('aria-selected', String(i === j))
    })
    onPick(i)
  }
  return el('div', { class: cls, role: 'tablist' }, buttons)
}

// --- statistiky ---

export function statsView(back) {
  const st = playerStats(loadHistory())
  const bar = (label, value, max) => el('div', { class: 'bar' }, el('span', {}, label), el('i', { style: `--w:${max ? (value / max) * 100 : 0}%` }), el('b', {}, String(value)))
  const maxTier = Math.max(1, ...st.tiers.map((t) => t.count))
  const bias = st.bias == null ? null : st.bias > 0.03 ? `Jsi optimista: tvé odhady jsou v průměru o ${fmtPct(st.bias, false)} výš než realita.` : st.bias < -0.03 ? `Jsi pesimista: tvé odhady jsou v průměru o ${fmtPct(-st.bias, false)} níž než realita.` : 'Tvé odhady nemají výrazný sklon nahoru ani dolů.'
  return el(
    'main',
    { class: 'screen' },
    el('div', { class: 'topbar' }, iconButton('back', 'Zpět', back), el('div', { class: 'grow' }, el('strong', {}, 'Statistiky'), el('small', {}, plural(st.games, 'hra', 'hry', 'her')))),
    el('h4', {}, 'Odznaky'),
    el('div', { class: 'badges' }, BADGES.map((b) => el('span', { class: 'badge-chip' + (earnedBadges().includes(b) ? '' : ' locked') }, b.label))),
    st.games
      ? [
          el('div', { class: 'stats' }, stat('Průměr', st.avg), stat('Nejlepší', st.best), stat('Trefený směr', st.directionHit != null ? `${Math.round(st.directionHit * 100)} %` : '–')),
          bias ? el('p', { class: 'note' }, bias) : null,
          el('section', { class: 'card' }, el('h4', {}, 'Rozložení skóre'), el('div', { class: 'bars' }, st.tiers.map((t) => bar(t.label, t.count, maxTier)))),
          groupCard('Podle horizontu', st.byHorizon),
          groupCard('Podle odvětví', st.bySector),
          el('h4', {}, 'Poslední hry'),
          el('section', { class: 'card rows history' }, loadHistory().slice(0, 20).map((h) => row(h.title, String(h.score), `${fmtDate(h.date)} · ${h.horizon ?? ''}`))),
        ]
      : el('p', { class: 'note' }, 'Zatím žádné hry. Zahraj si první scénář a statistiky se tu objeví.'),
  )
}

function groupCard(title, groups) {
  if (!groups.length) return null
  return el(
    'section',
    { class: 'card' },
    el('h4', {}, title),
    el('div', { class: 'rows' }, groups.sort((a, b) => b.avg - a.avg).map((g) => row(g.label, String(g.avg), plural(g.count, 'hra', 'hry', 'her')))),
  )
}

// --- nastavení ---

export function settingsView(back) {
  const settings = loadSettings()
  const themes = ['system', 'light', 'dark']
  const toggle = (label, hint, key) => {
    const input = el('input', { type: 'checkbox', role: 'switch', 'aria-label': label })
    input.checked = settings[key]
    input.addEventListener('change', () => saveSettings({ [key]: input.checked }))
    return el('label', { class: 'row switch' }, el('span', {}, label, el('small', {}, hint)), input)
  }
  const reset = el('button', { class: 'danger', onclick: () => {
    if (reset.dataset.confirm) {
      resetProgress()
      reset.textContent = 'Postup smazán'
      return
    }
    reset.dataset.confirm = '1'
    reset.textContent = 'Opravdu smazat? Klepni znovu'
  } }, 'Smazat postup a statistiky')

  return el(
    'main',
    { class: 'screen' },
    el('div', { class: 'topbar' }, iconButton('back', 'Zpět', back), el('div', { class: 'grow' }, el('strong', {}, 'Nastavení'))),
    el('h4', {}, 'Vzhled'),
    segmented(['Podle systému', 'Světlý', 'Tmavý'], themes.indexOf(settings.theme), (i) => {
      saveSettings({ theme: themes[i] })
      applyTheme(themes[i])
      window.dispatchEvent(new Event('themechange'))
    }),
    el('h4', {}, 'Hra'),
    el('section', { class: 'card rows' }, toggle('Vibrace', 'při kreslení a vyhodnocení', 'haptics'), toggle('Pásmo běžného pohybu', 'zapnout ± v grafu automaticky', 'band')),
    el('h4', {}, 'Data'),
    el('section', { class: 'card' }, reset),
    el('p', { class: 'foot' }, 'Kam to půjde? · verze 1.4 · data SEC EDGAR, FRED, Yahoo Finance'),
  )
}
