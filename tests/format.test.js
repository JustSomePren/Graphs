import { describe, expect, it } from 'vitest'
import { fmtBig, fmtDate, fmtPct, fmtPrice, fmtX } from '../src/format.js'

const plain = (s) => s.replace(/\s/g, ' ')

describe('formátování', () => {
  it('procenta se znaménkem', () => {
    expect(plain(fmtPct(0.243))).toBe('+24 %')
    expect(plain(fmtPct(-0.055))).toBe('-5,5 %')
    expect(plain(fmtPct(0.2, false))).toBe('20 %')
    expect(fmtPct(null)).toBe('–')
  })

  it('velká čísla', () => {
    expect(plain(fmtBig(1.5e12))).toBe('1,5 bil. $')
    expect(plain(fmtBig(27e9))).toBe('27 mld. $')
    expect(plain(fmtBig(921e6))).toBe('921 mil. $')
  })

  it('ceny, násobky a data', () => {
    expect(plain(fmtPrice(305.38))).toBe('$305,38')
    expect(plain(fmtX(175.53))).toBe('175,5×')
    expect(plain(fmtDate('2023-05-24'))).toBe('24. 5. 2023')
  })
})
