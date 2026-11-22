import { DAY, getJson, getText, toTs } from './fetch.mjs'
import { splitFactor } from './prices.mjs'

let tickerMap
export async function cikFor(ticker) {
  tickerMap ??= Object.values(await getJson('https://www.sec.gov/files/company_tickers.json', 'tickers.json'))
  const hit = tickerMap.find((t) => t.ticker === ticker.replace('.', '-'))
  return hit ? String(hit.cik_str).padStart(10, '0') : null
}

const C = {
  revenue: ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet', 'RevenueFromContractWithCustomerIncludingAssessedTax'],
  costOfRevenue: ['CostOfRevenue', 'CostOfGoodsAndServicesSold', 'CostOfGoodsSold'],
  grossProfit: ['GrossProfit'],
  operatingIncome: ['OperatingIncomeLoss'],
  netIncome: ['NetIncomeLoss'],
  rnd: ['ResearchAndDevelopmentExpense'],
  sbc: ['ShareBasedCompensation', 'AllocatedShareBasedCompensationExpense'],
  operatingCashFlow: ['NetCashProvidedByUsedInOperatingActivities'],
  capex: ['PaymentsToAcquirePropertyPlantAndEquipment', 'PaymentsToAcquireProductiveAssets'],
  buybacks: ['PaymentsForRepurchaseOfCommonStock'],
  dividends: ['PaymentsOfDividends', 'PaymentsOfDividendsCommonStock'],
  cash: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'],
  investments: ['MarketableSecuritiesCurrent', 'ShortTermInvestments', 'AvailableForSaleSecuritiesDebtSecuritiesCurrent', 'AvailableForSaleSecuritiesCurrent'],
  debt: ['LongTermDebt', 'LongTermDebtNoncurrent', 'ConvertibleNotesPayable', 'ConvertibleSeniorNotesNoncurrent'],
  equity: ['StockholdersEquity'],
  inventory: ['InventoryNet'],
}

// Fakta, která byla veřejně známá k danému datu (podaná v 10-Q/10-K do toho dne)
// scale(f) umožní přepočítat hodnotu (např. EPS po splitu) na bázi k datu rozhodnutí
function factsKnownAt(g, concepts, unit, date, scale = () => 1) {
  const byPeriod = new Map()
  for (const concept of concepts) {
    for (const f of g?.[concept]?.units?.[unit] ?? []) {
      if (f.filed > date || !/^10-[QK]/.test(f.form)) continue
      const key = (f.start ?? '') + '|' + f.end
      const prev = byPeriod.get(key)
      // Dřív uvedený koncept má přednost, novější podání stejného konceptu přepíše starší
      if (!prev || (prev.concept === concept && prev.filed < f.filed)) byPeriod.set(key, { ...f, concept })
    }
  }
  return [...byPeriod.values()].map((f) => ({ ...f, val: f.val * scale(f) }))
}

const durationDays = (f) => (toTs(f.end) - toTs(f.start)) / DAY
const isQuarter = (days) => days > 75 && days < 105

// Čtvrtletní hodnoty. Cash flow firmy vykazují jen kumulativně (3, 6, 9, 12 měsíců),
// proto se kvartál dopočítá jako rozdíl dvou po sobě jdoucích kumulativních hodnot.
function quarters(facts) {
  const q = new Map()
  const flows = facts.filter((f) => f.start)
  for (const f of flows) if (isQuarter(durationDays(f))) q.set(f.end, f)
  for (const f of flows) {
    if (q.has(f.end)) continue
    const prev = flows
      .filter((p) => p.start === f.start && p.end < f.end)
      .sort((a, b) => b.end.localeCompare(a.end))[0]
    if (prev && isQuarter((toTs(f.end) - toTs(prev.end)) / DAY)) q.set(f.end, { ...f, start: prev.end, val: f.val - prev.val })
  }
  return [...q.values()].sort((a, b) => a.end.localeCompare(b.end))
}

const latestInstant = (facts) => facts.filter((f) => !f.start).sort((a, b) => a.end.localeCompare(b.end)).at(-1)

const nearEnd = (qs, end) => qs.find((x) => Math.abs(toTs(x.end) - toTs(end)) < 20 * DAY)
const yearBefore = (end) => new Date(toTs(end) - 365 * DAY).toISOString().slice(0, 10)

