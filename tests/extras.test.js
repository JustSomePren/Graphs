import { describe, expect, it } from 'vitest'
import { dailyPick, playerStats, shareText } from '../src/extras.js'
import { buildModel } from '../src/model.js'
import { scorePrediction } from '../src/score.js'
import { fakeScenario } from './helpers.js'

const index = Array.from({ length: 500 }, (_, i) => ({ id: `s${i}` }))

describe('denní výzva', () => {
  it('stejný den = stejný scénář, jiný den = (skoro vždy) jiný', () => {
    expect(dailyPick(index, '2026-01-01')).toBe(dailyPick(index, '2026-01-01'))
    const week = new Set(['01', '02', '03', '04', '05', '06', '07'].map((d) => dailyPick(index, `2026-01-${d}`).id))
    expect(week.size).toBeGreaterThanOrEqual(6)
  })

  it('výběr je rozprostřený po celém seznamu', () => {
    const picks = Array.from({ length: 365 }, (_, i) => index.indexOf(dailyPick(index, new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10))))
    expect(Math.min(...picks)).toBeLessThan(50)
    expect(Math.max(...picks)).toBeGreaterThan(450)
  })
})

describe('sdílení', () => {
  it('text obsahuje skóre a dva emoji grafy stejné délky', () => {
    const s = { ...fakeScenario([102, 104, 108, 112, 115]), title: 'Test' }
    const model = buildModel(s)
    const points = [{ t: 1, r: Math.log(1.1) }]
    const text = shareText(s, model, points, scorePrediction(model, points))
    const lines = text.split('\n')
    expect(lines).toHaveLength(4)
    expect(lines[1]).toMatch(/^Skóre \d+/)
    const bars = lines.slice(2).map((l) => l.replace(/^[^▁-█]+/, ''))
    expect(bars[0]).toHaveLength(10)
    expect(bars[1]).toHaveLength(10)
    // Realita roste → poslední sloupec je nejvyšší
    expect(bars[1].at(-1)).toBe('█')
  })
})

describe('statistiky hráče', () => {
  const game = (score, predEnd, actualEnd, horizon = 'týden') => ({ score, predEnd, actualEnd, horizon, sector: 'software' })

  it('pozná optimistu i pesimistu', () => {
    expect(playerStats([game(50, 0.2, 0), game(60, 0.1, -0.05), game(40, 0.15, 0.05)]).bias).toBeGreaterThan(0.1)
    expect(playerStats([game(50, -0.2, 0), game(60, -0.1, 0.05), game(40, -0.1, 0)]).bias).toBeLessThan(-0.1)
  })

  it('spočítá průměr, trefený směr a skupiny', () => {
    const st = playerStats([game(80, 0.1, 0.2), game(40, -0.1, 0.2, 'měsíc'), game(60, 0.05, 0.01)])
    expect(st.avg).toBe(60)
    expect(st.best).toBe(80)
    expect(st.directionHit).toBeCloseTo(2 / 3)
    expect(st.byHorizon.find((g) => g.label === 'týden')).toEqual({ label: 'týden', avg: 70, count: 2 })
    expect(st.tiers.map((t) => t.count)).toEqual([1, 1, 1])
  })

  it('bez her vrací prázdné hodnoty', () => {
    const st = playerStats([])
    expect(st.games).toBe(0)
    expect(st.avg).toBeNull()
    expect(st.bias).toBeNull()
  })
})
