const KEY = 'graphs-results-v1'
const FLAGS = 'graphs-flags-v1'

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? {}
  } catch {
    return {}
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export const loadResults = () => read(KEY)

export function saveResult(id, score) {
  const all = loadResults()
  const prev = all[id]
  all[id] = { best: Math.max(prev?.best ?? 0, score), last: score, plays: (prev?.plays ?? 0) + 1 }
  write(KEY, all)
}

export const getFlag = (name) => Boolean(read(FLAGS)[name])
export const setFlag = (name) => write(FLAGS, { ...read(FLAGS), [name]: true })