function ttm(qs, end = qs.at(-1)?.end) {
  const upTo = qs.filter((x) => end && toTs(x.end) <= toTs(end) + 20 * DAY)
  if (upTo.length < 4) return null
  const last4 = upTo.slice(-4)
  if ((toTs(last4[3].end) - toTs(last4[0].end)) / DAY > 300) return null
  if (Math.abs(toTs(last4[3].end) - toTs(end)) > 20 * DAY) return null
  return last4.reduce((s, x) => s + x.val, 0)
}

const growth = (now, before) => (now != null && before ? now / Math.abs(before) - 1 : null)
const ratio = (a, b) => (a != null && b ? a / b : null)

export async function fundamentals(ticker, date, splits) {
  const cik = await cikFor(ticker)
  if (!cik) return null
  const json = await getJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, `facts-${cik}.json`)
  const g = json?.facts?.['us-gaap']
  if (!g) return null

  const splitsSince = (f) => splitFactor(splits, f.filed, date)
  const flow = (key) => quarters(factsKnownAt(g, C[key], 'USD', date))
  const instant = (key) => latestInstant(factsKnownAt(g, C[key], 'USD', date))

  const rev = flow('revenue')
  const end = rev.at(-1)?.end
  if (!end) return { cik }

  let gross = flow('grossProfit')
  if (!nearEnd(gross, end)) {
    const cost = flow('costOfRevenue')
    gross = rev.map((r) => ({ ...r, val: r.val - (nearEnd(cost, r.end)?.val ?? NaN) })).filter((r) => isFinite(r.val))
  }
  const op = flow('operatingIncome')
  const ni = flow('netIncome')
  const eps = quarters(factsKnownAt(g, ['EarningsPerShareDiluted'], 'USD/shares', date, (f) => 1 / splitsSince(f)))
  const shareFacts = factsKnownAt(g, ['WeightedAverageNumberOfDilutedSharesOutstanding'], 'shares', date, splitsSince)
    .filter((f) => f.start && durationDays(f) < 105)
    .sort((a, b) => a.end.localeCompare(b.end))
  const ocf = flow('operatingCashFlow')
  const capex = flow('capex')

  const t = (qs) => ttm(qs, end)
  const tPrev = (qs) => ttm(qs, yearBefore(end))
  const revenueTtm = t(rev)
  const epsTtm = t(eps)
  const netIncomeTtm = t(ni)
  const fcfTtm = t(ocf) != null && t(capex) != null ? t(ocf) - t(capex) : null
  const cash = instant('cash')?.val ?? null
  const investments = instant('investments')
  const sharesNow = shareFacts.at(-1)
  const sharesYearAgo = sharesNow && nearEnd(shareFacts, yearBefore(sharesNow.end))
  const inventory = factsKnownAt(g, C.inventory, 'USD', date).filter((f) => !f.start)

  // Některé firmy (např. Alphabet) vykazují akcie jen po třídách – dopočet ze zisku a EPS
  const shares = sharesNow?.val ?? (epsTtm && netIncomeTtm ? netIncomeTtm / epsTtm : null)

  const quarterly = rev.slice(-8).map((r) => {
    const yearAgo = nearEnd(rev, yearBefore(r.end))
    return {
      end: r.end,
      revenue: r.val,
      growth: growth(r.val, yearAgo?.val),
      grossMargin: ratio(nearEnd(gross, r.end)?.val, r.val),
      operatingMargin: ratio(nearEnd(op, r.end)?.val, r.val),
      eps: nearEnd(eps, r.end)?.val ?? null,
    }
  })

  return {
    cik,
    lastQuarterEnd: end,
    lastQuarterRevenue: rev.at(-1).val,
    lastQuarterGrowth: quarterly.at(-1).growth,
    lastQuarterQoq: growth(rev.at(-1).val, rev.at(-2)?.val),
    revenueTtm,
    revenueTtmGrowth: growth(revenueTtm, tPrev(rev)),
    epsTtm,
    epsTtmGrowth: epsTtm > 0 && tPrev(eps) > 0 ? growth(epsTtm, tPrev(eps)) : null,
    netIncomeTtm,
    grossMargin: ratio(t(gross), revenueTtm),
    operatingMargin: ratio(t(op), revenueTtm),
    netMargin: ratio(netIncomeTtm, revenueTtm),
    rndShare: ratio(t(flow('rnd')), revenueTtm),
    sbcShare: ratio(t(flow('sbc')), revenueTtm),
    fcfTtm,
    fcfMargin: ratio(fcfTtm, revenueTtm),
    buybacksTtm: t(flow('buybacks')),
    dividendsTtm: t(flow('dividends')),
    cash,
    cashAndInvestments: cash != null ? cash + (investments?.end === instant('cash')?.end ? investments.val : 0) : null,
    debt: instant('debt')?.val ?? 0,
    equity: instant('equity')?.val ?? null,
    inventoryGrowth: inventory.length ? growth(latestInstant(inventory).val, nearEnd(inventory, yearBefore(latestInstant(inventory).end))?.val) : null,
    shares,
    sharesGrowth: sharesYearAgo ? sharesNow.val / sharesYearAgo.val - 1 : null,
    quarterly,
  }
}

