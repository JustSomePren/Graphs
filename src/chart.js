import { clamp, fmtDate, fmtMonth, fmtPct, fmtPrice, fmtX } from './format.js'
import { predictAt } from './model.js'

const PAD = { top: 30, right: 52, bottom: 40, left: 6 }
const HISTORY_SHARE = 0.58
const RESERVED = 36

export function createChart(canvas, model, { onChange = () => {} } = {}) {
  const ctx = canvas.getContext('2d')
  const css = getComputedStyle(document.documentElement)
  const color = (name) => css.getPropertyValue(name).trim()

  let mode = 'view'
  let zoom = defaultZoom(model)
  let points = []
  let undoStack = []
  let revealed = false
  let progress = 0
  let tooltip = null
  let band = null
  let dragIndex = null
  let drawing = false
  let width = 0
  let height = 0

  // --- souřadnice ---
  const left = () => PAD.left
  const right = () => width - PAD.right
  const top = () => PAD.top
  const bottom = () => height - PAD.bottom
  const splitX = () => left() + (right() - left()) * HISTORY_SHARE
  const markerY = () => bottom() - 11

  function yRange() {
    let lo = Math.min(...model.history.map((r) => r.price), model.p0 / zoom)
    let hi = Math.max(...model.history.map((r) => r.price), model.p0 * zoom)
    if (revealed) {
      const extra = [...model.future.map((r) => r.price), ...points.map((p) => model.p0 * Math.exp(p.r))]
      lo = Math.min(lo, ...extra)
      hi = Math.max(hi, ...extra)
    }
    const a = Math.log(lo)
    const b = Math.log(hi)
    const pad = (b - a) * 0.04
    return [a - pad, b + pad]
  }

  const xHist = (ts) => left() + ((ts - model.start) / (model.now - model.start)) * (splitX() - left())
  const xFut = (t) => splitX() + t * (right() - splitX())
  const xOf = (ts) => (ts <= model.now ? xHist(ts) : xFut(model.tOf(ts)))
  const y = (price) => {
    const [a, b] = yRange()
    return bottom() - RESERVED - ((Math.log(price) - a) / (b - a)) * (bottom() - top() - RESERVED)
  }
  const yR = (r) => y(model.p0 * Math.exp(r))
  const rOfY = (py) => {
    const [a, b] = yRange()
    const logPrice = a + ((bottom() - RESERVED - py) / (bottom() - top() - RESERVED)) * (b - a)
    return logPrice - Math.log(model.p0)
  }
  const tOfX = (x) => clamp((x - splitX()) / (right() - splitX()), 0, 1)

  // --- kreslení ---
  function render() {
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    ctx.clearRect(0, 0, width, height)

    ctx.fillStyle = color('--zone')
    ctx.fillRect(splitX(), top(), right() - splitX(), bottom() - top())

    drawGrid()
    drawDateLabels()

    ctx.setLineDash([4, 4])
    line([[splitX(), top()], [splitX(), bottom()]], color('--muted'), 1)
    ctx.setLineDash([])
    ctx.fillStyle = color('--muted')
    ctx.font = '600 11px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('DNES', splitX(), top() - 8)

    drawBand()
    line(model.history.map((r) => [xHist(r.ts), y(r.price)]), color('--text'), 1.6)

    if (revealed) {
      const shown = model.future.filter((r) => r.t <= progress)
      const end = shown.at(-1)
      const c = end && end.price >= model.p0 ? color('--up') : color('--down')
      line([[splitX(), y(model.p0)], ...shown.map((r) => [xFut(r.t), y(r.price)])], c, 2.2)
    }

    drawPrediction()
    drawMarkers()
    drawTooltip()
  }

  function line(pts, stroke, w) {
    if (pts.length < 2) return
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (const [px, py] of pts.slice(1)) ctx.lineTo(px, py)
    ctx.strokeStyle = stroke
    ctx.lineWidth = w
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  function drawGrid() {
    const [a, b] = yRange()
    ctx.font = '11px system-ui'
    ctx.textAlign = 'left'
    for (let i = 0; i <= 4; i++) {
      const price = roundNice(Math.exp(a + ((b - a) * (i + 0.5)) / 5))
      const py = y(price)
      line([[left(), py], [right(), py]], color('--grid'), 1)
      if (Math.abs(py - y(model.p0)) < 14) continue
      ctx.fillStyle = color('--muted')
      ctx.fillText('$' + price.toLocaleString('cs-CZ', { maximumFractionDigits: price < 10 ? 1 : 0 }), right() + 5, py + 4)
    }
    ctx.fillStyle = color('--text')
    ctx.font = '600 11px system-ui'
    ctx.fillText(fmtPrice(model.p0), right() + 5, y(model.p0) + 4)
  }

  function drawDateLabels() {
    ctx.fillStyle = color('--muted')
    ctx.font = '11px system-ui'
    const at = (text, x, align) => {
      ctx.textAlign = align
      ctx.fillText(text, x, height - 12)
    }
    at(fmtMonth(model.history[0].date), left(), 'left')
    at(fmtDate(model.s.decisionDate), splitX(), 'center')
    at(fmtDate(model.future.at(-1).date.slice(0, 10)), right(), 'right')
  }

  // Kužel ±1σ: kam se cena při běžné volatilitě dostane zhruba ve 2 ze 3 případů
  function drawBand() {
    if (!band) return
    const steps = Array.from({ length: 31 }, (_, i) => i / 30)
    const upper = steps.map((t) => [xFut(t), yR(band * Math.sqrt(t))])
    const lower = steps.map((t) => [xFut(t), yR(-band * Math.sqrt(t))]).reverse()
    ctx.beginPath()
    ;[...upper, ...lower].forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
    ctx.closePath()
    ctx.fillStyle = color('--band')
    ctx.fill()
  }

  function drawPrediction() {
    if (!points.length) return
    const pts = [[splitX(), y(model.p0)], ...points.map((p) => [xFut(p.t), yR(p.r)])]
    line(pts, color('--accent'), 2.4)
    if (mode === 'points') {
      ctx.fillStyle = color('--accent')
      for (const [px, py] of pts.slice(1)) {
        ctx.beginPath()
        ctx.arc(px, py, mode === 'points' ? 5 : 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    const last = points.at(-1)
    if (!revealed && (drawing || dragIndex != null)) {
      const p = dragIndex != null ? points[dragIndex] : last
      label(`${fmtPct(Math.exp(p.r) - 1)} · ${fmtPrice(model.p0 * Math.exp(p.r))}`, xFut(p.t), yR(p.r) - 18)
    }
  }

  // Popis výsledků: čísla z výkazu a reakce trhu (u budoucích až po odhalení)
  function earningsText(e, future) {
    const lines = [`${e.preliminary ? 'Předběžné údaje' : 'Výsledky'} ${fmtDate(e.date)}${e.afterClose ? ' (po zavření)' : ''}`]
    const snap = e.snapshot
    if (snap) lines.push(`Tržby ${fmtPct(snap.growth)} r/r · P/E ${snap.pe ? fmtX(snap.pe) : '–'}`)
    if (e.reaction != null && (!future || revealed)) lines.push(`Reakce akcie ${fmtPct(e.reaction)}`)
    return lines.join('\n')
  }

  function markers() {
    const list = [
      ...model.earnings
        .filter((e) => e.date >= model.history[0].date.slice(0, 10))
        .map((e) => {
          const future = e.reactionDate > model.s.decisionDate
          return { ts: e.ts, kind: 'E', future, text: earningsText(e, future) }
        }),
      ...model.events.map((e) => ({ ts: e.ts, kind: '•', future: e.date > model.s.decisionDate, text: `${fmtDate(e.date)}: ${e.label}` })),
    ]
    return list.map((m) => ({ ...m, x: xOf(m.ts) }))
  }

  function drawMarkers() {
    ctx.font = '700 9px system-ui'
    ctx.textAlign = 'center'
    for (const m of markers()) {
      const hiddenFuture = m.future && !revealed
      if (hiddenFuture && m.kind !== 'E') continue
      const my = m.kind === 'E' ? markerY() : markerY() - 16
      ctx.beginPath()
      ctx.arc(m.x, my, m.kind === 'E' ? 7 : 4, 0, Math.PI * 2)
      if (hiddenFuture) {
        ctx.setLineDash([2, 2])
        ctx.strokeStyle = color('--accent')
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = color('--accent')
      } else {
        ctx.fillStyle = m.kind === 'E' ? color('--accent') : color('--event')
        ctx.fill()
        ctx.fillStyle = color('--bg')
      }
      if (m.kind === 'E') ctx.fillText('E', m.x, my + 3)
    }
  }

  function label(text, x, ly) {
    ctx.font = '600 12px system-ui'
    const lines = text.split('\n')
    const w = Math.min(width - 4, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 14)
    const h = 8 + lines.length * 16
    const bx = clamp(x - w / 2, 2, width - w - 2)
    const by = clamp(ly - 12, 2, height - h - 2)
    ctx.fillStyle = color('--card')
    ctx.strokeStyle = color('--grid')
    ctx.beginPath()
    ctx.roundRect(bx, by, w, h, 8)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = color('--text')
    ctx.textAlign = 'left'
    lines.forEach((l, i) => ctx.fillText(l, bx + 7, by + 16 + i * 16))
  }

  function drawTooltip() {
    if (!tooltip) return
    if (tooltip.x != null) line([[tooltip.x, top()], [tooltip.x, bottom()]], color('--muted'), 0.8)
    label(tooltip.text, tooltip.x ?? width / 2, 14)
  }

  // --- dotyk ---
  function showTooltip(x, py) {
    if (py > markerY() - 26) {
      const near = markers()
        .filter((m) => revealed || !m.future || m.kind === 'E')
        .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0]
      if (near && Math.abs(near.x - x) < 16) {
        tooltip = { x: near.x, text: near.text }
        return render()
      }
    }
    const visible = revealed ? model.rows : model.history
    const nearest = visible.reduce((m, r) => (Math.abs(xOf(r.ts) - x) < Math.abs(xOf(m.ts) - x) ? r : m))
    const change = nearest.price / model.p0 - 1
    tooltip = {
      x: xOf(nearest.ts),
      text: `${fmtDate(nearest.date)} · ${fmtPrice(nearest.price)}${nearest.date === model.s.decisionDate ? '' : ' · ' + fmtPct(change)}`,
    }
    render()
  }

  function pointer(e) {
    const rect = canvas.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }

  function onDown(e) {
    const [x, py] = pointer(e)
    const canDraw = !revealed && mode !== 'view' && x > splitX() - 12
    if (!canDraw) return showTooltip(x, py)
    tooltip = null
    canvas.setPointerCapture(e.pointerId)
    undoStack.push(points.map((p) => ({ ...p })))
    if (mode === 'finger') {
      drawing = true
      addFreehand(x, py)
    } else {
      const hit = points.findIndex((p) => Math.hypot(xFut(p.t) - x, yR(p.r) - py) < 24)
      if (hit >= 0) dragIndex = hit
      else {
        points.push({ t: tOfX(x), r: rOfY(py) })
        points.sort((a, b) => a.t - b.t)
        dragIndex = points.findIndex((p) => p.t === tOfX(x))
      }
    }
    render()
  }

  function onMove(e) {
    const [x, py] = pointer(e)
    if (drawing) addFreehand(x, py)
    else if (dragIndex != null) {
      const lo = (points[dragIndex - 1]?.t ?? 0) + 0.005
      const hi = (points[dragIndex + 1]?.t ?? 1.005) - 0.005
      points[dragIndex] = { t: clamp(tOfX(x), lo, Math.min(1, hi)), r: rOfY(clamp(py, top(), bottom())) }
    } else if (e.buttons || e.pointerType === 'mouse') {
      if (e.buttons) showTooltip(x, py)
      return
    } else return
    render()
  }

  function onUp() {
    if (!drawing && dragIndex == null) return
    drawing = false
    dragIndex = null
    render()
    onChange(api)
  }

  function addFreehand(x, py) {
    const t = tOfX(x)
    if (t <= 0) return
    points = points.filter((p) => p.t < t)
    points.push({ t, r: rOfY(clamp(py, top(), bottom())) })
  }

  function resize() {
    width = canvas.clientWidth
    height = canvas.clientHeight
    canvas.width = Math.round(width * devicePixelRatio)
    canvas.height = Math.round(height * devicePixelRatio)
    render()
  }

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)

  const api = {
    get points() {
      return points
    },
    get zoom() {
      return zoom
    },
    get complete() {
      return points.length > 0 && points.at(-1).t >= 0.97
    },
    setMode(m) {
      mode = m
      canvas.style.touchAction = m === 'view' ? 'pan-y' : 'none'
      render()
    },
    setBand(sigma) {
      band = sigma
      render()
    },
    setZoom(z) {
      // Při změně měřítka zachová tvar predikce v procentech
      zoom = z
      render()
    },
    undo() {
      if (undoStack.length) points = undoStack.pop()
      render()
      onChange(api)
    },
    clear() {
      undoStack.push(points)
      points = []
      render()
      onChange(api)
    },
    predictAt: (t) => predictAt(points, t),
    reveal(onDone) {
      revealed = true
      mode = 'view'
      canvas.style.touchAction = 'pan-y'
      tooltip = null
      const started = performance.now()
      const step = (now) => {
        progress = Math.min(1, (now - started) / 1400)
        render()
        if (progress < 1) requestAnimationFrame(step)
        else onDone?.()
      }
      requestAnimationFrame(step)
    },
    destroy() {
      observer.disconnect()
    },
  }
  return api
}

export const ZOOMS = [1.5, 2, 3, 6]

function defaultZoom(model) {
  const days = (model.end - model.now) / 86400000
  return days <= 75 ? 1.5 : days <= 140 ? 2 : 3
}

function roundNice(x) {
  const mag = 10 ** Math.floor(Math.log10(x))
  const n = x / mag
  const step = n < 2 ? 0.2 : n < 5 ? 0.5 : 1
  return Math.round(n / step) * step * mag
}
