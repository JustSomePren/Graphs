import { describe, expect, it } from 'vitest'
import stories from '../src/data/scenarios.json'
import { loadAuto } from './helpers.js'

const auto = loadAuto()
import { buildModel } from '../src/model.js'
import { scorePrediction } from '../src/score.js'

const all = [...stories, ...auto]

function average(strategy) {
  const scores = all.map((s) => {
    const m = buildModel(s)
    const score = scorePrediction(m, strategy(m))
    return score.total + score.bonus
  })
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

// Hlídá, aby skóre odlišovalo znalost od hádání napříč všemi scénáři
describe('kalibrace skórování', () => {
  it('hádání bez informace (rovná čára) dává kolem 35 bodů', () => {
    const avg = average(() => [{ t: 1, r: 0 }])
    expect(avg).toBeGreaterThan(25)
    expect(avg).toBeLessThan(45)
  })

  it('správný směr s polovičním pohybem dává 55–80 bodů', () => {
    const avg = average((m) => [{ t: 1, r: m.future.at(-1).r / 2 }])
    expect(avg).toBeGreaterThan(55)
    expect(avg).toBeLessThan(80)
  })

  it('správný konec dává přes 90 a dokonalý odhad 115', () => {
    expect(average((m) => [{ t: 1, r: m.future.at(-1).r }])).toBeGreaterThan(90)
    expect(average((m) => m.future.map((r) => ({ t: r.t, r: r.r })))).toBe(115)
  })
})
