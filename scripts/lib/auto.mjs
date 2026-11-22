// Automaticky generované anonymní scénáře „co udělá akcie po výsledcích“
import { DAY, forget, getJson, isoDay, toTs } from './fetch.mjs'
import { cikFor, earningsDates } from './edgar.mjs'
import { prices } from './prices.mjs'
import { pressRelease } from './press.mjs'
import { buildScenario } from './scenario.mjs'

export const SECTORS = {
  software: ['MSFT', 'ORCL', 'ADBE', 'CRM', 'INTU', 'NOW', 'IBM'],
  polovodiče: ['NVDA', 'AMD', 'INTC', 'QCOM', 'TXN', 'MU', 'AMAT', 'AVGO'],
  internet: ['AMZN', 'GOOGL', 'META', 'NFLX', 'EBAY', 'BKNG', 'PYPL'],
  hardware: ['AAPL', 'CSCO', 'HPQ', 'DELL'],
  maloobchod: ['WMT', 'TGT', 'COST', 'HD', 'LOW', 'BBY', 'TJX', 'DG', 'DLTR'],
  'spotřební zboží': ['KO', 'PEP', 'PG', 'CL', 'KMB', 'MDLZ', 'NKE'],
  restaurace: ['MCD', 'SBUX', 'CMG', 'YUM'],
  zdravotnictví: ['JNJ', 'PFE', 'MRK', 'ABBV', 'LLY', 'AMGN', 'GILD', 'BMY'],
  'zdravotní péče': ['UNH', 'CVS', 'ISRG', 'TMO'],
  průmysl: ['CAT', 'DE', 'BA', 'MMM', 'HON', 'LMT', 'GE', 'RTX'],
  doprava: ['UPS', 'FDX', 'DAL', 'UAL', 'LUV'],
  energetika: ['XOM', 'CVX', 'COP', 'SLB', 'OXY'],
  'platby a finance': ['V', 'MA', 'AXP', 'SCHW'],
  automobily: ['F', 'GM', 'TSLA'],
  'média a telekomunikace': ['DIS', 'CMCSA', 'T', 'VZ', 'TMUS'],
  'cestování a zábava': ['MAR', 'HLT', 'RCL', 'CCL'],
}

const HORIZONS = [
  { days: 7, label: 'týden', history: 365 },
  { days: 30, label: 'měsíc', history: 365 },
  { days: 91, label: '3 měsíce', history: 730 },
]
const PER_COMPANY = 12

// Opakovatelná „náhoda“ – stejné scénáře při každém sestavení
function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// „ADOBE INC“ → „Adobe Inc“ (EDGAR vrací názvy často velkými písmeny)
export const prettyName = (name) => (name === name.toUpperCase() ? name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : name)

const pct = (x) => (x == null ? '–' : `${x > 0 ? '+' : ''}${Math.round(x * 100)} %`)

