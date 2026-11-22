// Vytvoří malý umělý scénář pro testy skórování
export function fakeScenario(futurePrices, { earnings = [] } = {}) {
  const day = (i) => new Date(Date.UTC(2024, 0, 1) + i * 86400000).toISOString().slice(0, 10)
  const history = Array.from({ length: 30 }, (_, i) => [day(i), 100])
  const future = futurePrices.map((p, i) => [day(30 + i), p])
  return {
    id: 'test',
    decisionDate: day(29),
    series: [...history, ...future],
    earnings,
    events: [],
  }
}

// Načte všechny části automatických scénářů z disku
import fs from 'node:fs'
import path from 'node:path'

export function loadAuto() {
  const dir = path.resolve('src/data/auto')
  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('part-'))
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
}

export const loadAutoIndex = () => JSON.parse(fs.readFileSync(path.resolve('src/data/auto/index.json'), 'utf8'))
