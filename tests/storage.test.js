import { beforeEach, describe, expect, it } from 'vitest'

// Jednoduchá náhrada localStorage pro Node
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const storage = await import('../src/storage.js')
const score = (total, bonus = 0, checks = []) => ({ total, bonus, checks, predEnd: 0.1, actualEnd: 0.05 })
const scenario = (id, extra = {}) => ({ id, title: id, horizon: 'týden', ...extra })

describe('úložiště', () => {
  beforeEach(() => store.clear())

  it('uloží nejlepší a poslední skóre', () => {
    storage.saveResult(scenario('a'), score(40))
    storage.saveResult(scenario('a'), score(70))
    storage.saveResult(scenario('a'), score(50))
    expect(storage.loadResults().a).toEqual({ best: 70, last: 50, plays: 3 })
    expect(storage.loadHistory()).toHaveLength(3)
  })

  it('odznaky se odemknou jen jednou', () => {
    expect(storage.saveResult(scenario('a'), score(95, 15)).map((b) => b.id)).toEqual(expect.arrayContaining(['first', 'sharp', 'shape']))
    expect(storage.saveResult(scenario('b'), score(95, 15))).toEqual([])
  })

  it('hodnost podle průměru posledních her', () => {
    for (let i = 0; i < 2; i++) storage.saveResult(scenario('x' + i), score(90))
    expect(storage.rank().label).toBe('Nováček')
    storage.saveResult(scenario('y'), score(90))
    expect(storage.rank().label).toBe('Věštec')
  })

  it('denní výzva se označí jako splněná', () => {
    expect(storage.dailyDone()).toBe(false)
    storage.saveResult(scenario('d', { daily: true }), score(50))
    expect(storage.dailyDone()).toBe(true)
  })

  it('nastavení má výchozí hodnoty a jde změnit', () => {
    expect(storage.loadSettings()).toEqual({ theme: 'system', haptics: true, band: false })
    storage.saveSettings({ theme: 'dark' })
    expect(storage.loadSettings().theme).toBe('dark')
  })

  it('reset smaže postup, ale ne nastavení', () => {
    storage.saveSettings({ haptics: false })
    storage.saveResult(scenario('a'), score(50))
    storage.resetProgress()
    expect(storage.loadHistory()).toEqual([])
    expect(storage.loadResults()).toEqual({})
    expect(storage.loadSettings().haptics).toBe(false)
  })
})
