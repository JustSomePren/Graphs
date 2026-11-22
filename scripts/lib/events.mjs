// Scénáře z událostí: každá událost × firma × horizont
import { DAY, isoDay, toTs } from './fetch.mjs'
import { buildScenario } from './scenario.mjs'
import { companyWords, prettyName, SECTORS } from './auto.mjs'
import { CATEGORIES, events } from '../../scenarios/events.mjs'

export const EVENT_HORIZONS = {
  týden: { days: 7, history: 365 },
  měsíc: { days: 30, history: 365 },
  '3 měsíce': { days: 91, history: 730 },
  '6 měsíců': { days: 182, history: 730 },
  rok: { days: 365, history: 1095 },
  '5 let': { days: 1826, history: 1826 },
}

const DURING = { týden: 'týdne', měsíc: 'měsíce', '3 měsíce': '3 měsíců', '6 měsíců': '6 měsíců', rok: 'roku', '5 let': '5 let' }
const pct = (x) => `${x > 0 ? '+' : ''}${Math.round(x * 100)} %`
const sectorOf = (ticker) => Object.entries(SECTORS).find(([, list]) => list.includes(ticker))

export async function buildEvents() {
  const out = []
  for (const event of events) {
    for (const ticker of event.tickers) {
      const [sector, group] = sectorOf(ticker) ?? ['', []]
      const name = prettyName((await companyWords(ticker))[0])
      for (const horizon of event.horizons) {
        const h = EVENT_HORIZONS[horizon]
        const config = {
          id: `ev-${event.id}-${ticker.toLowerCase()}-${h.days}`,
          event: event.id,
          category: event.category,
          categoryLabel: CATEGORIES[event.category],
          ticker,
          name,
          sector,
          title: event.title,
          horizon,
          peers: group.filter((t) => t !== ticker).slice(0, 2),
          historyStart: isoDay(toTs(event.date) - h.history * DAY),
          decisionDate: event.date,
          endDate: isoDay(toTs(event.date) + h.days * DAY),
          situation: `${event.situation} Odhaduješ, jak se během ${DURING[horizon]} pohne akcie ${name} (${ticker}).`,
          events: event.timeline,
          articles: event.articles,
        }
        try {
          const s = await buildScenario(config, { withInsiders: horizon !== '5 let', compact: true })
          const future = s.series.filter(([d]) => d.slice(0, 10) > s.decisionDate)
          const first = future[0][1] / s.metrics.price - 1
          const total = future.at(-1)[1] / s.metrics.price - 1
          out.push({
            ...s,
            // Den, kdy trh na událost poprvé reagoval (zobrazuje se v seznamu)
            eventDate: future[0][0].slice(0, 10),
            outcome: {
              summary: `${event.outcome.summary} ${name}: první obchodní den ${pct(first)}, za celé období ${pct(total)}.`,
              points: event.outcome.points,
            },
          })
          console.log('  ✓', s.id)
        } catch (e) {
          console.warn('  přeskakuji', config.id, e.message)
        }
      }
    }
  }
  return out
}