// Nahradí jméno firmy, aby anonymní režim neprozradil, o koho jde
function scrub(text, words) {
  // Burzovní označení typu „(NYSE: T)“ nebo „(Nasdaq: AAPL)“ prozradí ticker
  text = text.replace(/\(\s*(NYSE|NASDAQ|Nasdaq|NYSE American)\s*:?\s*[A-Z.]{1,5}\s*\)/g, '')
  return words.reduce((t, w) => t.replace(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}('s)?\\b`, 'gi'), 'the Company$1'), text)
}

export async function companyWords(ticker) {
  const cik = await cikFor(ticker)
  const facts = await getJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, `facts-${cik}.json`)
  const full = (facts?.entityName ?? '').replace(/[.,]/g, '').trim()
  const first = full.split(' ')[0]
  return [...new Set([full, first, ticker].filter((w) => w.length > 1))]
}

// Dlouhé horizonty: vlastní generátor náhody, aby se krátké scénáře nezměnily
const LONG_HORIZONS = [
  { days: 182, label: '6 měsíců', history: 730 },
  { days: 365, label: 'rok', history: 1095 },
  { days: 1826, label: '5 let', history: 1826 },
]
const PER_COMPANY_LONG = 4
const DATA_END = '2026-10-01'

export async function buildAuto() {
  const rand = random(42)
  const out = []
  for (const [sector, tickers] of Object.entries(SECTORS)) {
    for (const ticker of tickers) {
      const cik = await cikFor(ticker)
      if (!cik) continue
      const daily = (await prices(ticker, '2012-01-01', '2025-06-30'))?.rows ?? []
      const releases = (await earningsDates(cik, '2012-01-01', '2025-03-31')).filter((e) => !e.preliminary)
      const words = await companyWords(ticker)
      const picks = new Set()
      while (picks.size < Math.min(PER_COMPANY, releases.length)) picks.add(Math.floor(rand() * releases.length))

      const longPicks = new Set()
      const longRand = random(1000 + cik.length + Number(cik.slice(-4)))
      const longFit = releases.filter((r) => isoDay(toTs(r.date) + 1826 * DAY) < DATA_END)
      while (longPicks.size < Math.min(PER_COMPANY_LONG, longFit.length)) longPicks.add(releases.indexOf(longFit[Math.floor(longRand() * longFit.length)]))
      const jobs = [
        ...[...picks].map((i) => ({ i, horizon: HORIZONS[Math.floor(rand() * HORIZONS.length)] })),
        ...[...longPicks].map((i) => ({ i, horizon: LONG_HORIZONS[Math.floor(longRand() * LONG_HORIZONS.length)] })),
      ]

      for (const { i, horizon } of jobs) {
        const release = releases[i]
        // Rozhodujeme na posledním zavření před reakcí trhu
        const decisionDate = release.afterClose ? release.date : daily.findLast((r) => r.date < release.date)?.date
        if (!decisionDate) continue
        const config = {
          id: `auto-${ticker.toLowerCase()}-${release.date}${horizon.days > 120 ? '-' + horizon.days : ''}`,
          auto: true,
          ticker,
          sector,
          name: ticker,
          title: `Výsledky · ${sector}`,
          horizon: horizon.label,
          peers: tickers.filter((t) => t !== ticker).slice(0, 2),
          historyStart: isoDay(toTs(decisionDate) - horizon.history * DAY),
          decisionDate,
          endDate: isoDay(toTs(decisionDate) + horizon.days * DAY),
        }
        try {
          const s = await buildScenario(config, { withInsiders: false, compact: true })
          const target = s.earnings.find((e) => e.date === release.date)
          const now = await pressRelease(release.url).catch(() => null)
          out.push(finish(s, target, now, words))
          console.log('  ✓', s.id)
        } catch (e) {
          console.warn('  přeskakuji', config.id, e.message)
        }
      }
    }
    forget('facts-')
  }
  return out
}

// Doplní automatické texty – situaci a vysvětlení výsledku
function finish(s, target, press, words) {
  const m = s.metrics
  const when = target.afterClose ? 'dnes po zavření burzy' : 'zítra před otevřením burzy'
  const future = s.series.filter(([d]) => d > s.decisionDate)
  const total = future.at(-1)[1] / s.metrics.price - 1
  const anon = (list) => (list ?? []).map((t) => scrub(t, words))

  return {
    ...s,
    situation:
      `Anonymní firma z odvětví ${s.sector}. Zveřejní výsledky ${when}. ` +
      `Za poslední rok akcie ${pct(m.change1y)}, tržby za poslední kvartál ${pct(m.lastQuarterGrowth)} meziročně. ` +
      `Odhaduješ vývoj na ${s.horizon}. Kdo to je, se dozvíš po vyhodnocení.`,
    articles: s.press
      ? [
          { title: 'Minulé výsledky – hlavní body (originál)', body: anon(s.press.highlights).join(' ') || 'Bez výňatku.' },
          { title: 'Výhled vedení z minula (originál)', body: anon(s.press.outlook).join(' ') || 'Firma v tiskové zprávě výhled neuvádí.' },
        ]
      : [],
    press: s.press && { ...s.press, highlights: anon(s.press.highlights), outlook: anon(s.press.outlook) },
    outcome: {
      summary:
        `Šlo o ${prettyName(words[0])} (${s.ticker}). Reakce na výsledky: ${pct(target.reaction)}, za celé období ${pct(total)}.` +
        (target.snapshot?.growth != null ? ` Tržby kvartálu rostly ${pct(target.snapshot.growth)} meziročně.` : ''),
      points: [...(press?.highlights ?? []).slice(0, 2), ...(press?.outlook ?? []).slice(0, 1)],
      english: true,
    },
  }
}
