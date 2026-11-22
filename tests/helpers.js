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
