import { DAY, getText, toTs } from './fetch.mjs'

// lag = kolik dní po konci období se údaj zveřejňuje (CPI a nezaměstnanost vychází až další měsíc)
const SERIES = {
  rate10y: { id: 'DGS10', lag: 1 },
  fedFunds: { id: 'DFF', lag: 1 },
  spread10y2y: { id: 'T10Y2Y', lag: 1 },
  cpi: { id: 'CPIAUCSL', lag: 45 },
  unemployment: { id: 'UNRATE', lag: 35 },
}

async function series(id) {
  const csv = await getText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, `fred-${id}.csv`)
  return csv
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => line.split(','))
    .filter(([, v]) => v !== '.' && v !== '')
    .map(([date, v]) => ({ date, value: Number(v) }))
}

export const knownAt = (rows, date, lag) => rows.findLast((r) => toTs(r.date) + lag * DAY <= toTs(date))

export async function macro(date) {
  const out = {}
  const sixMonthsAgo = new Date(toTs(date) - 182 * DAY).toISOString().slice(0, 10)
  for (const [key, { id, lag }] of Object.entries(SERIES)) {
    const rows = await series(id)
    const now = knownAt(rows, date, lag)
    const before = knownAt(rows, sixMonthsAgo, lag)
    out[key] = { value: now?.value ?? null, before: before?.value ?? null, asOf: now?.date ?? null }
  }
  // Inflace = meziroční změna indexu CPI
  const cpi = await series('CPIAUCSL')
  const latest = knownAt(cpi, date, SERIES.cpi.lag)
  const yearAgo = cpi.findLast((r) => toTs(r.date) <= toTs(latest.date) - 360 * DAY)
  out.inflation = { value: (latest.value / yearAgo.value - 1) * 100, asOf: latest.date }
  delete out.cpi
  return out
}
