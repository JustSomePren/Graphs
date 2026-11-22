import { el, fmtBig, fmtDate, fmtMonth, fmtPct, fmtPrice, fmtX } from './format.js'
import { buildModel } from './model.js'
import { createChart, ZOOMS } from './chart.js'
import { scorePrediction } from './score.js'
import { loadResults, saveResult } from './storage.js'

export function homeView(scenarios, open) {
  const results = loadResults()
  const played = Object.values(results)
  const avg = played.length ? Math.round(played.reduce((s, r) => s + r.best, 0) / played.length) : null

  return el(
    'main',
    { class: 'screen' },
    el('header', { class: 'hero' }, el('h1', {}, 'Kam to půjde?'), el('p', {}, 'Prostuduj situaci jako investor v daný den, nakresli vývoj grafu a porovnej s realitou.')),
    el(
      'div',
      { class: 'stats' },
      stat('Odehráno', `${played.length}/${scenarios.length}`),
      stat('Průměr', avg ?? '–'),
    ),
    el(
      'div',
      { class: 'list' },
      scenarios.map((s) => {
        const best = results[s.id]?.best
        return el(
          'button',
          { class: 'card scenario', onclick: () => open(s) },
          el('div', { class: 'ticker' }, s.ticker),
          el('div', { class: 'grow' }, el('strong', {}, s.title), el('small', {}, `${fmtDate(s.decisionDate)} · horizont ${s.horizon}`)),
          el('div', { class: 'best' + (best != null ? '' : ' empty') }, best ?? '–'),
        )
      }),
    ),
    el('p', { class: 'foot' }, 'Fundamenty: SEC EDGAR (veřejná data). Ceny upraveny na úroveň k datu rozhodnutí. Nejde o investiční doporučení.'),
  )
}

const stat = (label, value) => el('div', { class: 'stat' }, el('b', {}, String(value)), el('span', {}, label))

