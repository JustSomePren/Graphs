import { fmtPct } from './format.js'
import { predictAt } from './model.js'

// --- denní výzva: pro každý den stejný scénář pro všechny hráče ---

function hash(text) {
  let h = 2166136261
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}

export const todayKey = (date = new Date()) => date.toISOString().slice(0, 10)
export const dailyPick = (index, date = todayKey()) => index[hash('denni-' + date) % index.length]

// --- sdílení výsledku jako text s „emoji grafem“ ---

const BARS = '▁▂▃▄▅▆▇█'

function bars(values, lo, hi) {
  return values.map((v) => BARS[Math.round(((v - lo) / (hi - lo || 1)) * (BARS.length - 1))]).join('')
}

export function shareText(s, model, points, score) {
  const steps = Array.from({ length: 10 }, (_, i) => (i + 1) / 10)
  const real = steps.map((t) => model.future.findLast((r) => r.t <= t + 1e-9)?.r ?? 0)
  const guess = steps.map((t) => predictAt(points, t))
  const lo = Math.min(...real, ...guess)
  const hi = Math.max(...real, ...guess)
  const name = s.auto ? `${s.ticker} (${s.sector})` : s.title
  return [
    `📈 Kam to půjde? – ${name}`,
    `Skóre ${score.total + score.bonus} · odhad ${fmtPct(score.predEnd)} vs realita ${fmtPct(score.actualEnd)}`,
    `Můj odhad ${bars(guess, lo, hi)}`,
    `Realita   ${bars(real, lo, hi)}`,
  ].join('\n')
}

// --- statistiky hráče z historie her ---

export function playerStats(history) {
  const withGuess = history.filter((h) => h.predEnd != null && h.actualEnd != null)
  const avg = (list, f) => (list.length ? list.reduce((s, x) => s + f(x), 0) / list.length : null)
  const groupAvg = (key) =>
    Object.entries(
      history.reduce((acc, h) => {
        if (h[key]) (acc[h[key]] ??= []).push(h.score)
        return acc
      }, {}),
    ).map(([label, scores]) => ({ label, avg: Math.round(avg(scores, (x) => x)), count: scores.length }))

  return {
    games: history.length,
    avg: history.length ? Math.round(avg(history, (h) => h.score)) : null,
    best: history.length ? Math.max(...history.map((h) => h.score)) : null,
    // Kladný sklon = hráč odhaduje víc nahoru, než pak trh skutečně šel
    bias: withGuess.length >= 3 ? avg(withGuess, (h) => h.predEnd - h.actualEnd) : null,
    directionHit: withGuess.length ? avg(withGuess, (h) => (Math.sign(h.predEnd) === Math.sign(h.actualEnd) ? 1 : 0)) : null,
    tiers: [
      { label: '80+', count: history.filter((h) => h.score >= 80).length },
      { label: '55–79', count: history.filter((h) => h.score >= 55 && h.score < 80).length },
      { label: '0–54', count: history.filter((h) => h.score < 55).length },
    ],
    byHorizon: groupAvg('horizon'),
    bySector: groupAvg('sector'),
  }
}
