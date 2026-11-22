import { fmtBig, fmtPct, fmtX } from './format.js'

const median = (xs) => {
  const sorted = xs.filter((x) => x != null).sort((a, b) => a - b)
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
}

// Shrne data do pár srozumitelných signálů. tone: good | bad | neutral
export function signals(s) {
  const m = s.metrics
  const peers = s.peerMetrics.filter((p) => p.ticker !== '^GSPC')
  const market = s.peerMetrics.find((p) => p.ticker === '^GSPC')
  const out = []
  const add = (area, text, tone) => out.push({ area, text, tone })

  // Valuace
  const peerPs = median(peers.map((p) => p.ps))
  if (m.pe) {
    const tone = m.pe > 60 ? 'bad' : m.pe < 15 ? 'good' : 'neutral'
    add('Valuace', `P/E ${fmtX(m.pe)}${m.pe > 60 ? ' – trh čeká velký růst' : m.pe < 15 ? ' – levná vůči zisku' : ''}`, tone)
  } else if (m.ps) {
    add('Valuace', `Ztrátová firma, P/S ${fmtX(m.ps)}${peerPs ? ` (konkurence ${fmtX(peerPs)})` : ''}`, m.ps > 2 * (peerPs ?? m.ps) ? 'bad' : 'neutral')
  }

  // Růst
  const g = m.lastQuarterGrowth
  if (g != null) add('Růst', `Tržby posl. kvartálu ${fmtPct(g)} r/r`, g > 0.2 ? 'good' : g < 0 ? 'bad' : 'neutral')
  if (m.inventoryGrowth != null && m.inventoryGrowth - (g ?? 0) > 0.3) {
    add('Zásoby', `Zásoby rostou rychleji než tržby (${fmtPct(m.inventoryGrowth)})`, 'bad')
  }

  // Ziskovost
  if (m.netMargin != null) {
    add('Zisk', m.netMargin < 0 ? `Ztrátová (čistá marže ${fmtPct(m.netMargin, false)})` : `Čistá marže ${fmtPct(m.netMargin, false)}`, m.netMargin < 0 ? 'bad' : m.netMargin > 0.2 ? 'good' : 'neutral')
  }

  // Rozvaha
  const net = (m.cashAndInvestments ?? 0) - (m.debt ?? 0)
  if (m.cashAndInvestments != null) add('Rozvaha', `${net >= 0 ? 'Čistá hotovost' : 'Čistý dluh'} ${fmtBig(Math.abs(net))}`, net >= 0 ? 'good' : 'neutral')

  // Cena a nálada trhu
  if (m.change6m != null) {
    const vsMarket = market?.change6m != null ? m.change6m - market.change6m : null
    add('Trend', `Za 6 měsíců ${fmtPct(m.change6m)}${vsMarket != null ? `, ${vsMarket >= 0 ? 'lépe' : 'hůř'} než S&P 500` : ''}`, m.change6m > 0.15 ? 'good' : m.change6m < -0.15 ? 'bad' : 'neutral')
  }
  if (m.volatility > 0.6) add('Riziko', `Velmi volatilní akcie (${fmtPct(m.volatility, false)} ročně)`, 'neutral')

  // Insideři
  const ins = s.insiders
  if (ins?.buyValue > 0) add('Insideři', `Nakupovali za ${fmtBig(ins.buyValue)}`, 'good')
  else if (ins?.sellValue > 0) add('Insideři', `Jen prodeje (${fmtBig(ins.sellValue)})`, 'neutral')

  // Makro
  const fed = s.macro?.fedFunds
  if (fed?.before != null && fed.value - fed.before > 0.5) add('Makro', `Fed zvedá sazby (${fed.before} → ${fed.value} %)`, 'bad')
  else if (fed?.before != null && fed.before - fed.value > 0.5) add('Makro', `Fed snižuje sazby (${fed.before} → ${fed.value} %)`, 'good')
  if (s.macro?.spread10y2y?.value < 0) add('Makro', 'Inverzní výnosová křivka (varování před recesí)', 'neutral')

  return out
}
