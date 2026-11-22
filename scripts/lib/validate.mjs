// Kontroly kvality dat jednoho scénáře – vrací seznam nalezených problémů
import { DAY, toTs } from '../../src/format.js'

const day = (d) => d.slice(0, 10)

export function validateScenario(s) {
  const problems = []
  const fail = (msg) => problems.push(`${s.id}: ${msg}`)
  const dates = s.series.map(([d]) => d)

  s.series.forEach(([date, price], i) => {
    if (!(price > 0)) fail(`neplatná cena ${price} (${date})`)
    if (i === 0) return
    const [prevDate, prevPrice] = s.series[i - 1]
    if (date <= prevDate) fail(`data nejsou seřazená (${date})`)
    // Zředěné řady (každý 3. den) mají přirozeně delší mezery
    if ((toTs(date) - toTs(prevDate)) / DAY > (s.sampled || i < 2 ? 10 : 7)) fail(`díra v cenách ${prevDate} → ${date}`)
    // Pohyb přes 3× za den skoro vždy znamená špatně přepočtený split
    if (Math.abs(Math.log(price / prevPrice)) > Math.log(3)) fail(`podezřelý skok ceny ${date}`)
  })

  if (!dates.some((d) => day(d) === s.decisionDate)) fail('datum rozhodnutí chybí v cenách')
  const future = dates.filter((d) => day(d) > s.decisionDate)
  // Týdenní horizont má při svátku jen 4 obchodní dny
  if (future.length < 4) fail('málo dat po datu rozhodnutí')
  if (dates[0] > s.historyStart && (toTs(dates[0]) - toTs(s.historyStart)) / DAY > 7) fail('historie začíná pozdě')

  const m = s.metrics
  const lastHistory = s.series.findLast(([d]) => day(d) <= s.decisionDate)?.[1]
  // Hodinová svíčka se od oficiální zavírací ceny může lišit o pár centů
  if (Math.abs(m.price / lastHistory - 1) > (s.intraday ? 0.01 : 0.001)) fail('cena v metrikách nesedí s grafem')
  if (!(m.marketCap > 0)) fail('chybí tržní kapitalizace')
  if (!(m.revenueTtm > 0)) fail('chybí tržby')
  for (const key of ['grossMargin', 'operatingMargin', 'netMargin']) {
    if (m[key] != null && (m[key] > 1 || m[key] < -5)) fail(`nesmyslná marže ${key}=${m[key]}`)
  }
  if (m.pe != null && !(m.pe > 0)) fail('záporné P/E')

  // Žádná informace z budoucnosti
  if (m.lastQuarterEnd >= s.decisionDate) fail('kvartál končí po datu rozhodnutí')
  if (m.reportFiled > s.decisionDate) fail('výkaz podaný po datu rozhodnutí')
  for (const q of m.quarterly ?? []) if (q.end >= s.decisionDate) fail(`budoucí kvartál ${q.end}`)
  for (const key of Object.keys(s.macro ?? {})) {
    if (s.macro[key].asOf > s.decisionDate) fail(`makro ${key} z budoucnosti`)
  }

  const earnings = s.earnings.map((e) => e.date)
  if (earnings.some((d, i) => i && d <= earnings[i - 1])) fail('výsledky nejsou seřazené')
  if (s.insiders && (s.insiders.buyValue < 0 || s.insiders.sellValue < 0)) fail('záporné obchody insiderů')

  return problems
}
