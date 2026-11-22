export const DAY = 86400000
export const toTs = (date) => Date.parse(date.length > 10 ? date + 'Z' : date + 'T00:00:00Z')

const czDate = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' })
const czShort = new Intl.DateTimeFormat('cs-CZ', { month: 'short', year: '2-digit', timeZone: 'UTC' })

const czTime = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })

// U hodinových bodů ukáže i čas (newyorský, jak běží burza)
export const fmtDate = (date) => (date.length > 10 ? czTime.format(new Date(toTs(date))) + ' NY' : czDate.format(new Date(toTs(date))))
export const fmtMonth = (date) => czShort.format(new Date(toTs(date)))

export function fmtPrice(x) {
  if (x == null || !isFinite(x)) return '–'
  const digits = x >= 1000 ? 0 : x >= 10 ? 2 : 3
  return '$' + x.toLocaleString('cs-CZ', { minimumFractionDigits: Math.min(digits, 2), maximumFractionDigits: digits })
}

export function fmtPct(x, sign = true) {
  if (x == null || !isFinite(x)) return '–'
  const s = (x * 100).toLocaleString('cs-CZ', { maximumFractionDigits: Math.abs(x) < 0.1 ? 1 : 0 })
  return (sign && x > 0 ? '+' : '') + s + ' %'
}

export function fmtBig(x) {
  if (x == null || !isFinite(x)) return '–'
  const abs = Math.abs(x)
  if (abs >= 1e12) return (x / 1e12).toLocaleString('cs-CZ', { maximumFractionDigits: 2 }) + ' bil. $'
  if (abs >= 1e9) return (x / 1e9).toLocaleString('cs-CZ', { maximumFractionDigits: 1 }) + ' mld. $'
  return (x / 1e6).toLocaleString('cs-CZ', { maximumFractionDigits: 0 }) + ' mil. $'
}

export const fmtX = (x) => (x == null || !isFinite(x) ? '–' : x.toLocaleString('cs-CZ', { maximumFractionDigits: 1 }) + '×')

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x))

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v)
    else if (v != null && v !== false) node.setAttribute(k, v)
  }
  for (const c of children.flat()) if (c != null && c !== false) node.append(c)
  return node
}
