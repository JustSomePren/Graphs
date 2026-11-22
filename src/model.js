import { toTs } from './format.js'

// Připraví scénář pro graf i skórování
export function buildModel(s) {
  const rows = s.series.map(([date, price]) => ({ date, ts: toTs(date), price }))
  const history = rows.filter((r) => r.date <= s.decisionDate)
  const future = rows.filter((r) => r.date > s.decisionDate)
  const start = history[0].ts
  const now = history.at(-1).ts
  const end = future.at(-1).ts
  const p0 = history.at(-1).price

  const tOf = (ts) => (ts - now) / (end - now)
  for (const r of future) {
    r.t = tOf(r.ts)
    r.r = Math.log(r.price / p0)
  }

  const earnings = s.earnings.map((e) => {
    const reaction = rows.find((r) => (e.afterClose ? r.date > e.date : r.date >= e.date))
    return { ...e, ts: toTs(e.date), reactionDate: reaction?.date }
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
    earnings,
    pastEarnings: earnings.filter((e) => e.date <= s.decisionDate && e.reactionDate <= s.decisionDate),
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
