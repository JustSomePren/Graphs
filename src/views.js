import { DAY, el, fmtBig, fmtDate, fmtMonth, fmtPct, fmtPrice, fmtX, toTs } from './format.js'
import { buildModel } from './model.js'
import { createChart, ZOOMS } from './chart.js'
import { scorePrediction } from './score.js'
import { signals } from './signals.js'
import { getFlag, loadResults, saveResult, setFlag } from './storage.js'

const HORIZONS = [
  { label: 'Vše', test: () => true },
  { label: 'Krátké', test: (days) => days <= 45 },
  { label: 'Střední', test: (days) => days > 45 && days <= 120 },
  { label: 'Dlouhé', test: (days) => days > 120 },
]

const horizonDays = (s) => (toTs(s.endDate) - toTs(s.decisionDate)) / DAY
const tier = (score) => (score >= 80 ? 'great' : score >= 55 ? 'ok' : 'low')

// --- domovská obrazovka ---

export function homeView(scenarios, open) {
  const results = loadResults()
  const played = scenarios.filter((s) => results[s.id])
  const avg = played.length ? Math.round(played.reduce((sum, s) => sum + results[s.id].best, 0) / played.length) : null
  const list = el('div', { class: 'list' })

  const render = (filter) => {
    list.replaceChildren(...scenarios.filter((s) => filter.test(horizonDays(s))).map((s) => scenarioCard(s, results[s.id], open)))
  }
  const filters = segmented(HORIZONS.map((h) => h.label), 0, (i) => render(HORIZONS[i]))
  render(HORIZONS[0])

  return el(
    'main',
    { class: 'screen' },
    el('header', { class: 'hero' }, el('span', { class: 'logo' }, '📈'), el('h1', {}, 'Kam to půjde?'), el('p', {}, 'Buď investorem v konkrétní den. Prostuduj data, nakresli vývoj a porovnej s realitou.')),
    getFlag('intro') ? null : introCard(),
    el('div', { class: 'stats' }, stat('Odehráno', `${played.length} / ${scenarios.length}`), stat('Průměr', avg ?? '–'), stat('Nejlepší', played.length ? Math.max(...played.map((s) => results[s.id].best)) : '–')),
    filters,
    list,
    el('p', { class: 'foot' }, 'Data: SEC EDGAR, FRED, denní ceny. Hra není investiční doporučení.'),
  )
}

function introCard() {
  const card = el(
    'section',
    { class: 'card intro' },
    el('h3', {}, 'Jak hrát'),
    el('ol', {}, el('li', {}, 'Vyber scénář a přečti si situaci a data.'), el('li', {}, 'Prstem nakresli, kam půjde cena (nebo vkládej body).'), el('li', {}, 'Nejvíc se počítá konečná cena, bonus za trefený tvar.')),
    el('button', { class: 'link', onclick: () => (setFlag('intro'), card.remove()) }, 'Rozumím'),
  )
  return card
}

function scenarioCard(s, result, open) {
  return el(
    'button',
    { class: 'card scenario', onclick: () => open(s) },
    el('div', { class: 'scenario-top' }, el('span', { class: 'ticker' }, s.ticker), el('span', { class: 'pill' }, s.horizon), result ? el('span', { class: `badge ${tier(result.best)}` }, result.best) : null),
    el('strong', {}, s.title),
    el('small', {}, `${s.name} · ${fmtDate(s.decisionDate)}`),
    sparkline(s),
  )
}

