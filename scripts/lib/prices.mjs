import { DAY, getJson, isoDay, toTs } from './fetch.mjs'

const yahoo = (ticker, p1, p2, interval) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${p1}&period2=${p2}&interval=${interval}&events=split`

// Denní ceny od `from` až do dneška (jinak Yahoo nevrátí pozdější splity)
// Tiingo (licencovaný zdroj): zapne se proměnnou TIINGO_TOKEN. Vrací stejný tvar jako Yahoo –
// ceny upravené o všechny pozdější splity.
async function loadTiingo(ticker, from) {
  const symbol = ticker === '^GSPC' ? 'SPY' : ticker.replace('.', '-')
  const url = `https://api.tiingo.com/tiingo/daily/${symbol}/prices?startDate=${isoDay(toTs(from) - 400 * DAY)}&token=${process.env.TIINGO_TOKEN}`
  const list = await getJson(url, `tiingo-${symbol}-${from}.json`, (j) => Array.isArray(j) && j.length > 50)
  if (!list) return null
  const splits = list.filter((r) => r.splitFactor && r.splitFactor !== 1).map((r) => ({ date: r.date.slice(0, 10), ratio: r.splitFactor }))
  return {
    rows: list.map((r) => {
      const date = r.date.slice(0, 10)
      const close = r.close / splitFactor(splits, date)
      return { date, close, dollarVolume: r.close * r.volume }
    }),
    splits,
  }
}

// Všechno od roku 2014 se stahuje jedním dotazem na firmu, starší data zvlášť
async function loadDaily(ticker, from) {
  if (process.env.TIINGO_TOKEN) return loadTiingo(ticker, from)
  const start = from >= '2015-01-01' ? '2015-01-01' : from >= '2010-01-01' ? '2010-01-01' : from
  const p1 = Math.floor((toTs(start) - 400 * DAY) / 1000)
  // Yahoo občas vrátí jen pár posledních dní – taková odpověď se neukládá
  const complete = (j) => j.chart?.result?.[0]?.timestamp?.length > 50
  const json = await getJson(yahoo(ticker, p1, Math.floor(Date.now() / 1000), '1d'), `px-${ticker}-${start}.json`, complete)
  const r = json?.chart?.result?.[0]
  if (!r?.timestamp) return null
  const { close, volume } = r.indicators.quote[0]
  return {
    rows: r.timestamp
      .map((t, i) => ({ date: isoDay(t * 1000), close: close[i], dollarVolume: close[i] * volume[i] }))
      .filter((row) => row.close),
    splits: Object.values(r.events?.splits ?? {}).map((s) => ({ date: isoDay(s.date * 1000), ratio: s.numerator / s.denominator })),
  }
}

export const splitFactor = (splits, after, upTo = '9999') =>
  splits.filter((s) => s.date > after && s.date <= upTo).reduce((f, s) => f * s.ratio, 1)

// Ceny z Yahoo jsou upravené o všechny pozdější splity – vracíme je do stavu k datu `basis`
export async function prices(ticker, from, to, basis = to) {
  const raw = await loadDaily(ticker, from)
  if (!raw) return null
  const factor = splitFactor(raw.splits, basis)
  const last = isoDay(toTs(to) + 5 * DAY)
  return {
    rows: raw.rows.filter((r) => r.date <= last).map((r) => ({ ...r, close: r.close * factor })),
    splits: raw.splits,
  }
}

// Hodinové ceny (Yahoo je drží jen ~2 roky zpět). Datum má tvar YYYY-MM-DDTHH:MM (UTC).
export async function hourly(ticker, from, to, basis) {
  const p1 = Math.floor(toTs(from) / 1000)
  const p2 = Math.floor((toTs(to) + 2 * DAY) / 1000)
  const json = await getJson(yahoo(ticker, p1, p2, '60m'), `px1h-${ticker}-${from}-${to}.json`, (j) => j.chart?.result?.[0]?.timestamp?.length > 10)
  const r = json.chart.result[0]
  const raw = await loadDaily(ticker, from)
  const factor = splitFactor(raw.splits, basis)
  return r.timestamp
    .map((t, i) => ({ date: new Date(t * 1000).toISOString().slice(0, 16), close: r.indicators.quote[0].close[i] * factor }))
    .filter((row) => row.close && row.date.slice(0, 10) <= to)
}

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
  return cov / mean(m.map((x) => (x - mm) ** 2))
}
