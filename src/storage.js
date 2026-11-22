const KEY = 'graphs-results-v1'

export function loadResults() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {}
  } catch {
    return {}
  }
}

export function saveResult(id, score) {
  const all = loadResults()
  const prev = all[id]
  all[id] = { best: Math.max(prev?.best ?? 0, score), last: score, plays: (prev?.plays ?? 0) + 1 }
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {}
}
