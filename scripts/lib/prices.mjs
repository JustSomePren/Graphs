import { DAY, getJson, isoDay, toTs } from './fetch.mjs'

// basis = datum, ke kterému chceme ceny vidět (bez pozdějších splitů)
export async function prices(ticker, from, to, basis = to) {
  const p1 = Math.floor((toTs(from) - 400 * DAY) / 1000)
  // Konec až do dneška, jinak Yahoo nevrátí pozdější splity
  const p2 = Math.floor(Date.now() / 1000)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${p1}&period2=${p2}&interval=1d&events=split`
  const coversStart = (j) => j.chart?.result?.[0]?.timestamp?.[0] * 1000 < toTs(from) + 10 * DAY
  const json = await getJson(url, `px-${ticker}-${from}-${to}.json`, coversStart)
  const r = json?.chart?.result?.[0]
  if (!r?.timestamp) return null
  const { close, volume } = r.indicators.quote[0]
  const splits = Object.values(r.events?.splits ?? {}).map((s) => ({
    date: isoDay(s.date * 1000),
    ratio: s.numerator / s.denominator,
  }))
  const factor = splitFactor(splits, basis)
  const rows = r.timestamp
    .map((t, i) => ({ date: isoDay(t * 1000), close: close[i] * factor, dollarVolume: close[i] * volume[i] }))
    .filter((row) => row.close && row.date <= isoDay(toTs(to) + 5 * DAY))
  return { rows, splits }
}

// Ceny z Yahoo jsou upravené o všechny pozdější splity – vracíme je do stavu k datu rozhodnutí
export const splitFactor = (splits, after, upTo = '9999') =>
  splits.filter((s) => s.date > after && s.date <= upTo).reduce((f, s) => f * s.ratio, 1)

const logReturns = (closes) => closes.slice(1).map((c, i) => Math.log(c / closes[i]))
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length
const average = (rows, n) => mean(rows.slice(-n).map((r) => r.close))

export function priceStats(rows, date, market) {
  const known = rows.filter((r) => r.date <= date)
  const last = known.at(-1)
  const back = (days) => known.findLast((r) => toTs(r.date) <= toTs(date) - days * DAY)?.close
  const change = (days) => (back(days) ? last.close / back(days) - 1 : null)
  const year = known.filter((r) => toTs(r.date) > toTs(date) - 365 * DAY)
  const yearCloses = year.map((r) => r.close)
  const returns = logReturns(known.slice(-61).map((r) => r.close))

  return {
    price: last.close,
    change1m: change(30),
    change6m: change(182),
    change1y: change(365),
    high52: Math.max(...yearCloses),
    low52: Math.min(...yearCloses),
    fromHigh: last.close / Math.max(...yearCloses) - 1,
    vsMa50: known.length >= 50 ? last.close / average(known, 50) - 1 : null,
    vsMa200: known.length >= 200 ? last.close / average(known, 200) - 1 : null,
    volatility: Math.sqrt(mean(returns.map((x) => x * x)) * 252),
    dollarVolume: mean(known.slice(-30).map((r) => r.dollarVolume || 0)),
    beta: market ? beta(year, market) : null,
  }
}

// Beta za poslední rok vůči S&P 500 z denních výnosů
function beta(rows, market) {
  const marketClose = new Map(market.map((r) => [r.date, r.close]))
  const pairs = rows.filter((r) => marketClose.has(r.date))
  if (pairs.length < 100) return null
  const a = logReturns(pairs.map((r) => r.close))
  const m = logReturns(pairs.map((r) => marketClose.get(r.date)))
  const ma = mean(a)
  const mm = mean(m)
  const cov = mean(a.map((x, i) => (x - ma) * (m[i] - mm)))
  const varM = mean(m.map((x) => (x - mm) ** 2))
  return cov / varM
}
