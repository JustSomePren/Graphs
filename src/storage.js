const KEY = 'graphs-results-v1'
const FLAGS = 'graphs-flags-v1'
const HISTORY = 'graphs-history-v1'

function read(key, fallback = {}) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export const loadResults = () => read(KEY)
export const loadHistory = () => read(HISTORY, [])

const today = () => new Date().toISOString().slice(0, 10)

// Uloží výsledek a vrátí nově získané odznaky
export function saveResult(s, score) {
  const total = score.total + score.bonus
  const all = loadResults()
  const prev = all[s.id]
  all[s.id] = { best: Math.max(prev?.best ?? 0, total), last: total, plays: (prev?.plays ?? 0) + 1 }
  write(KEY, all)

  const history = [{ id: s.id, auto: Boolean(s.auto), title: s.auto ? `${s.name} · ${s.sector}` : s.title, score: total, date: today() }, ...loadHistory()].slice(0, 50)
  write(HISTORY, history)
  return unlock({ score, history, results: all })
}

export const getFlag = (name) => Boolean(read(FLAGS)[name])
export const setFlag = (name) => write(FLAGS, { ...read(FLAGS), [name]: true })

export const BADGES = [
  { id: 'first', icon: '🎯', label: 'První odhad', test: ({ history }) => history.length >= 1 },
  { id: 'ten', icon: '🔟', label: '10 odehraných', test: ({ history }) => history.length >= 10 },
  { id: 'fifty', icon: '🏅', label: '50 odehraných', test: ({ history }) => history.length >= 50 },
  { id: 'sharp', icon: '🔮', label: 'Skóre 90+', test: ({ score }) => score?.total >= 90 },
  { id: 'shape', icon: '〰️', label: 'Plný bonus za tvar', test: ({ score }) => score?.bonus >= 15 },
  { id: 'earnings', icon: '📊', label: 'Trefená reakce na výsledky', test: ({ score }) => score?.checks.some((c) => c.ok && c.label.startsWith('Reakce')) },
  { id: 'streak', icon: '🔥', label: '3 dny v řadě', test: ({ history }) => streak(history) >= 3 },
]

function unlock(context) {
  const earned = read(FLAGS).badges ?? []
  const fresh = BADGES.filter((b) => !earned.includes(b.id) && b.test(context))
  if (fresh.length) write(FLAGS, { ...read(FLAGS), badges: [...earned, ...fresh.map((b) => b.id)] })
  return fresh
}

export const earnedBadges = () => BADGES.filter((b) => (read(FLAGS).badges ?? []).includes(b.id))

// Počet po sobě jdoucích dní (končících dnes nebo včera), kdy hráč hrál
export function streak(history = loadHistory()) {
  const days = new Set(history.map((h) => h.date))
  let count = 0
  const d = new Date()
  if (!days.has(today())) d.setUTCDate(d.getUTCDate() - 1)
  while (days.has(d.toISOString().slice(0, 10))) {
    count++
    d.setUTCDate(d.getUTCDate() - 1)
  }
  return count
}

const RANKS = [
  { min: 0, label: 'Nováček' },
  { min: 40, label: 'Stážista' },
  { min: 55, label: 'Analytik' },
  { min: 70, label: 'Portfolio manažer' },
  { min: 85, label: 'Věštec' },
]

// Hodnost podle průměru posledních 10 her (potřeba aspoň 3 hry)
export function rank(history = loadHistory()) {
  const recent = history.slice(0, 10)
  if (recent.length < 3) return { label: 'Nováček', avg: null, next: `Ještě ${3 - recent.length} hry do první hodnosti` }
  const avg = Math.round(recent.reduce((s, h) => s + h.score, 0) / recent.length)
  const i = RANKS.findLastIndex((r) => avg >= r.min)
  const next = RANKS[i + 1]
  return { label: RANKS[i].label, avg, next: next ? `Na hodnost ${next.label} potřebuješ průměr ${next.min}` : 'Nejvyšší hodnost' }
}
