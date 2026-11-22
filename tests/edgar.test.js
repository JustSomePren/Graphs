import { describe, expect, it } from 'vitest'
import { classifyEarnings, factsKnownAt, quarters, ttm } from '../scripts/lib/edgar.mjs'
import { knownAt } from '../scripts/lib/macro.mjs'

const fact = (start, end, val, filed = '2024-01-01', form = '10-Q') => ({ start, end, val, filed, form })

describe('quarters', () => {
  it('dopočítá kvartály z kumulativních hodnot (cash flow)', () => {
    const qs = quarters([
      fact('2023-01-01', '2023-03-31', 10),
      fact('2023-01-01', '2023-06-30', 25),
      fact('2023-01-01', '2023-09-30', 45),
      fact('2023-01-01', '2023-12-31', 70, '2024-02-01', '10-K'),
    ])
    expect(qs.map((q) => q.val)).toEqual([10, 15, 20, 25])
  })

  it('přímý čtvrtletní údaj má přednost', () => {
    const qs = quarters([fact('2023-04-01', '2023-06-30', 16), fact('2023-01-01', '2023-03-31', 10), fact('2023-01-01', '2023-06-30', 25)])
    expect(qs.find((q) => q.end === '2023-06-30').val).toBe(16)
  })

  it('TTM sečte poslední 4 kvartály a odmítne mezery', () => {
    const qs = [10, 15, 20, 25].map((val, i) => ({ end: ['2023-03-31', '2023-06-30', '2023-09-30', '2023-12-31'][i], val }))
    expect(ttm(qs)).toBe(70)
    expect(ttm([qs[0], qs[1], qs[3]])).toBeNull()
  })
})

describe('factsKnownAt', () => {
  const g = {
    Revenues: {
      units: {
        USD: [
          fact('2023-01-01', '2023-03-31', 10, '2023-04-30'),
          fact('2023-01-01', '2023-03-31', 11, '2024-04-30'),
          fact('2023-04-01', '2023-06-30', 12, '2023-07-30'),
          { ...fact('2023-04-01', '2023-06-30', 99, '2023-07-01'), form: '8-K' },
        ],
      },
    },
  }

  it('nevidí nic podaného po datu rozhodnutí', () => {
    const known = factsKnownAt(g, ['Revenues'], 'USD', '2023-05-01')
    expect(known.map((f) => f.val)).toEqual([10])
  })

  it('bere nejnovější podání a jen výkazy 10-Q/10-K', () => {
    const known = factsKnownAt(g, ['Revenues'], 'USD', '2025-01-01')
    expect(known.map((f) => f.val).sort()).toEqual([11, 12])
  })
})

describe('classifyEarnings', () => {
  const filing = (form, date, items = '') => ({ form, date, items, time: `${date}T21:00:00.000Z`, accession: date.replaceAll('-', '') })

  it('pozná předběžná čísla před skutečnými výsledky', () => {
    const list = classifyEarnings(
      [filing('8-K', '2020-10-02', '2.02,7.01'), filing('8-K', '2020-10-21', '2.02'), filing('10-Q', '2020-10-26')],
      '0001318605',
    )
    expect(list.map((e) => [e.date, e.preliminary])).toEqual([
      ['2020-10-02', true],
      ['2020-10-21', false],
    ])
    expect(list[1].afterClose).toBe(true)
  })
})

describe('makro', () => {
  it('respektuje zpoždění publikace', () => {
    const rows = [{ date: '2023-03-01', value: 1 }, { date: '2023-04-01', value: 2 }]
    // Údaj za duben vyjde až kolem poloviny května
    expect(knownAt(rows, '2023-05-01', 45).value).toBe(1)
    expect(knownAt(rows, '2023-05-20', 45).value).toBe(2)
  })
})
