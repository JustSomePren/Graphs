import { toTs } from './format.js'

export const day = (date) => date.slice(0, 10)

// Připraví scénář pro graf i skórování. Řada může mít denní i hodinové body.
export function buildModel(s) {
  const rows = s.series.map(([date, price]) => ({ date, ts: toTs(date), price }))
  const history = rows.filter((r) => day(r.date) <= s.decisionDate)
  const future = rows.filter((r) => day(r.date) > s.decisionDate)
  const start = history[0].ts
  const now = history.at(-1).ts
  const end = future.at(-1).ts
  const p0 = history.at(-1).price

  const tOf = (ts) => (ts - now) / (end - now)
  for (const r of future) {
    r.t = tOf(r.ts)
    r.r = Math.log(r.price / p0)
  }

  // Okno reakce na výsledky: poslední bod před dnem reakce a poslední bod dne reakce
  const reactionWindow = (reactionDate) => {
    const after = future.findLast((r) => day(r.date) === reactionDate)
    if (!after) return null
    const before = future.findLast((r) => day(r.date) < reactionDate) ?? { t: 0, r: 0 }
    return { before, after }
  }

  const earnings = s.earnings.map((e) => {
    const reactionDate = e.reactionDate ?? rows.find((r) => (e.afterClose ? day(r.date) > e.date : day(r.date) >= e.date))?.date.slice(0, 10)
    return { ...e, ts: toTs(e.date), reactionDate, window: reactionDate > s.decisionDate ? reactionWindow(reactionDate) : null }
  })

  return {
    s,
    rows,
    history,
    future,
    start,
    now,
    end,
    p0,
    tOf,
    intraday: rows.some((r) => r.date.length > 10),
    earnings,
    pastEarnings: earnings.filter((e) => e.reactionDate && e.reactionDate <= s.decisionDate),
    upcomingEarnings: earnings.filter((e) => e.reactionDate > s.decisionDate),
    events: (s.events ?? []).map((e) => ({ ...e, ts: toTs(e.date) })),
  }
}

// Lineární interpolace nakreslené predikce: body [{t, r}], začátek je vždy (0, 0)
export function predictAt(points, t) {
  const all = [{ t: 0, r: 0 }, ...points]
  if (t >= all.at(-1).t) return all.at(-1).r
  const i = all.findIndex((p) => p.t >= t)
  if (i <= 0) return 0
  const a = all[i - 1]
  const b = all[i]
  return a.r + ((b.r - a.r) * (t - a.t)) / (b.t - a.t || 1)
}
