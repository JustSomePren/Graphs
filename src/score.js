import { predictAt } from './model.js'
import { fmtPct } from './format.js'

const pct = (r) => fmtPct(Math.exp(r) - 1)

// Skóre: konec 60 b., průběh 25 b., směr 15 b. + bonus až 15 b. za tvar (reakce na earnings, obraty)
export function scorePrediction(model, points) {
  const actual = model.future
  const last = actual.at(-1).r
  const pred = (t) => predictAt(points, t)
  const predEnd = pred(1)

  // Čím větší reálný pohyb, tím tolerantnější měřítko
  const maxMove = Math.max(...actual.map((a) => Math.abs(a.r)))
  const scale = Math.max(0.05, 0.3 * maxMove)

  const endError = Math.abs(predEnd - last)
  const endScore = 60 * Math.exp(-endError / scale)

  const meanError = actual.reduce((sum, a) => sum + Math.abs(pred(a.t) - a.r), 0) / actual.length
  const pathScore = 25 * Math.exp(-meanError / scale)

  const flat = Math.abs(last) < 0.02
  const directionOk = flat ? Math.abs(predEnd) < 0.05 : Math.sign(predEnd) === Math.sign(last)
  const directionScore = directionOk ? 15 : 0

  const checks = [...earningsChecks(model, pred), ...swingChecks(actual, pred, scale)]
  const passed = checks.filter((c) => c.ok).length
  // Bez kontrolních bodů (klidný graf) se bonus odvodí z přesnosti průběhu
  const bonus = checks.length ? (15 * passed) / checks.length : 15 * Math.exp(-meanError / scale)

  return {
    total: Math.round(endScore + pathScore + directionScore),
    bonus: Math.round(bonus),
    parts: [
      { label: 'Konečná cena', value: Math.round(endScore), max: 60 },
      { label: 'Průběh', value: Math.round(pathScore), max: 25 },
      { label: 'Směr', value: directionScore, max: 15 },
    ],
    predEnd: Math.exp(predEnd) - 1,
    actualEnd: Math.exp(last) - 1,
    gapPoints: (Math.exp(predEnd) - Math.exp(last)) * 100,
    checks,
  }
}

const sameMove = (p, a) => Math.sign(p) === Math.sign(a) && Math.abs(p) >= 0.3 * Math.abs(a)

function earningsChecks(model, pred) {
  const out = []
  for (const e of model.upcomingEarnings) {
    if (!e.window) continue
    const { before, after } = e.window
    const move = after.r - before.r
    if (Math.abs(move) < 0.03) continue
    const guess = pred(after.t) - pred(before.t)
    out.push({
      ok: sameMove(guess, move),
      label: `Reakce na výsledky ${e.reactionDate.slice(8, 10)}. ${e.reactionDate.slice(5, 7)}.: ${pct(move)}`,
    })
  }
  return out
}

// Najde výrazné obraty (maximum/minimum uvnitř okna) a porovná směr jednotlivých úseků
function swingChecks(actual, pred, scale) {
  const inner = actual.filter((a) => a.t > 0.04 && a.t < 0.96)
  if (!inner.length) return []
  const top = inner.reduce((m, a) => (a.r > m.r ? a : m))
  const bottom = inner.reduce((m, a) => (a.r < m.r ? a : m))
  const lastR = actual.at(-1).r
  const minMove = Math.max(0.04, 0.25 * scale)
  const turns = [top, bottom]
    .filter((p) => Math.abs(p.r) > minMove && Math.abs(p.r - lastR) > minMove)
    .sort((a, b) => a.t - b.t)

  const marks = [{ t: 0, r: 0 }, ...turns, actual.at(-1)]
  const out = []
  for (let i = 1; i < marks.length; i++) {
    const a = marks[i - 1]
    const b = marks[i]
    const move = b.r - a.r
    if (Math.abs(move) < minMove) continue
    const guess = pred(b.t) - pred(a.t)
    out.push({
      ok: sameMove(guess, move),
      label: `${move > 0 ? 'Růst' : 'Pokles'} ${pct(move)} do ${b.date ? b.date.slice(8, 10) + '. ' + b.date.slice(5, 7) + '.' : 'konce'}`,
    })
  }
  return out
}
