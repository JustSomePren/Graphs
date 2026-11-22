import { describe, expect, it } from 'vitest'
import scenarios from '../src/data/scenarios.json'
import { validateScenario } from '../scripts/lib/validate.mjs'
import { signals } from '../src/signals.js'

describe('data scénářů', () => {
  it.each(scenarios.map((s) => [s.id, s]))('%s prošel kontrolou kvality', (_, s) => {
    expect(validateScenario(s)).toEqual([])
  })

  it('kontrola odhalí špatně přepočtený split', () => {
    const broken = structuredClone(scenarios[0])
    broken.series[10][1] = broken.series[9][1] / 10
    expect(validateScenario(broken).some((p) => p.includes('skok'))).toBe(true)
  })

  it('kontrola odhalí data z budoucnosti', () => {
    const broken = structuredClone(scenarios[0])
    broken.metrics.reportFiled = '2099-01-01'
    expect(validateScenario(broken).some((p) => p.includes('po datu rozhodnutí'))).toBe(true)
  })

  it('id scénářů jsou unikátní', () => {
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(scenarios.length)
  })

  it.each(scenarios.map((s) => [s.id, s]))('%s má texty i signály', (_, s) => {
    expect(s.situation.length).toBeGreaterThan(50)
    expect(s.articles.length).toBeGreaterThan(0)
    expect(s.outcome.summary.length).toBeGreaterThan(50)
    expect(signals(s).length).toBeGreaterThanOrEqual(3)
  })
})