// Náhled historie bez budoucnosti
function sparkline(s) {
  const history = s.series.filter(([d]) => d <= s.decisionDate).map(([, p]) => Math.log(p))
  const step = Math.max(1, Math.floor(history.length / 80))
  const pts = history.filter((_, i) => i % step === 0)
  const lo = Math.min(...pts)
  const hi = Math.max(...pts)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${((i / (pts.length - 1)) * 100).toFixed(1)},${(30 - ((p - lo) / (hi - lo || 1)) * 28).toFixed(1)}`).join('')
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 100 32')
  svg.setAttribute('preserveAspectRatio', 'none')
  svg.setAttribute('class', 'spark')
  svg.innerHTML = `<path d="${d}" fill="none" vector-effect="non-scaling-stroke"/>`
  return svg
}

// --- hra ---

export function gameView(s, { back, next }) {
  const model = buildModel(s)
  const canvas = el('canvas', { class: 'chart', 'aria-label': `Graf ${s.ticker}` })
  const action = el('button', { class: 'primary', disabled: true })
  const resultBox = el('div')
  let chart
  let zoomIndex = 0

  const refresh = () => {
    action.disabled = !chart.complete
    action.textContent = chart.complete ? 'Vyhodnotit' : chart.points.length ? 'Dokresli až ke konci' : 'Nakresli odhad do modré zóny'
  }

  const zoomButton = el('button', { class: 'icon-btn wide', 'aria-label': 'Rozsah osy', onclick: () => cycleZoom() })
  const showZoom = () => (zoomButton.textContent = `↕ ×${ZOOMS[zoomIndex].toLocaleString('cs-CZ')}`)
  const cycleZoom = () => {
    zoomIndex = (zoomIndex + 1) % ZOOMS.length
    chart.setZoom(ZOOMS[zoomIndex])
    showZoom()
  }

  const toolbar = el(
    'div',
    { class: 'toolbar' },
    segmented(['✍️ Prst', '📍 Body'], 0, (i) => chart.setMode(i ? 'points' : 'finger')),
    zoomButton,
    el('button', { class: 'icon-btn', 'aria-label': 'Vrátit krok', onclick: () => chart.undo() }, '↶'),
    el('button', { class: 'icon-btn', 'aria-label': 'Smazat odhad', onclick: () => chart.clear() }, '✕'),
  )

  const legend = el('div', { class: 'legend' }, el('span', { class: 'key hist' }, 'Historie'), el('span', { class: 'key guess' }, 'Tvůj odhad'))

  const screen = el(
    'main',
    { class: 'screen game' },
    el(
      'div',
      { class: 'topbar' },
      el('button', { class: 'icon-btn', 'aria-label': 'Zpět na seznam', onclick: back }, '←'),
      el('div', { class: 'grow' }, el('strong', {}, s.title), el('small', {}, `${s.name} (${s.ticker}) · odhad do ${fmtDate(model.future.at(-1).date)}`)),
    ),
    el('section', { class: 'card chart-card' }, legend, canvas),
    toolbar,
    resultBox,
    analysisTabs(s, model),
    el('div', { class: 'action-bar' }, action),
  )

  chart = createChart(canvas, model, { onChange: refresh })
  chart.setMode('finger')
  zoomIndex = ZOOMS.indexOf(chart.zoom)
  showZoom()
  refresh()

  action.addEventListener('click', () => {
    if (action.dataset.done) return next()
    const score = scorePrediction(model, chart.points)
    saveResult(s.id, score.total + score.bonus)
    toolbar.remove()
    action.disabled = true
    chart.reveal(() => {
      legend.append(el('span', { class: `key real ${score.actualEnd >= 0 ? 'up' : 'down'}` }, 'Realita'))
      resultBox.replaceChildren(resultCard(s, model, score))
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' })
      action.dataset.done = '1'
      action.disabled = false
      action.textContent = 'Další scénář →'
    })
  })

  return screen
}

function resultCard(s, model, score) {
  const verdict = score.total >= 85 ? 'Věštec 🔮' : score.total >= 65 ? 'Dobrý odhad 👍' : score.total >= 40 ? 'Napůl trefa' : 'Trh tě přechytračil'
  return el(
    'section',
    { class: 'card result' },
    el(
      'div',
      { class: 'score-head' },
      el('div', { class: `ring ${tier(score.total)}`, style: `--p:${score.total}` }, el('b', {}, String(score.total + score.bonus))),
      el('div', {}, el('strong', {}, verdict), el('small', {}, `${score.total} b.${score.bonus ? ` + ${score.bonus} bonus za tvar` : ''}`)),
    ),
    el('div', { class: 'compare' }, stat('Tvůj odhad', fmtPct(score.predEnd)), stat('Realita', fmtPct(score.actualEnd)), stat('Rozdíl', `${Math.round(Math.abs(score.gapPoints))} p.b.`)),
    el('div', { class: 'bars' }, score.parts.map((p) => el('div', { class: 'bar' }, el('span', {}, p.label), el('i', { style: `--w:${(p.value / p.max) * 100}%` }), el('b', {}, `${p.value}/${p.max}`)))),
    score.checks.length ? el('div', { class: 'chips' }, score.checks.map((c) => el('span', { class: `chip-tag ${c.ok ? 'good' : ''}` }, (c.ok ? '✓ ' : '✗ ') + c.label))) : null,
    el('h3', {}, 'Proč to dopadlo takhle'),
    el('p', {}, s.outcome.summary),
    el('ul', { class: 'plain' }, s.outcome.points.map((p) => el('li', {}, p))),
    model.upcomingEarnings.length ? el('p', { class: 'links' }, 'Zdroj: ', model.upcomingEarnings.map((e) => el('a', { href: e.url, target: '_blank' }, `8-K ${fmtDate(e.date)}`))) : null,
  )
}

// --- analytická část ---

function analysisTabs(s, model) {
  const panes = [
    ['Přehled', () => overviewPane(s, model)],
    ['Data', () => dataPane(s)],
    ['Konkurence', () => peersPane(s)],
    ['Články', () => articlesPane(s, model)],
  ]
  const body = el('div', { class: 'pane' })
  const show = (i) => body.replaceChildren(panes[i][1]())
  const tabs = segmented(panes.map(([name]) => name), 0, show, 'tabs')
  show(0)
  return el('section', { class: 'analysis' }, tabs, body)
}

function overviewPane(s, model) {
  return el(
    'div',
    {},
    el('p', { class: 'lead' }, s.situation),
    model.upcomingEarnings.length
      ? el('p', { class: 'note' }, '📅 V období vyjdou výsledky: ', model.upcomingEarnings.map((e) => `${fmtDate(e.date)}${e.afterClose ? ' po zavření burzy' : ''}`).join(', '))
      : null,
    el('h4', {}, 'Rychlý přehled'),
    el('ul', { class: 'signals' }, signals(s).map((x) => el('li', { class: x.tone }, el('span', { class: 'area' }, x.area), x.text))),
    el('p', { class: 'muted small' }, 'Signály jsou automatické shrnutí dat, ne doporučení. Podrobnosti najdeš v záložce Data.'),
  )
}

const row = (label, value, hint) => el('div', { class: 'row' }, el('span', {}, label, hint ? el('small', {}, hint) : null), el('b', {}, value ?? '–'))
const section = (title, open, ...rows) => el('details', { class: 'section', open }, el('summary', {}, title), el('div', { class: 'rows' }, rows))
const pe = (r) => (r.pe ? fmtX(r.pe) : r.epsTtm < 0 ? 'ztráta' : '–')
const num = (x, digits = 2) => (x == null ? '–' : x.toLocaleString('cs-CZ', { maximumFractionDigits: digits }))

function dataPane(s) {
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
      row('Forward P/E', 'není k dispozici', 'odhady analytiků jsou placená data'),
    ),
    section(
      'Růst',
      true,
      row('Tržby za 12 měsíců', fmtBig(m.revenueTtm), `meziročně ${fmtPct(m.revenueTtmGrowth)}`),
      row('Poslední kvartál', fmtBig(m.lastQuarterRevenue), `${fmtPct(m.lastQuarterGrowth)} r/r · ${fmtPct(m.lastQuarterQoq)} proti minulému`),
      row('EPS za 12 měsíců', m.epsTtm != null ? fmtPrice(m.epsTtm) : '–', m.epsTtmGrowth != null ? `meziročně ${fmtPct(m.epsTtmGrowth)}` : null),
      quartersChart(m.quarterly ?? []),
    ),
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
      'Cena a riziko',
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

function quartersChart(quarters) {
  if (!quarters.length) return null
  const max = Math.max(...quarters.map((q) => q.revenue))
  return el(
    'div',
    { class: 'qbars' },
    quarters.map((q) =>
      el(
        'div',
        { class: 'qbar' },
        el('em', { class: q.growth >= 0 ? 'up' : 'down' }, q.growth != null ? fmtPct(q.growth) : ''),
        el('i', { style: `--h:${(q.revenue / max) * 100}%` }),
        el('small', {}, q.end.slice(2, 7).replace('-', '/')),
      ),
    ),
  )
}

function insidersSection(ins) {
  const people = (n) => `${n} ${n === 1 ? 'osoba' : n < 5 ? 'osoby' : 'osob'}`
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
    row('Spread 10 let − 2 roky', rate(mc.spread10y2y), mc.spread10y2y.value < 0 ? 'inverzní křivka' : before(mc.spread10y2y)),
    row('Inflace', rate(mc.inflation), `za ${fmtMonth(mc.inflation.asOf)}`),
    row('Nezaměstnanost', rate(mc.unemployment), before(mc.unemployment)),
  )
}

function peersPane(s) {
  const rows = [s.metrics, ...s.peerMetrics]
  const cell = (text, cls = '') => el('td', { class: cls }, text)
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
            cell(r.ticker === '^GSPC' ? 'S&P 500' : r.ticker),
            cell(fmtPct(r.change1y), r.change1y >= 0 ? 'up' : 'down'),
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

function articlesPane(s, model) {
  return el(
    'div',
    {},
    s.articles.map((a, i) => el('details', { class: 'article', open: i === 0 }, el('summary', {}, a.title), el('p', {}, a.body))),
    model.pastEarnings.length
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

// --- sdílené prvky ---

const stat = (label, value) => el('div', { class: 'stat' }, el('b', {}, String(value)), el('span', {}, label))

function segmented(labels, active, onPick, cls = 'segmented') {
  const buttons = labels.map((label, i) => el('button', { class: i === active ? 'active' : '', role: 'tab', onclick: () => pick(i) }, label))
  const pick = (i) => {
    buttons.forEach((b, j) => b.classList.toggle('active', i === j))
    onPick(i)
  }
  return el('div', { class: cls, role: 'tablist' }, buttons)
}
