import { describe, expect, it } from 'vitest'
import stories from '../src/data/scenarios.json'
import { loadAuto } from './helpers.js'

const auto = loadAuto()
import { validateScenario } from '../scripts/lib/validate.mjs'
import { signals } from '../src/signals.js'

const scenarios = [...stories, ...auto]

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
    expect(s.articles.length).toBeGreaterThan(s.auto ? -1 : 0)
    expect(s.outcome.summary.length).toBeGreaterThan(40)
    expect(signals(s).length).toBeGreaterThanOrEqual(3)
  })
})

describe('anonymní scénáře', () => {
  it.each(auto.map((s) => [s.id, s]))('%s neprozradí ticker před vyhodnocením', (_, s) => {
    const visible = JSON.stringify([s.situation, s.title, s.articles, s.press])
    // Výjimka: název produktu typu „F-150“ (Ford) – jména produktů se neodstraňují
    expect(visible).not.toMatch(new RegExp(`\\b${s.ticker}\\b(?!-\\d)`))
  })

  it('pokrývají všechny horizonty a aspoň 8 odvětví', () => {
    expect(new Set(auto.map((s) => s.horizon)).size).toBe(3)
    expect(new Set(auto.map((s) => s.sector)).size).toBeGreaterThanOrEqual(8)
  })
})

describe('přehled minulých výsledků', () => {
  it('nevidí čísla z výkazů podaných po datu rozhodnutí', () => {
    for (const s of stories) {
      for (const e of s.earnings) {
        if (e.snapshot) expect(e.snapshot.quarterEnd < s.decisionDate).toBe(true)
      }
    }
  })

  it('reakce na výsledky odpovídá známým případům', () => {
    const reaction = (id, date) => stories.find((s) => s.id === id).earnings.find((e) => e.date === date).reaction
    expect(reaction('meta-2023-02', '2022-10-26')).toBeCloseTo(-0.246, 2)
    expect(reaction('nflx-2022-04', '2022-01-20')).toBeCloseTo(-0.218, 2)
  })
})

describe('rozdělení automatických scénářů', () => {
  it('index odpovídá obsahu částí a id jsou unikátní', async () => {
    const { loadAutoIndex } = await import('./helpers.js')
    const index = loadAutoIndex()
    expect(index.length).toBe(auto.length)
    expect(new Set(index.map((e) => e.id)).size).toBe(index.length)
    const ids = new Set(auto.map((s) => s.id))
    expect(index.every((e) => ids.has(e.id))).toBe(true)
  })
})