export function withValuation(price, f) {
  if (!f?.revenueTtm) return f ?? {}
  const marketCap = f.shares ? price * f.shares : null
  const ev = marketCap != null ? marketCap + (f.debt ?? 0) - (f.cashAndInvestments ?? 0) : null
  return {
    ...f,
    marketCap,
    ev,
    pe: f.epsTtm > 0 ? price / f.epsTtm : null,
    ps: ratio(marketCap, f.revenueTtm),
    evSales: ratio(ev, f.revenueTtm),
    pb: f.equity > 0 ? ratio(marketCap, f.equity) : null,
    fcfYield: ratio(f.fcfTtm, marketCap),
    roe: f.equity > 0 ? ratio(f.netIncomeTtm, f.equity) : null,
  }
}

// --- podání (8-K, Form 4) ---

async function filings(cik, from, to) {
  const main = await getJson(`https://data.sec.gov/submissions/CIK${cik}.json`, `subs-${cik}.json`)
  const pages = [main.filings.recent]
  for (const f of main.filings.files ?? []) {
    if (f.filingTo < from || f.filingFrom > to) continue
    pages.push(await getJson(`https://data.sec.gov/submissions/${f.name}`, f.name))
  }
  return pages.flatMap((r) =>
    r.form
      .map((form, i) => ({
        form,
        date: r.filingDate[i],
        time: r.acceptanceDateTime[i],
        items: r.items[i],
        accession: r.accessionNumber[i].replaceAll('-', ''),
        document: r.primaryDocument[i],
      }))
      .filter((f) => f.date >= from && f.date <= to),
  )
}

const folder = (cik, f) => `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${f.accession}/`

export async function earningsDates(cik, from, to) {
  const list = (await filings(cik, from, to))
    .filter((f) => f.form === '8-K' && f.items?.includes('2.02'))
    .map((f) => ({ date: f.date, afterClose: Number(f.time.slice(11, 13)) >= 16, url: folder(cik, f) }))
  return [...new Map(list.map((e) => [e.date, e])).values()].sort((a, b) => a.date.localeCompare(b.date))
}

const tag = (xml, name) => xml.match(new RegExp(`<${name}>\\s*(?:<value>)?([^<]*)`))?.[1]?.trim()

// Nákupy a prodeje insiderů na volném trhu (Form 4, kódy P a S) za 6 měsíců před datem
export async function insiders(cik, date) {
  const from = new Date(toTs(date) - 182 * DAY).toISOString().slice(0, 10)
  const forms = (await filings(cik, from, date)).filter((f) => f.form === '4')
  const trades = []
  for (const f of forms) {
    const doc = f.document.split('/').at(-1)
    const xml = await getText(folder(cik, f) + doc, `f4-${f.accession}.xml`)
    if (!xml) continue
    const name = tag(xml, 'rptOwnerName')
    const title = tag(xml, 'officerTitle') || (tag(xml, 'isDirector') === '1' || tag(xml, 'isDirector') === 'true' ? 'Director' : '')
    for (const t of xml.split('<nonDerivativeTransaction>').slice(1)) {
      const code = tag(t, 'transactionCode')
      if (code !== 'P' && code !== 'S') continue
      const value = Number(tag(t, 'transactionShares')) * Number(tag(t, 'transactionPricePerShare'))
      if (value > 0) trades.push({ name, title, buy: code === 'P', value })
    }
  }

  const sum = (list) => list.reduce((s, t) => s + t.value, 0)
  const people = (list) => new Set(list.map((t) => t.name)).size
  const buys = trades.filter((t) => t.buy)
  const sells = trades.filter((t) => !t.buy)
  const bySeller = Object.values(
    sells.reduce((acc, t) => {
      acc[t.name] ??= { name: t.name, title: t.title, value: 0 }
      acc[t.name].value += t.value
      return acc
    }, {}),
  ).sort((a, b) => b.value - a.value)

  return {
    buyValue: sum(buys),
    buyPeople: people(buys),
    sellValue: sum(sells),
    sellPeople: people(sells),
    topSellers: bySeller.slice(0, 3),
    filings: forms.length,
  }
}
