import { getText } from './fetch.mjs'

// Tisková zpráva k výsledkům = příloha EX-99.1 podání 8-K
async function exhibitUrl(folderUrl) {
  const accession = folderUrl.split('/').filter(Boolean).at(-1)
  const dashed = `${accession.slice(0, 10)}-${accession.slice(10, 12)}-${accession.slice(12)}`
  const index = await getText(`${folderUrl}${dashed}-index.html`, `idx-${accession}.html`)
  if (!index) return null
  const rows = index.split(/<tr[^>]*>/i)
  const row = rows.find((r) => /EX-99\.?1?\b/i.test(r) && /href="([^"]+\.htm)"/i.test(r)) ?? rows.find((r) => /EX-99/i.test(r) && /\.htm/i.test(r))
  const href = row?.match(/href="([^"]+\.htm)"/i)?.[1]
  return href ? new URL(href.replace(/^\/ix\?doc=/, ''), 'https://www.sec.gov').href : null
}

export function htmlToText(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|tr|li|h\d|br)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&#x2019;|&rsquo;/gi, "'")
    .replace(/&#8220;|&#8221;|&#x201c;|&#x201d;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#8212;|&#8211;|&#x2014;|&#x2013;|&mdash;|&ndash;/gi, '–')
    .replace(/&#\d+;|&#x[0-9a-f]+;|&\w+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
}

// Dělí na věty, ale ne uvnitř čísel ($7.19) a zkratek (Inc., U.S.)
const sentences = (text) =>
  text
    .replace(/\n/g, ' ')
    .split(/(?<=[a-z0-9%)\]][.!?])\s+(?=[A-Z"(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30)

const BOILERPLATE = /forward-looking|safe harbor|risks and uncertainties|assumptions, uncertainties|non-GAAP financial measures exclude|reconciliation|conference call|webcast|press release|investor relations/i
// Kusy tabulek a rozsypaná sazba („P E L O T O N“) nejsou věty
const isJunk = (s) => (s.match(/\d[\d,.]*/g) ?? []).length > 9 || /(\b\w ){5,}/.test(s) || /EX-99|Three Months Ended|In millions/i.test(s)
const DATELINE = /^[A-Z][A-Za-z .,]+[,–-]\s*\(?\w+ \d{1,2}, \d{4}/
const clip = (s, n) => (s.length > n ? s.slice(0, n).replace(/\s\S*$/, '') + '…' : s)

// Vytáhne z tiskové zprávy hlavní body a výhled vedení
export function extractPress(text) {
  const lines = text.split('\n')
  const start = Math.max(0, lines.findIndex((l) => /(reported|announced|today)/i.test(l) && /(revenue|results|quarter)/i.test(l)))
  const highlights = sentences(lines.slice(start, start + 30).join(' '))
    .filter((s) => /\d/.test(s) && /(revenue|income|earnings|per share|margin|record|subscri|users|deliver|growth|%)/i.test(s))
    .filter((s) => !DATELINE.test(s) && !/today (reported|announced)/i.test(s) && !BOILERPLATE.test(s))
    .slice(0, 8)

  let outlook = []
  const heading = lines.findIndex((l, i) => i > start && /^(business |financial |cfo )?(outlook|guidance)( commentary)?\b/i.test(l) && l.length < 60)
  if (heading >= 0) outlook = sentences(lines.slice(heading + 1, heading + 12).join(' '))
  if (!outlook.length) outlook = sentences(text).filter((s) => /\b(expect|outlook|guidance|forecast)/i.test(s) && /(\$|%|revenue)/i.test(s))
  outlook = outlook.filter((s) => !BOILERPLATE.test(s) && /\d/.test(s)).slice(0, 8)

  const clean = (list) => [...new Set(list)].filter((s) => !isJunk(s)).map((s) => clip(s, 320))
  const h = clean(highlights).slice(0, 4)
  return {
    highlights: h,
    outlook: clean(outlook).filter((s) => !h.includes(s)).slice(0, 4),
  }
}

export async function pressRelease(folderUrl) {
  const url = await exhibitUrl(folderUrl)
  if (!url) return null
  const html = await getText(url, `pr-${url.split('/').slice(-2).join('-')}`)
  if (!html) return null
  return { url, ...extractPress(htmlToText(html)) }
}
