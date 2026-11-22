// Stáhne ceny, fundamenty (SEC EDGAR) a makro data (FRED) a vytvoří src/data/scenarios.json
import fs from 'node:fs/promises'
import { scenarios } from '../scenarios/scenarios.mjs'
import { prices, priceStats } from './lib/prices.mjs'
import { earningsDates, fundamentals, insiders, withValuation } from './lib/edgar.mjs'
import { macro } from './lib/macro.mjs'

async function company(ticker, date, market) {
  const px = await prices(ticker, date, date)
  if (!px) return null
  const stats = priceStats(px.rows, date, market)
  if (ticker.startsWith('^')) return { ticker, ...stats }
  const f = await fundamentals(ticker, date, px.splits)
  return { ticker, ...stats, ...withValuation(stats.price, f) }
}

const round = (x) => (typeof x === 'number' ? Math.round(x * 1e4) / 1e4 : x)

async function build() {
  const out = []
  for (const s of scenarios) {
    console.log('→', s.id)
    const px = await prices(s.ticker, s.historyStart, s.endDate, s.decisionDate)
    const series = px.rows
      .filter((r) => r.date >= s.historyStart && r.date <= s.endDate)
      .map((r) => [r.date, round(r.close)])

    const market = (await prices('^GSPC', s.decisionDate, s.decisionDate)).rows
    const main = await company(s.ticker, s.decisionDate, market)
    const peers = []
    for (const p of [...s.peers, '^GSPC']) {
      const c = await company(p, s.decisionDate, market).catch((e) => console.warn('  přeskakuji', p, e.message))
      if (c) peers.push(c)
    }

    out.push({
      ...s,
      peers: undefined,
      series,
      metrics: main,
      peerMetrics: peers.map(({ quarterly, cik, ...rest }) => rest),
      earnings: main.cik ? await earningsDates(main.cik, s.historyStart, s.endDate) : [],
      insiders: main.cik ? await insiders(main.cik, s.decisionDate) : null,
      macro: await macro(s.decisionDate),
    })
  }
  await fs.mkdir('src/data', { recursive: true })
  await fs.writeFile('src/data/scenarios.json', JSON.stringify(out, (k, v) => round(v)))
  console.log('Hotovo:', out.length, 'scénářů')
}

build()
