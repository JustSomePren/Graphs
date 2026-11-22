import { describe, expect, it } from 'vitest'
import stories from '../src/data/scenarios.json'
import { derived, signals } from '../src/signals.js'
import { fmtPp, plural } from '../src/format.js'

const story = (id) => stories.find((s) => s.id === id)

describe('odvozené ukazatele', () => {
  it('Target 2022: dividendový výnos, odkupy a typická reakce', () => {
    const d = derived(story('tgt-2022-05'))
    expect(d.dividendYield).toBeGreaterThan(0.01)
    expect(d.buybackYield).toBeGreaterThan(0.03)
    expect(d.typicalReaction).toBeGreaterThan(0.02)
    expect(d.reactionsCount).toBeGreaterThanOrEqual(3)
  })

  it('očekávaný pohyb roste s horizontem', () => {
    const s = story('aapl-2019-01')
    const short = derived({ ...s, endDate: '2019-01-16' }).expectedMove
    const long = derived(s).expectedMove
    expect(long).toBeGreaterThan(short * 2)
  })

  it('pozice v ročním rozpětí je mezi 0 a 1', () => {
    for (const s of stories) {
      const p = derived(s).rangePosition
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
  })
})

describe('fakta v přehledu', () => {
  it('NVIDIA 2023: P/E a meziroční růst zásob jako čísla', () => {
    const texts = signals(story('nvda-2023-05')).map((x) => x.text).join(' | ')
    expect(texts).toMatch(/P\/E 175/)
    expect(texts).toMatch(/Zásoby \+98 % r\/r/)
  })

  it('Meta 2023: makro jako čísla (sazby, spread, inflace)', () => {
    const makro = signals(story('meta-2023-02')).filter((x) => x.area === 'Makro').map((x) => x.text)
    expect(makro.some((t) => /Úrok Fedu .* → .* za 6 měsíců/.test(t))).toBe(true)
    expect(makro.some((t) => /Spread 10 let − 2 roky -?−?\d/.test(t))).toBe(true)
    expect(makro.some((t) => /Inflace \d/.test(t))).toBe(true)
  })

  it('každý příběh má aspoň 12 faktů a žádné hodnocení', () => {
    for (const s of stories) {
      const list = signals(s)
      expect(list.length).toBeGreaterThanOrEqual(12)
      expect(list.every((x) => Object.keys(x).join() === 'area,text')).toBe(true)
    }
  })
})

describe('formátování', () => {
  it('procentní body a skloňování', () => {
    expect(fmtPp(0.031).replace(/\s/g, ' ')).toBe('+3,1 p.b.')
    expect(fmtPp(-0.04).replace(/\s/g, ' ')).toBe('-4 p.b.')
    expect(plural(1, 'hra', 'hry', 'her')).toBe('1 hra')
    expect(plural(3, 'hra', 'hry', 'her')).toBe('3 hry')
    expect(plural(12, 'hra', 'hry', 'her')).toBe('12 her')
  })
})
