// Stáhne ceny a fundamenty (SEC EDGAR) a vytvoří src/data/scenarios.json
import fs from 'node:fs/promises'
import path from 'node:path'
import { scenarios } from '../scenarios/scenarios.mjs'

const UA = 'graphs-game-data-script/1.0 contact@example.com'
const CACHE = '.cache'
const DAY = 86400000

const toTs = (date) => Date.parse(date + 'T00:00:00Z')
const isoDay = (ts) => new Date(ts).toISOString().slice(0, 10)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url, cacheName, valid = () => true) {
  const file = path.join(CACHE, cacheName)
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {}
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    const json = res.ok ? await res.json() : null
    if (json && valid(json)) {
      await fs.mkdir(CACHE, { recursive: true })
      await fs.writeFile(file, JSON.stringify(json))
      await sleep(200)
      return json
    }
    if (res.status === 404) return null
    await sleep(2000 * attempt)
  }
  throw new Error('Nepodařilo se stáhnout ' + url)
}

// --- ceny ---

async function prices(ticker, from, to) {
  const p1 = Math.floor((toTs(from) - 400 * DAY) / 1000)
  // Konec až do dneška, jinak Yahoo nevrátí pozdější splity
  const p2 = Math.floor(Date.now() / 1000)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${p1}&period2=${p2}&interval=1d&events=split`
  const coversStart = (j) => j.chart?.result?.[0]?.timestamp?.[0] * 1000 < toTs(from) + 10 * DAY
  const json = await getJson(url, `px-${ticker}-${from}-${to}.json`, coversStart)
  const r = json?.chart?.result?.[0]
  if (!r?.timestamp) return null
  const close = r.indicators.quote[0].close
  const splits = Object.values(r.events?.splits ?? {}).map((s) => ({
    date: isoDay(s.date * 1000),
    ratio: s.numerator / s.denominator,
  }))
  const rows = r.timestamp
    .map((t, i) => ({ date: isoDay(t * 1000), close: close[i] }))
    .filter((row) => row.close != null && row.date <= isoDay(toTs(to) + 5 * DAY))
  return { rows, splits }
}

// Ceny jsou upravené o všechny budoucí splity – vrátíme je do stavu k datu rozhodnutí
const splitFactor = (splits, after, upTo = '9999') =>
  splits.filter((s) => s.date > after && s.date <= upTo).reduce((f, s) => f * s.ratio, 1)

// --- SEC EDGAR ---

let tickerMap
async function cikFor(ticker) {
  tickerMap ??= Object.values(await getJson('https://www.sec.gov/files/company_tickers.json', 'tickers.json'))
  const hit = tickerMap.find((t) => t.ticker === ticker.replace('.', '-'))
  return hit ? String(hit.cik_str).padStart(10, '0') : null
}

const REVENUE = [
  'Revenues',
  'RevenueFromContractWithCustomerExcludingAssessedTax',
  'SalesRevenueNet',
  'RevenueFromContractWithCustomerIncludingAssessedTax',
]

// scale(f) umožní přepočítat hodnotu (např. EPS po splitu) na bázi k datu rozhodnutí
function factsKnownAt(facts, concepts, unit, date, scale = () => 1) {
  const list = concepts.flatMap((c) => facts?.[c]?.units?.[unit] ?? [])
  const byPeriod = new Map()
  for (const f of list) {
    if (f.filed > date || !/^10-[QK]/.test(f.form)) continue
    const key = (f.start ?? '') + '|' + f.end
    const prev = byPeriod.get(key)
    if (!prev || prev.filed < f.filed) byPeriod.set(key, f)
  }
  return [...byPeriod.values()].map((f) => ({ ...f, val: f.val * scale(f) }))
}

const durationDays = (f) => (toTs(f.end) - toTs(f.start)) / DAY

// Vrátí čtvrtletní hodnoty (Q4 dopočítá jako rok minus 9 měsíců)
function quarters(facts) {
  const q = new Map()
  for (const f of facts) if (f.start && durationDays(f) > 75 && durationDays(f) < 105) q.set(f.end, f)
  for (const fy of facts) {
    if (!fy.start || durationDays(fy) < 350 || durationDays(fy) > 380 || q.has(fy.end)) continue
    const nine = facts.find((f) => f.start === fy.start && durationDays(f) > 260 && durationDays(f) < 290)
    if (nine) q.set(fy.end, { ...fy, start: nine.end, val: fy.val - nine.val })
  }
  return [...q.values()].sort((a, b) => a.end.localeCompare(b.end))
}

const sameQuarterYearAgo = (qs, last) =>
  qs.find((x) => Math.abs(toTs(x.end) - (toTs(last.end) - 365 * DAY)) < 20 * DAY)

function ttm(qs) {
  if (qs.length < 4) return null
  const last4 = qs.slice(-4)
  const span = (toTs(last4[3].end) - toTs(last4[0].end)) / DAY
  if (span > 300) return null
  return { value: last4.reduce((s, x) => s + x.val, 0), end: last4[3].end, filed: last4[3].filed }
}

async function fundamentals(ticker, date, splits) {
  const cik = await cikFor(ticker)
  if (!cik) return null
  const json = await getJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, `facts-${cik}.json`)
  const g = json?.facts?.['us-gaap']
  if (!g) return null

  const revQ = quarters(factsKnownAt(g, REVENUE, 'USD', date))
  const niQ = quarters(factsKnownAt(g, ['NetIncomeLoss'], 'USD', date))
  const splitsSince = (f) => splitFactor(splits, f.filed, date)
  const epsQ = quarters(factsKnownAt(g, ['EarningsPerShareDiluted'], 'USD/shares', date, (f) => 1 / splitsSince(f)))
  const lastShares = factsKnownAt(g, ['WeightedAverageNumberOfDilutedSharesOutstanding'], 'shares', date, splitsSince)
    .filter((f) => f.start && durationDays(f) < 105)
    .sort((a, b) => a.end.localeCompare(b.end))
    .at(-1)
  const cash = factsKnownAt(g, ['CashAndCashEquivalentsAtCarryingValue'], 'USD', date)
    .filter((f) => !f.start)
    .sort((a, b) => a.end.localeCompare(b.end))
    .at(-1)

  const lastRev = revQ.at(-1)
  const prevRev = lastRev && sameQuarterYearAgo(revQ, lastRev)
  const revTtm = ttm(revQ)
  const revTtmPrev = revTtm && ttm(revQ.filter((x) => toTs(x.end) <= toTs(revTtm.end) - 330 * DAY))
  const epsTtm = ttm(epsQ)?.value ?? null
  const netIncomeTtm = ttm(niQ)?.value ?? null
  // Některé firmy (např. Alphabet) vykazují akcie jen po třídách – dopočet ze zisku a EPS
  const shares = lastShares?.val ?? (epsTtm && netIncomeTtm ? netIncomeTtm / epsTtm : null)

  return {
    cik,
    lastQuarterEnd: lastRev?.end ?? null,
    lastQuarterRevenue: lastRev?.val ?? null,
    lastQuarterGrowth: prevRev ? lastRev.val / prevRev.val - 1 : null,
    revenueTtm: revTtm?.value ?? null,
    revenueTtmGrowth: revTtmPrev ? revTtm.value / revTtmPrev.value - 1 : null,
    netIncomeTtm,
    epsTtm,
    shares,
    cash: cash?.val ?? null,
    quarterlyRevenue: revQ.slice(-8).map((x) => ({ end: x.end, value: x.val })),
  }
}

async function earningsDates(cik, from, to) {
  const main = await getJson(`https://data.sec.gov/submissions/CIK${cik}.json`, `subs-${cik}.json`)
  const pages = [main.filings.recent]
  for (const f of main.filings.files ?? []) {
    if (f.filingTo < from || f.filingFrom > to) continue
    pages.push(await getJson(`https://data.sec.gov/submissions/${f.name}`, f.name))
  }
  const out = []
  for (const r of pages) {
    r.form.forEach((form, i) => {
      const date = r.filingDate[i]
      if (form !== '8-K' || !r.items[i]?.includes('2.02') || date < from || date > to) return
      const hour = Number(r.acceptanceDateTime[i].slice(11, 13))
      const acc = r.accessionNumber[i].replaceAll('-', '')
      out.push({
        date,
        afterClose: hour >= 16,
        url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc}/`,
      })
    })
  }
  return [...new Map(out.map((e) => [e.date, e])).values()].sort((a, b) => a.date.localeCompare(b.date))
}

// --- metriky k datu rozhodnutí ---

function priceStats(rows, date) {
  const known = rows.filter((r) => r.date <= date)
  const last = known.at(-1)
  const back = (days) => known.findLast((r) => toTs(r.date) <= toTs(date) - days * DAY)?.close
  const year = known.filter((r) => toTs(r.date) > toTs(date) - 365 * DAY).map((r) => r.close)
  const change = (days) => (back(days) ? last.close / back(days) - 1 : null)
  return {
    price: last.close,
    change1m: change(30),
    change6m: change(182),
    change1y: change(365),
    high52: Math.max(...year),
    low52: Math.min(...year),
  }
}

async function company(ticker, date) {
  const px = await prices(ticker, date, date)
  if (!px) return null
  const factor = splitFactor(px.splits, date)
  const rows = px.rows.map((r) => ({ ...r, close: r.close * factor }))
  const stats = priceStats(rows, date)
  if (ticker.startsWith('^')) return { ticker, ...stats }
  const f = await fundamentals(ticker, date, px.splits)
  return { ticker, ...stats, ...withValuation(stats.price, f) }
}

function withValuation(price, f) {
  if (!f) return {}
  const marketCap = f.shares ? price * f.shares : null
  return {
    ...f,
    marketCap,
    pe: f.epsTtm > 0 ? price / f.epsTtm : null,
    ps: marketCap && f.revenueTtm ? marketCap / f.revenueTtm : null,
    netMargin: f.revenueTtm && f.netIncomeTtm != null ? f.netIncomeTtm / f.revenueTtm : null,
  }
}

const round = (x) => (typeof x === 'number' ? Math.round(x * 1e4) / 1e4 : x)

async function build() {
  const out = []
  for (const s of scenarios) {
    console.log('→', s.id)
    const px = await prices(s.ticker, s.historyStart, s.endDate)
    const factor = splitFactor(px.splits, s.decisionDate)
    const series = px.rows
      .filter((r) => r.date >= s.historyStart && r.date <= s.endDate)
      .map((r) => [r.date, round(r.close * factor)])

    const main = await company(s.ticker, s.decisionDate)
    const peers = []
    for (const p of [...s.peers, '^GSPC']) {
      const c = await company(p, s.decisionDate).catch((e) => console.warn('  přeskakuji', p, e.message))
      if (c) peers.push(c)
    }
    const earnings = main.cik ? await earningsDates(main.cik, s.historyStart, s.endDate) : []

    out.push({
      ...s,
      peers: undefined,
      series,
      metrics: main,
      peerMetrics: peers.map(({ quarterlyRevenue, cik, ...rest }) => rest),
      earnings,
    })
  }
  await fs.mkdir('src/data', { recursive: true })
  await fs.writeFile('src/data/scenarios.json', JSON.stringify(out, (k, v) => round(v)))
  console.log('Hotovo:', out.length, 'scénářů')
}

build()
