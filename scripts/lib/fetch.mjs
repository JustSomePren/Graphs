import fs from 'node:fs/promises'
import path from 'node:path'

const UA = 'graphs-game-data-script/1.0 contact@example.com'
const CACHE = '.cache'

export const DAY = 86400000
// Datum může být den (YYYY-MM-DD) nebo hodina (YYYY-MM-DDTHH:MM, UTC)
export const toTs = (date) => Date.parse(date.length > 10 ? date + 'Z' : date + 'T00:00:00Z')
export const isoDay = (ts) => new Date(ts).toISOString().slice(0, 10)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Stáhne URL a uloží do cache, takže opakovaný běh nic nestahuje
const memory = new Map()

async function getCached(url, cacheName, options = {}) {
  if (!memory.has(cacheName)) memory.set(cacheName, load(url, cacheName, options))
  return memory.get(cacheName)
}

async function load(url, cacheName, { json = true, valid = () => true }) {
  const file = path.join(CACHE, cacheName)
  try {
    const text = await fs.readFile(file, 'utf8')
    return json ? JSON.parse(text) : text
  } catch {}
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.status === 404) return null
    const text = res.ok ? await res.text() : null
    const data = text && json ? JSON.parse(text) : text
    if (data && valid(data)) {
      await fs.mkdir(CACHE, { recursive: true })
      await fs.writeFile(file, text)
      await sleep(150)
      return data
    }
    await sleep(2000 * attempt)
  }
  throw new Error('Nepodařilo se stáhnout ' + url)
}

// Uvolní z paměti velké soubory, které už nebudou potřeba
export const forget = (prefix) => [...memory.keys()].filter((k) => k.startsWith(prefix)).forEach((k) => memory.delete(k))

export const getJson = (url, cacheName, valid) => getCached(url, cacheName, { valid })
export const getText = (url, cacheName) => getCached(url, cacheName, { json: false })