export function gameView(s, back) {
  const model = buildModel(s)
  const canvas = el('canvas', { class: 'chart' })
  const submit = el('button', { class: 'primary', disabled: true }, 'Nakresli odhad až do konce')
  const modeButtons = {}
  let chart

  const refresh = () => {
    submit.disabled = !chart.complete
    submit.textContent = chart.complete ? 'Vyhodnotit' : 'Nakresli odhad až do konce'
  }

  const setMode = (m) => {
    chart.setMode(m)
    for (const [key, b] of Object.entries(modeButtons)) b.classList.toggle('active', key === m)
  }

  const tool = (key, text) => (modeButtons[key] = el('button', { class: 'chip', onclick: () => setMode(key) }, text))

  const zoomChips = ZOOMS.map((z) =>
    el('button', { class: 'chip small', onclick: (e) => pickZoom(z, e.currentTarget) }, `×${z}`),
  )
  const pickZoom = (z, button) => {
    chart.setZoom(z)
    zoomChips.forEach((c) => c.classList.toggle('active', c === button))
  }

  const toolbar = el(
    'div',
    { class: 'toolbar' },
    tool('finger', '✍️ Prst'),
    tool('points', '📍 Body'),
    el('button', { class: 'chip', onclick: () => chart.undo() }, '↶'),
    el('button', { class: 'chip', onclick: () => chart.clear() }, '🗑'),
  )

  const tabs = analysisTabs(s, model)
  const resultBox = el('div')

  const screen = el(
    'main',
    { class: 'screen game' },
    el('div', { class: 'topbar' }, el('button', { class: 'chip', onclick: back }, '←'), el('div', { class: 'grow' }, el('strong', {}, `${s.name} (${s.ticker})`), el('small', {}, s.title))),
    el('div', { class: 'chart-wrap' }, canvas),
    el('div', { class: 'zoom' }, el('span', {}, 'Rozsah'), zoomChips),
    toolbar,
    submit,
    resultBox,
    tabs,
  )

  chart = createChart(canvas, model, { onChange: refresh })
  setMode('finger')
  zoomChips[ZOOMS.indexOf(chart.zoom)]?.classList.add('active')

  submit.addEventListener('click', () => {
    const score = scorePrediction(model, chart.points)
    saveResult(s.id, score.total + score.bonus)
    toolbar.remove()
    submit.remove()
    screen.querySelector('.zoom').remove()
    chart.reveal(() => {
      resultBox.replaceChildren(resultCard(s, model, score))
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  })

  return screen
}

function resultCard(s, model, score) {
  const grade = score.total >= 85 ? 'Věštec 🔮' : score.total >= 65 ? 'Dobrý odhad 👍' : score.total >= 40 ? 'Napůl trefa' : 'Trh tě přechytračil'
  return el(
    'section',
    { class: 'card result' },
    el('div', { class: 'score' }, el('b', {}, String(score.total)), score.bonus ? el('span', { class: 'bonus' }, `+${score.bonus} bonus`) : null, el('small', {}, grade)),
    el(
      'div',
      { class: 'compare' },
      stat('Tvůj odhad', fmtPct(score.predEnd)),
      stat('Realita', fmtPct(score.actualEnd)),
      stat('Rozdíl', `${Math.abs(score.gapPoints).toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} p.b.`),
    ),
    el('div', { class: 'bars' }, score.parts.map((p) => el('div', { class: 'bar' }, el('span', {}, p.label), el('i', { style: `--w:${(p.value / p.max) * 100}%` }), el('b', {}, `${p.value}/${p.max}`)))),
    score.checks.length ? el('ul', { class: 'checks' }, score.checks.map((c) => el('li', { class: c.ok ? 'ok' : 'miss' }, (c.ok ? '✓ ' : '✗ ') + c.label))) : null,
    el('h3', {}, 'Proč to dopadlo takhle'),
    el('p', {}, s.outcome.summary),
    el('ul', {}, s.outcome.points.map((p) => el('li', {}, p))),
    model.upcomingEarnings.length
      ? el('p', { class: 'links' }, 'Výsledky v období: ', model.upcomingEarnings.map((e) => el('a', { href: e.url, target: '_blank' }, `8-K ${fmtDate(e.date)}`)))
      : null,
    el('p', { class: 'muted' }, `Cena na konci: ${fmtPrice(model.future.at(-1).price)} (${fmtDate(model.future.at(-1).date)})`),
  )
}

// --- analytická část ---

function analysisTabs(s, model) {
  const panes = {
    Situace: () => situationPane(s, model),
    Data: () => dataPane(s),
    Konkurence: () => peersPane(s),
    Rozšířené: () => extendedPane(s, model),
  }
  const body = el('div', { class: 'pane' })
  const buttons = Object.keys(panes).map((name) =>
    el('button', { class: 'tab', onclick: (e) => show(name, e.currentTarget) }, name),
  )
  const show = (name, button) => {
    buttons.forEach((b) => b.classList.toggle('active', b === button))
    body.replaceChildren(panes[name]())
  }
  show('Situace', buttons[0])
  return el('section', { class: 'analysis' }, el('nav', { class: 'tabs' }, buttons), body)
}

function situationPane(s, model) {
  const end = model.future.at(-1).date
  return el(
    'div',
    {},
    el('p', { class: 'lead' }, s.situation),
    el('div', { class: 'facts' }, fact('Odhaduješ do', fmtDate(end)), fact('Cena teď', fmtPrice(model.p0)), fact('Horizont', s.horizon)),
    model.upcomingEarnings.length
      ? el('p', { class: 'note' }, '📅 V období jsou ohlášené výsledky: ', model.upcomingEarnings.map((e) => `${fmtDate(e.date)}${e.afterClose ? ' (po zavření)' : ''}`).join(', '))
      : null,
    el('p', { class: 'hint' }, 'Nakresli prstem (nebo vkládej body) do šedé zóny vpravo, jak se bude cena vyvíjet. Nejvíc se počítá konečná cena, bonus dostaneš za trefený tvar – třeba reakci na earnings a následný obrat. Klepnutím na „E“ nebo tečku v grafu zobrazíš událost.'),
  )
}

const fact = (label, value, hint) => el('div', { class: 'fact' }, el('span', {}, label), el('b', {}, value), hint ? el('small', {}, hint) : null)

const section = (title, open, ...children) => el('details', { class: 'section', open }, el('summary', {}, title), ...children)
const facts = (...items) => el('div', { class: 'facts' }, items)
const pe = (r) => (r.pe ? fmtX(r.pe) : r.epsTtm < 0 ? 'ztráta' : '–')
const rate = (x) => (x == null ? '–' : x.toLocaleString('cs-CZ', { maximumFractionDigits: 2 }) + ' %')
const signed = (x) => (x == null ? '' : (x > 0 ? '+' : '') + x.toLocaleString('cs-CZ', { maximumFractionDigits: 2 }) + ' p.b.')

function dataPane(s) {
  const m = s.metrics
  return el(
    'div',
    {},
    section(
      'Valuace',
      true,
      facts(
        fact('Tržní kap.', fmtBig(m.marketCap)),
        fact('EV', fmtBig(m.ev), 'kap. + dluh − hotovost'),
        fact('P/E (TTM)', pe(m), 'GAAP, posl. 12 měs.'),
        fact('Forward P/E', 'n/a', 'konsenzus je licencovaný'),
        fact('P/S', fmtX(m.ps)),
        fact('EV / tržby', fmtX(m.evSales)),
        fact('P/B', fmtX(m.pb), 'cena / vlastní kapitál'),
        fact('FCF yield', fmtPct(m.fcfYield, false), 'volné cash flow / kap.'),
      ),
    ),
    section(
      'Růst',
      true,
      facts(
        fact('Tržby (TTM)', fmtBig(m.revenueTtm), `r/r ${fmtPct(m.revenueTtmGrowth)}`),
        fact('Posl. kvartál', fmtBig(m.lastQuarterRevenue), `${fmtPct(m.lastQuarterGrowth)} r/r · ${fmtPct(m.lastQuarterQoq)} q/q`),
        fact('EPS (TTM)', m.epsTtm != null ? fmtPrice(m.epsTtm) : '–', m.epsTtmGrowth != null ? `r/r ${fmtPct(m.epsTtmGrowth)}` : null),
        fact('Zásoby r/r', fmtPct(m.inventoryGrowth), 'rychlý růst = riziko'),
      ),
      quartersTable(m.quarterly ?? []),
    ),
    section(
      'Ziskovost',
      false,
      facts(
        fact('Hrubá marže', fmtPct(m.grossMargin, false)),
        fact('Provozní marže', fmtPct(m.operatingMargin, false)),
        fact('Čistá marže', fmtPct(m.netMargin, false)),
        fact('FCF marže', fmtPct(m.fcfMargin, false)),
        fact('ROE', fmtPct(m.roe, false), 'zisk / vlastní kapitál'),
        fact('R&D', fmtPct(m.rndShare, false), 'podíl na tržbách'),
        fact('Odměny v akciích', fmtPct(m.sbcShare, false), 'podíl na tržbách'),
      ),
    ),
    section(
      'Rozvaha a akcionáři',
      false,
      facts(
        fact('Hotovost + investice', fmtBig(m.cashAndInvestments)),
        fact('Dluh', fmtBig(m.debt)),
        fact('Volné cash flow', fmtBig(m.fcfTtm), 'posl. 12 měs.'),
        fact('Zpětné odkupy', fmtBig(m.buybacksTtm), 'posl. 12 měs.'),
        fact('Dividendy', fmtBig(m.dividendsTtm), 'posl. 12 měs.'),
        fact('Počet akcií r/r', fmtPct(m.sharesGrowth), '+ ředění, − odkupy'),
      ),
    ),
    section(
      'Akcie a trh',
      false,
      facts(
        fact('52t max / min', `${fmtPrice(m.high52)} / ${fmtPrice(m.low52)}`, `od maxima ${fmtPct(m.fromHigh)}`),
        fact('Změna 1M / 6M / 1R', `${fmtPct(m.change1m)} / ${fmtPct(m.change6m)} / ${fmtPct(m.change1y)}`),
        fact('vs. průměr 50 / 200 dní', `${fmtPct(m.vsMa50)} / ${fmtPct(m.vsMa200)}`),
        fact('Volatilita', fmtPct(m.volatility, false), 'roční, z posl. 60 dní'),
        fact('Beta', m.beta?.toLocaleString('cs-CZ', { maximumFractionDigits: 2 }) ?? '–', 'citlivost na S&P 500'),
        fact('Denní objem', fmtBig(m.dollarVolume), 'průměr 30 dní'),
      ),
    ),
    s.insiders ? insidersSection(s.insiders) : null,
    s.macro ? macroSection(s.macro) : null,
    el('p', { class: 'muted' }, 'Zdroje: výkazy 10-Q/10-K a formuláře 4 podané na SEC do data rozhodnutí, makro data FRED (Fed St. Louis).'),
  )
}

function quartersTable(quarters) {
  if (!quarters.length) return null
  const maxQ = Math.max(...quarters.map((q) => q.revenue))
  return el(
    'div',
    { class: 'quarters' },
    el('div', { class: 'qbars' }, quarters.map((q) => el('div', { class: 'qbar' }, el('i', { style: `--h:${(q.revenue / maxQ) * 100}%` }), el('small', {}, q.end.slice(2, 7).replace('-', '/'))))),
    table(
      ['Kvartál', 'Tržby', 'r/r', 'Hrubá m.', 'Provoz. m.', 'EPS'],
      [...quarters].reverse().map((q) => [
        q.end.slice(2, 7).replace('-', '/'),
        fmtBig(q.revenue),
        { text: fmtPct(q.growth), cls: q.growth >= 0 ? 'up' : 'down' },
        fmtPct(q.grossMargin, false),
        fmtPct(q.operatingMargin, false),
        q.eps != null ? fmtPrice(q.eps) : '–',
      ]),
    ),
  )
}

function insidersSection(ins) {
  const summary = (value, people) => (value ? `${fmtBig(value)} · ${people} ${people === 1 ? 'osoba' : people < 5 ? 'osoby' : 'osob'}` : 'žádné')
  return section(
    'Insideři (6 měsíců)',
    false,
    facts(fact('Nákupy na trhu', summary(ins.buyValue, ins.buyPeople)), fact('Prodeje na trhu', summary(ins.sellValue, ins.sellPeople))),
    ins.topSellers.length
      ? el('ul', { class: 'plain' }, ins.topSellers.map((t) => el('li', {}, el('b', {}, t.name), ` (${t.title || 'insider'}) – prodal za ${fmtBig(t.value)}`)))
      : null,
    el('p', { class: 'muted' }, 'Prodeje vedení jsou běžné (často plánované dopředu, daně z odměn). Nákupy insiderů za vlastní peníze jsou vzácnější signál.'),
  )
}

function macroSection(mc) {
  const item = (label, v, hint) => fact(label, rate(v.value), [v.before != null ? `před 6 měs. ${rate(v.before)} (${signed(v.value - v.before)})` : null, hint].filter(Boolean).join(' · '))
  return section(
    'Makro',
    false,
    facts(
      item('Úrok Fedu', mc.fedFunds),
      item('10letý dluhopis USA', mc.rate10y),
      item('Spread 10Y − 2Y', mc.spread10y2y, mc.spread10y2y.value < 0 ? 'inverzní křivka' : null),
      item('Nezaměstnanost', mc.unemployment),
      fact('Inflace (CPI r/r)', rate(mc.inflation.value), `za ${fmtMonth(mc.inflation.asOf)}`),
    ),
  )
}

function table(head, rows, rowClass = () => '') {
  return el(
    'div',
    { class: 'table-wrap' },
    el(
      'table',
      {},
      el('thead', {}, el('tr', {}, head.map((h) => el('th', {}, h)))),
      el('tbody', {}, rows.map((cells, i) => el('tr', { class: rowClass(i) }, cells.map((c) => el('td', { class: c?.cls ?? '' }, c?.text ?? c))))),
    ),
  )
}

function peersPane(s) {
  const rows = [s.metrics, ...s.peerMetrics]
  const name = (r) => (r.ticker === '^GSPC' ? 'S&P 500' : r.ticker)
  return el(
    'div',
    {},
    table(
      ['', '1R', 'P/E', 'P/S', 'EV/T', 'Růst', 'Hrubá m.', 'Provoz. m.', 'Beta'],
      rows.map((r) => [
        name(r),
        { text: fmtPct(r.change1y), cls: r.change1y >= 0 ? 'up' : 'down' },
        r.ticker === '^GSPC' ? '–' : pe(r),
        fmtX(r.ps),
        fmtX(r.evSales),
        fmtPct(r.revenueTtmGrowth),
        fmtPct(r.grossMargin, false),
        fmtPct(r.operatingMargin, false),
        r.beta != null ? r.beta.toLocaleString('cs-CZ', { maximumFractionDigits: 2 }) : '–',
      ]),
      (i) => (i === 0 ? 'me' : ''),
    ),
    el('p', { class: 'muted' }, 'Hodnoty k datu rozhodnutí. Růst = tržby za posl. 12 měsíců meziročně, EV/T = EV / tržby.'),
  )
}

function extendedPane(s, model) {
  return el(
    'div',
    {},
    s.articles.map((a, i) => el('details', { class: 'article', open: i === 0 }, el('summary', {}, a.title), el('p', {}, a.body))),
    model.pastEarnings.length
      ? el(
          'div',
          { class: 'links' },
          el('h4', {}, 'Originální tiskové zprávy (SEC EDGAR)'),
          model.pastEarnings
            .slice(-4)
            .reverse()
            .map((e) => el('a', { href: e.url, target: '_blank' }, `Výsledky ${fmtDate(e.date)}`)),
        )
      : null,
  )
}
