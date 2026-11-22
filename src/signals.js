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

// Shrne data do srozumitelných signálů po oblastech. tone: good | bad | neutral
export function signals(s) {
  const m = s.metrics
  const d = derived(s)
  const market = s.peerMetrics.find((p) => p.ticker === '^GSPC')
  const out = []
  const add = (area, text, tone) => out.push({ area, text, tone })

  // Valuace
  if (m.pe) {
    const tone = m.pe > 60 ? 'bad' : m.pe < 15 ? 'good' : 'neutral'
    add('Valuace', `P/E ${fmtX(m.pe)}${m.pe > 60 ? ' – trh čeká velký růst' : m.pe < 15 ? ' – levná vůči zisku' : ''}`, tone)
    if (d.peerPe) add('Valuace', `Konkurence má P/E ${fmtX(d.peerPe)} – firma je ${m.pe > d.peerPe * 1.2 ? 'dražší' : m.pe < d.peerPe * 0.8 ? 'levnější' : 'podobně drahá'}`, m.pe < d.peerPe * 0.8 ? 'good' : m.pe > d.peerPe * 1.5 ? 'bad' : 'neutral')
    if (d.historicPe) add('Valuace', `Vlastní P/E v posledních letech kolem ${fmtX(d.historicPe)}`, m.pe < d.historicPe * 0.8 ? 'good' : m.pe > d.historicPe * 1.3 ? 'bad' : 'neutral')
  } else if (m.ps) {
    add('Valuace', `Ztrátová firma, P/S ${fmtX(m.ps)}${d.peerPs ? ` (konkurence ${fmtX(d.peerPs)})` : ''}`, m.ps > 2 * (d.peerPs ?? m.ps) ? 'bad' : 'neutral')
  }

  // Růst
  const g = m.lastQuarterGrowth
  if (g != null) add('Růst', `Tržby posl. kvartálu ${fmtPct(g)} r/r`, g > 0.2 ? 'good' : g < 0 ? 'bad' : 'neutral')
  if (d.growthAcceleration != null && Math.abs(d.growthAcceleration) > 0.03) {
    add('Růst', `Růst ${d.growthAcceleration > 0 ? 'zrychluje' : 'zpomaluje'} (${fmtPp(d.growthAcceleration)} proti minulému kvartálu)`, d.growthAcceleration > 0 ? 'good' : 'bad')
  }
  if (d.peerGrowth != null && g != null) add('Růst', `Konkurence roste ${fmtPct(d.peerGrowth)} ročně`, 'neutral')
  if (m.inventoryGrowth != null && m.inventoryGrowth - (g ?? 0) > 0.3) add('Růst', `Zásoby rostou rychleji než tržby (${fmtPct(m.inventoryGrowth)})`, 'bad')

  // Ziskovost
  if (m.netMargin != null) {
    add('Zisk', m.netMargin < 0 ? `Ztrátová (čistá marže ${fmtPct(m.netMargin, false)})` : `Čistá marže ${fmtPct(m.netMargin, false)}`, m.netMargin < 0 ? 'bad' : m.netMargin > 0.2 ? 'good' : 'neutral')
  }
  if (d.marginChange != null && Math.abs(d.marginChange) > 0.02) {
    add('Zisk', `Provozní marže ${d.marginChange > 0 ? 'roste' : 'klesá'} (${fmtPp(d.marginChange)} r/r)`, d.marginChange > 0 ? 'good' : 'bad')
  }

  // Rozvaha a akcionáři
  if (d.netCash != null) add('Rozvaha', `${d.netCash >= 0 ? 'Čistá hotovost' : 'Čistý dluh'} ${fmtBig(Math.abs(d.netCash))}`, d.netCash >= 0 ? 'good' : 'neutral')
  if (d.dividendYield > 0.005) add('Akcionáři', `Dividendový výnos ${fmtPct(d.dividendYield, false)}`, 'good')
  if (d.buybackYield > 0.01) add('Akcionáři', `Zpětné odkupy ${fmtPct(d.buybackYield, false)} hodnoty firmy ročně`, 'good')
  if (m.sharesGrowth > 0.03) add('Akcionáři', `Ředění: počet akcií ${fmtPct(m.sharesGrowth)} za rok`, 'bad')

  // Cena a nálada trhu
  if (m.change6m != null) {
    const vsMarket = market?.change6m != null ? m.change6m - market.change6m : null
    add('Trend', `Za 6 měsíců ${fmtPct(m.change6m)}${vsMarket != null ? `, ${vsMarket >= 0 ? 'lépe' : 'hůř'} než S&P 500` : ''}`, m.change6m > 0.15 ? 'good' : m.change6m < -0.15 ? 'bad' : 'neutral')
  }
  if (m.fromHigh < -0.3) add('Trend', `${fmtPct(m.fromHigh)} pod ročním maximem`, 'neutral')
  if (m.vsMa200 != null && Math.abs(m.vsMa200) > 0.15) add('Trend', `Cena ${fmtPct(m.vsMa200)} od průměru 200 dní`, 'neutral')
  if (m.volatility > 0.6) add('Riziko', `Velmi volatilní akcie (${fmtPct(m.volatility, false)} ročně)`, 'neutral')

  // Výsledky
  if (d.typicalReaction != null) {
    add('Výsledky', `Trh na výsledky reaguje v průměru o ±${fmtPct(d.typicalReaction, false)} (nahoru ${d.reactionsUp}× z ${d.reactionsCount})`, 'neutral')
  }

  // Insideři
  const ins = s.insiders
  if (ins?.buyValue > 0) add('Insideři', `Nakupovali za ${fmtBig(ins.buyValue)}`, 'good')
  else if (ins?.sellValue > 0) add('Insideři', `Jen prodeje (${fmtBig(ins.sellValue)})`, 'neutral')

  // Makro
  const fed = s.macro?.fedFunds
  if (fed?.before != null && fed.value - fed.before > 0.5) add('Makro', `Fed zvedá sazby (${fmtNum(fed.before)} → ${fmtNum(fed.value)} %)`, 'bad')
  else if (fed?.before != null && fed.before - fed.value > 0.5) add('Makro', `Fed snižuje sazby (${fmtNum(fed.before)} → ${fmtNum(fed.value)} %)`, 'good')
  if (s.macro?.spread10y2y?.value < 0) add('Makro', 'Inverzní výnosová křivka (varování před recesí)', 'neutral')
  if (s.macro?.inflation?.value > 4) add('Makro', `Vysoká inflace (${fmtNum(s.macro.inflation.value, 1)} %)`, 'bad')

  return out
}

export function balance(list) {
  return {
    good: list.filter((x) => x.tone === 'good').length,
    bad: list.filter((x) => x.tone === 'bad').length,
    neutral: list.filter((x) => x.tone === 'neutral').length,
  }
}
