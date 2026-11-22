import { describe, expect, it } from 'vitest'
import { buildModel, predictAt } from '../src/model.js'
import { scorePrediction } from '../src/score.js'
import { fakeScenario } from './helpers.js'

// Predikce, která přesně kopíruje realitu
const perfect = (model) => model.future.map((r) => ({ t: r.t, r: r.r }))

describe('predictAt', () => {
  it('začíná v nule a interpoluje mezi body', () => {
    const points = [{ t: 0.5, r: 0.2 }, { t: 1, r: 0 }]
    expect(predictAt(points, 0)).toBe(0)
    expect(predictAt(points, 0.25)).toBeCloseTo(0.1)
    expect(predictAt(points, 0.75)).toBeCloseTo(0.1)
  })

  it('za posledním bodem drží hodnotu', () => {
    expect(predictAt([{ t: 0.5, r: 0.3 }], 0.9)).toBe(0.3)
  })
})

describe('scorePrediction', () => {
  const up = buildModel(fakeScenario([102, 105, 110, 115, 120, 118, 125, 130]))

  it('dokonalý odhad dá plné skóre i bonus', () => {
    const score = scorePrediction(up, perfect(up))
    expect(score.total).toBe(100)
    expect(score.bonus).toBe(15)
    expect(score.gapPoints).toBeCloseTo(0)
  })

  it('opačný směr dá nízké skóre a nula za směr', () => {
    const score = scorePrediction(up, [{ t: 1, r: Math.log(0.7) }])
    expect(score.total).toBeLessThan(25)
    expect(score.parts.find((p) => p.label === 'Směr').value).toBe(0)
  })

  it('lepší odhad konce má vyšší skóre', () => {
    const close = scorePrediction(up, [{ t: 1, r: Math.log(1.25) }])
    const far = scorePrediction(up, [{ t: 1, r: Math.log(1.05) }])
    expect(close.total).toBeGreaterThan(far.total)
  })

  it('pozná reakci na výsledky', () => {
    const s = fakeScenario([100, 100, 130, 130, 130], { earnings: [{ date: '2024-02-01', afterClose: true }] })
    const model = buildModel(s)
    const jump = model.future[2].t
    const hit = scorePrediction(model, [{ t: jump - 0.01, r: 0 }, { t: jump, r: Math.log(1.3) }, { t: 1, r: Math.log(1.3) }])
    const miss = scorePrediction(model, [{ t: 1, r: Math.log(1.3) }])
    const label = (score) => score.checks.find((c) => c.label.startsWith('Reakce'))
    expect(label(hit).ok).toBe(true)
    expect(label(miss).ok).toBe(false)
  })

  it('skóre je vždy v rozsahu 0–100 a bonus 0–15', () => {
    const wild = buildModel(fakeScenario([300, 500, 200, 60, 40]))
    for (const r of [-3, -1, 0, 1, 3]) {
      const score = scorePrediction(wild, [{ t: 1, r }])
      expect(score.total).toBeGreaterThanOrEqual(0)
      expect(score.total).toBeLessThanOrEqual(100)
      expect(score.bonus).toBeGreaterThanOrEqual(0)
      expect(score.bonus).toBeLessThanOrEqual(15)
    }
  })
})
