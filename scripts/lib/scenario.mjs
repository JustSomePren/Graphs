import { DAY, isoDay, toTs } from './fetch.mjs'
import { hourly, prices, priceStats } from './prices.mjs'
import { earningsDates, fundamentals, insiders, withValuation } from './edgar.mjs'
import { macro } from './macro.mjs'
import { pressRelease } from './press.mjs'

const round = (x) => (typeof x === 'number' ? Math.round(x * 1e4) / 1e4 : x)
export const roundAll = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => round(v)))

async function company(ticker, date, market) {
  const px = await prices(ticker, date, date)
  if (!px) return null
  const stats = priceStats(px.rows, date, market)
  if (ticker.startsWith('^')) return { ticker, ...stats }
  const f = await fundamentals(ticker, date, px.splits)
  return { ticker, ...stats, ...withValuation(stats.price, f) }
}

// Den, kdy trh na výsledky zareagoval (po zavření burzy = další obchodní den)
const reactionIndex = (rows, e) => rows.findIndex((r) => (e.afterClose ? r.date > e.date : r.date >= e.date))

// Pro každé výsledky: reakce akcie a čísla z výkazu, jak je trh tehdy viděl
async function earningsHistory(s, rows, splits, list) {
  const out = []
  for (const e of list) {
    const i = reactionIndex(rows, e)
    const item = { ...e, reactionDate: rows[i]?.date ?? null, reaction: i > 0 ? rows[i].close / rows[i - 1].close - 1 : null }
    if (!e.preliminary && e.report && e.report <= s.decisionDate) {
      const f = await fundamentals(s.ticker, e.report, splits, s.decisionDate)
      const price = rows.findLast((r) => r.date <= e.report)?.close
      const v = withValuation(price, f)
      const q = v.quarterly?.at(-1)
      if (q) item.snapshot = { quarterEnd: q.end, revenue: q.revenue, growth: q.growth, operatingMargin: q.operatingMargin, eps: q.eps, pe: v.pe, ps: v.ps }
    }
    delete item.report
    out.push(item)
  }
  return out
}

// compact: starší historie se zředí na každý 3. den a ceny zaokrouhlí – kvůli velikosti dat v aplikaci
export async function buildScenario(s, { withInsiders = true, withPeers = true, compact = false } = {}) {
  const px = await prices(s.ticker, s.historyStart, s.endDate, s.decisionDate)
  if (!px) throw new Error('chybí ceny ' + s.ticker)
  const daily = px.rows.filter((r) => r.date >= s.historyStart && r.date <= s.endDate)

  // Zředění kvůli velikosti dat: starší historie a u dlouhých horizontů i vzdálenější budoucnost na každý 3. den
  const recent = isoDay(toTs(s.decisionDate) - 182 * DAY)
  const nearFuture = isoDay(toTs(s.decisionDate) + 45 * DAY)
  const long = (toTs(s.endDate) - toTs(s.decisionDate)) / DAY > 120
  const keep = (r, i) => (r.date >= recent && (!long || r.date <= nearFuture)) || i % 3 === 0 || r.date === s.decisionDate
  const thin = (rows) => (compact ? rows.filter(keep) : rows)
  const precise = (x) => (compact ? Number(x.toPrecision(5)) : x)
  let series = thin(daily).map((r) => [r.date, precise(r.close)])
  // S&P 500 pro srovnání v grafu (stejné body jako akcie)
  const index = new Map((await prices('^GSPC', s.historyStart, s.endDate)).rows.map((r) => [r.date, r.close]))
  const marketSeries = series.filter(([d]) => index.has(d)).map(([d]) => [d, Number(index.get(d).toPrecision(5))])
  if (s.intraday) {
    const from = isoDay(toTs(s.decisionDate) - 21 * DAY)
    const bars = await hourly(s.ticker, from, s.endDate, s.decisionDate)
    series = [...series.filter(([d]) => d < bars[0].date.slice(0, 10)), ...bars.map((b) => [b.date, b.close])]
  }

  const market = (await prices('^GSPC', s.decisionDate, s.decisionDate)).rows
  const metrics = await company(s.ticker, s.decisionDate, market)
  const peers = []
  for (const p of withPeers ? [...(s.peers ?? []), '^GSPC'] : ['^GSPC']) {
    const c = await company(p, s.decisionDate, market).catch((e) => console.warn('  přeskakuji', p, e.message))
    if (c) peers.push(c)
  }

  const releases = metrics.cik ? await earningsDates(metrics.cik, s.historyStart, s.endDate) : []
  const earnings = await earningsHistory(s, daily, px.splits, releases)

  // Poslední tisková zpráva, kterou trh už znal
  const lastKnown = earnings.filter((e) => !e.preliminary && e.reactionDate && e.reactionDate <= s.decisionDate).at(-1)
  const press = lastKnown ? await pressRelease(lastKnown.url).catch(() => null) : null

  return roundAll({
    ...s,
    peers: undefined,
    series,
    sampled: compact && long ? true : undefined,
    market: marketSeries,
    metrics,
    peerMetrics: peers.map(({ quarterly, cik, ...rest }) => rest),
    earnings,
    press: press && { date: lastKnown.date, ...press },
    insiders: withInsiders && metrics.cik ? await insiders(metrics.cik, s.decisionDate) : null,
    macro: await macro(s.decisionDate),
  })
}
