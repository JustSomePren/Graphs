import { describe, expect, it } from 'vitest'
import stories from '../src/data/scenarios.json'
import { signals } from '../src/signals.js'
import { loadAuto } from './helpers.js'
import events from '../src/data/events.json'

// Slova, která hodnotí nebo napovídají vývoj – před odhadem se nesmí objevit
const BANNED = [
  /\blevn[áéýě]/i, /\bdrah[áéýš]/i, /\bšok/i, /\bvrchol/i, /\bkrach/i, /\bkatastrof/i, /\bboom/i, /\bletí\b/i,
  /\bvystřel/i, /\bupadaj/i, /\btrestal/i, /\butíkaj/i, /\bnafoukl/i, /\bslab[ýáéě]/i, /\bsiln[ýáéě]/i,
  /\bzasekl/i, /\brizik/i, /\bvýhodn/i, /\bpodhodnoc/i, /\bnadhodnoc/i, /\bbublin/i, /\bpanik/i, /\bpád/i,
  /\bdno\b/i, /\bvarování před/i, /\bobrat\b/i, /\bprvní pokles/i,
]

// Text, který hráč vidí před vyhodnocením
const beforeGuess = (s) => [s.title, s.situation, ...(s.events ?? []).filter((e) => e.date <= s.decisionDate).map((e) => e.label), ...s.articles.flatMap((a) => [a.title, a.body])].join('\n')

const offending = (text) => BANNED.filter((re) => re.test(text)).map((re) => text.match(re)[0])

describe('neutrální texty před odhadem', () => {
  it.each(stories.map((s) => [s.id, s]))('%s', (_, s) => {
    expect(offending(beforeGuess(s))).toEqual([])
  })

  it('události: situace, titulky, články a minulá časová osa', () => {
    const bad = events.filter((s) => offending(beforeGuess(s)).length).map((s) => `${s.id}: ${offending(beforeGuess(s))}`)
    expect(bad).toEqual([])
  })

  it('automatické scénáře mají neutrální situaci a titulek', () => {
    const bad = loadAuto().filter((s) => offending(`${s.title}\n${s.situation}`).length)
    expect(bad.map((s) => s.id)).toEqual([])
  })

  it('fakta v přehledu nic nehodnotí', () => {
    for (const s of stories) {
      const text = signals(s).map((x) => x.text).join('\n')
      expect(offending(text)).toEqual([])
      expect(signals(s).every((x) => !('tone' in x))).toBe(true)
    }
  })

  it('budoucí události nejsou v seznamu viditelných', () => {
    for (const s of stories) {
      for (const e of s.events ?? []) if (e.date > s.decisionDate) expect(beforeGuess(s)).not.toContain(e.label)
    }
  })
})
