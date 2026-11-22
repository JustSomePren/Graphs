import { DAY, fmtBig, fmtNum, fmtPct, fmtPp, fmtX, toTs } from './format.js'

const median = (xs) => {
  const sorted = xs.filter((x) => x != null && isFinite(x)).sort((a, b) => a - b)
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
}
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

// Odvozené ukazatele, které nejsou přímo v datech
export function derived(s) {
  const m = s.metrics
  const q = m.quarterly ?? []
  const last = q.at(-1)
  const prev = q.at(-2)
  const yearAgo = q.at(-5)
  const past = s.earnings.filter((e) => e.reactionDate && e.reactionDate <= s.decisionDate && !e.preliminary && e.reaction != null).slice(-8)
  const days = (toTs(s.endDate) - toTs(s.decisionDate)) / DAY
  const peers = s.peerMetrics.filter((p) => p.ticker !== '^GSPC')

  return {
    dividendYield: m.dividendsTtm && m.marketCap ? m.dividendsTtm / m.marketCap : null,
    buybackYield: m.buybacksTtm && m.marketCap ? m.buybacksTtm / m.marketCap : null,
    netCash: m.cashAndInvestments != null ? m.cashAndInvestments - (m.debt ?? 0) : null,
    growthAcceleration: last?.growth != null && prev?.growth != null ? last.growth - prev.growth : null,
    marginChange: last?.operatingMargin != null && yearAgo?.operatingMargin != null ? last.operatingMargin - yearAgo.operatingMargin : null,
    historicPe: median(s.earnings.filter((e) => e.snapshot && e.reactionDate <= s.decisionDate).map((e) => e.snapshot.pe)),
    typicalReaction: past.length >= 2 ? mean(past.map((e) => Math.abs(e.reaction))) : null,
    reactionsUp: past.filter((e) => e.reaction > 0).length,
    reactionsCount: past.length,
    expectedMove: m.volatility ? m.volatility * Math.sqrt(days / 365) : null,
    rangePosition: m.high52 > m.low52 ? (m.price - m.low52) / (m.high52 - m.low52) : null,
    peerPe: median(peers.map((p) => p.pe)),
    peerPs: median(peers.map((p) => p.ps)),
    peerGrowth: median(peers.map((p) => p.revenueTtmGrowth)),
  }
}

// Fakta v kostce: jen čísla a srovnání, bez hodnocení (žádné „levná“, „riziko“ apod.)
export function signals(s) {
  const m = s.metrics
  const d = derived(s)
  const market = s.peerMetrics.find((p) => p.ticker === '^GSPC')
  const out = []
  const add = (area, text) => out.push({ area, text })

  if (m.pe) add('Valuace', `P/E ${fmtX(m.pe)}`)
  else if (m.epsTtm < 0) add('Valuace', 'Čistý zisk za 12 měsíců je záporný, P/E nelze spočítat')
  if (m.ps) add('Valuace', `P/S ${fmtX(m.ps)}`)
  if (d.peerPe) add('Valuace', `P/E konkurence (medián) ${fmtX(d.peerPe)}`)
  if (d.peerPs) add('Valuace', `P/S konkurence (medián) ${fmtX(d.peerPs)}`)
  if (d.historicPe) add('Valuace', `P/E při minulých výsledcích (medián) ${fmtX(d.historicPe)}`)

  if (m.lastQuarterGrowth != null) add('Růst', `Tržby posledního kvartálu ${fmtPct(m.lastQuarterGrowth)} r/r`)
  if (d.growthAcceleration != null) add('Růst', `Změna meziročního růstu proti předchozímu kvartálu ${fmtPp(d.growthAcceleration)}`)
  if (d.peerGrowth != null) add('Růst', `Tržby konkurence za 12 měsíců (medián) ${fmtPct(d.peerGrowth)} r/r`)
  if (m.inventoryGrowth != null) add('Růst', `Zásoby ${fmtPct(m.inventoryGrowth)} r/r`)

  if (m.netMargin != null) add('Zisk', `Čistá marže ${fmtPct(m.netMargin, false)}`)
  if (d.marginChange != null) add('Zisk', `Provozní marže posledního kvartálu ${fmtPp(d.marginChange)} r/r`)

  if (d.netCash != null) add('Rozvaha', `Hotovost a investice minus dluh ${fmtBig(d.netCash)}`)
  if (d.dividendYield) add('Akcionáři', `Dividendový výnos ${fmtPct(d.dividendYield, false)}`)
  if (d.buybackYield) add('Akcionáři', `Zpětné odkupy za 12 měsíců ${fmtPct(d.buybackYield, false)} tržní hodnoty`)
  if (m.sharesGrowth != null) add('Akcionáři', `Počet akcií ${fmtPct(m.sharesGrowth)} r/r`)

  if (m.change6m != null) add('Cena', `Za 6 měsíců ${fmtPct(m.change6m)}${market?.change6m != null ? `, S&P 500 ${fmtPct(market.change6m)}` : ''}`)
  if (m.fromHigh != null) add('Cena', `Od 52týdenního maxima ${fmtPct(m.fromHigh)}`)
  if (m.vsMa200 != null) add('Cena', `Proti průměru za 200 dní ${fmtPct(m.vsMa200)}`)
  if (m.volatility) add('Cena', `Volatilita ${fmtPct(m.volatility, false)} ročně`)

  if (d.typicalReaction != null) add('Výsledky', `Reakce na minulé výsledky v průměru ±${fmtPct(d.typicalReaction, false)} (nahoru ${d.reactionsUp}× z ${d.reactionsCount})`)

  const ins = s.insiders
  if (ins) add('Insideři', `Za 6 měsíců: nákupy ${ins.buyValue ? fmtBig(ins.buyValue) : '0'}, prodeje ${ins.sellValue ? fmtBig(ins.sellValue) : '0'}`)

  const fed = s.macro?.fedFunds
  if (fed?.before != null) add('Makro', `Úrok Fedu ${fmtNum(fed.before)} % → ${fmtNum(fed.value)} % za 6 měsíců`)
  if (s.macro?.spread10y2y?.value != null) add('Makro', `Spread 10 let − 2 roky ${fmtNum(s.macro.spread10y2y.value)} p.b.`)
  if (s.macro?.inflation?.value != null) add('Makro', `Inflace ${fmtNum(s.macro.inflation.value, 1)} % r/r`)

  return out
}
