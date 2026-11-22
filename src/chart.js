import { clamp, fmtDate, fmtMonth, fmtPct, fmtPrice, fmtX } from './format.js'
import { predictAt } from './model.js'

const PAD = { top: 30, right: 52, bottom: 46, left: 6 }
const RESERVED = 36
export const ZOOMS = [1.5, 2, 3, 6]

// Osa x je „svět“: historie zabírá úsek 0–1, budoucnost 1 až 1 + future.
// Graf ukazuje jen okno [x0, x1] a dá se posouvat a přibližovat.
export function createChart(canvas, model, { onChange = () => {}, layout = 'inline', points: initial = [] } = {}) {
  const ctx = canvas.getContext('2d')
  const css = getComputedStyle(document.documentElement)
  const color = (name) => css.getPropertyValue(name).trim()

  // Výchozí pohled: jen historie přes celou šířku. Při malování se okno přesune na budoucnost.
  const future = 1
  const worldEnd = 1 + future
  let view = { x0: 0, x1: 1 }
  let layers = { market: false, ma50: false, ma200: false, guides: true }
  let animation = null

  let mode = 'view'
  let zoom = defaultZoom(model)
  let points = initial.map((p) => ({ ...p }))
  let undoStack = []
  let revealed = false
  let progress = 0
  let tooltip = null
  let band = null
  let dragIndex = null
  let drawing = false
  let width = 0
  let height = 0
  let yr = baseRange()
  const pointers = new Map()
  let gesture = null

  // --- rozsah osy y (logaritmicky) ---
  function baseRange() {
    let lo = Math.min(...model.history.map((r) => r.price), model.p0 / zoom)
    let hi = Math.max(...model.history.map((r) => r.price), model.p0 * zoom)
    const extra = [...points.map((p) => model.p0 * Math.exp(p.r)), ...(revealed ? model.future.map((r) => r.price) : [])]
    if (extra.length) {
      lo = Math.min(lo, ...extra)
      hi = Math.max(hi, ...extra)
    }
    const a = Math.log(lo)
    const b = Math.log(hi)
    const pad = (b - a) * 0.04
    return { a: a - pad, b: b + pad }
  }

  // --- souřadnice ---
  const left = () => PAD.left
  const right = () => width - PAD.right
  const top = () => PAD.top
  const bottom = () => height - PAD.bottom
  const plotH = () => bottom() - top() - RESERVED
  const markerY = () => bottom() - 11

  const worldOfTs = (ts) => (ts <= model.now ? (ts - model.start) / (model.now - model.start) : 1 + model.tOf(ts) * future)
  const worldOfT = (t) => 1 + t * future
  const X = (w) => left() + ((w - view.x0) / (view.x1 - view.x0)) * (right() - left())
  const worldOfX = (px) => view.x0 + ((px - left()) / (right() - left())) * (view.x1 - view.x0)
  const tOfX = (px) => clamp((worldOfX(px) - 1) / future, 0, 1)
  const xOf = (ts) => X(worldOfTs(ts))
  const xFut = (t) => X(worldOfT(t))
  const splitX = () => X(1)

  const y = (price) => bottom() - RESERVED - ((Math.log(price) - yr.a) / (yr.b - yr.a)) * plotH()
  const yR = (r) => y(model.p0 * Math.exp(r))
  const rOfY = (py) => yr.a + ((bottom() - RESERVED - py) / plotH()) * (yr.b - yr.a) - Math.log(model.p0)

  // --- kreslení ---
  function render() {
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    ctx.clearRect(0, 0, width, height)

    ctx.save()
    ctx.beginPath()
    ctx.rect(left(), top() - 4, right() - left(), bottom() - top() + 4)
    ctx.clip()

    ctx.fillStyle = color('--zone')
    ctx.fillRect(splitX(), top(), right() - splitX(), bottom() - top())
    drawGrid()

    ctx.setLineDash([4, 4])
    line([[splitX(), top()], [splitX(), bottom()]], color('--muted'), 1)
    ctx.setLineDash([])

    drawBand()
    drawGuides()
    drawLayers()
    line(model.history.map((r) => [xOf(r.ts), y(r.price)]), color('--text'), 1.6)

    if (revealed) {
      const shown = model.future.filter((r) => r.t <= progress)
      const end = shown.at(-1)
      const c = end && end.price >= model.p0 ? color('--up') : color('--down')
      line([[splitX(), y(model.p0)], ...shown.map((r) => [xFut(r.t), y(r.price)])], c, 2.2)
    }

    drawPrediction()
    drawMarkers()
    ctx.restore()

    drawAxis()
    drawMinimap()
    drawTooltip()

    // Stav okna pro testy a čtečky: viditelný úsek osy a horní hrana jako násobek dnešní ceny
    canvas.dataset.x0 = view.x0.toFixed(3)
    canvas.dataset.x1 = view.x1.toFixed(3)
    canvas.dataset.top = Math.exp(yr.b - Math.log(model.p0)).toFixed(2)
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

  function gridPrices() {
    const out = []
    for (let i = 0; i <= 4; i++) out.push(roundNice(Math.exp(yr.a + ((yr.b - yr.a) * (i + 0.5)) / 5)))
    return out
  }

  function drawGrid() {
    for (const price of gridPrices()) line([[left(), y(price)], [right(), y(price)]], color('--grid'), 1)
  }

  function drawAxis() {
    ctx.font = "11px 'IBM Plex Mono', monospace"
    ctx.textAlign = 'left'
    ctx.fillStyle = color('--muted')
    for (const price of gridPrices()) {
      const py = y(price)
      if (Math.abs(py - y(model.p0)) < 14 || py < top() || py > bottom() - RESERVED + 6) continue
      ctx.fillText('$' + price.toLocaleString('cs-CZ', { maximumFractionDigits: price < 10 ? 1 : 0 }), right() + 5, py + 4)
    }
    const p0y = y(model.p0)
    if (p0y > top() && p0y < bottom()) {
      ctx.fillStyle = color('--text')
      ctx.font = "500 11px 'IBM Plex Mono', monospace"
      ctx.fillText(fmtPrice(model.p0), right() + 5, p0y + 4)
    }

    // Data pod grafem: začátek okna, dnešek (pokud je vidět) a konec okna
    ctx.font = "11px 'IBM Plex Mono', monospace"
    ctx.fillStyle = color('--muted')
    const dateAt = (w) => {
      if (w <= 1) return model.history[Math.round(clamp(w, 0, 1) * (model.history.length - 1))].date
      const t = clamp((w - 1) / future, 0, 1)
      return model.future.findLast((r) => r.t <= t + 1e-9)?.date ?? model.s.decisionDate
    }
    const at = (text, x, align) => {
      ctx.textAlign = align
      ctx.fillText(text, x, height - 18)
    }
    const sx = splitX()
    const showToday = sx > left() + 40 && sx < right() - 40
    // Krajní datum se nekreslí, pokud by se překrylo s dneškem
    if (!showToday || sx - left() > 110) at(fmtMonth(dateAt(Math.max(0, view.x0)).slice(0, 10)), left(), 'left')
    if (showToday) at(fmtDate(model.s.decisionDate), sx, 'center')
    if (!showToday || right() - sx > 110) at(fmtDate(dateAt(Math.min(worldEnd, view.x1)).slice(0, 10)), right(), 'right')
    if (sx > left() && sx < right()) {
      ctx.font = "500 11px 'IBM Plex Mono', monospace"
      ctx.textAlign = 'center'
      ctx.fillText('DNES', sx, top() - 8)
    }
  }

  // Tenký pruh dole: kde je okno v celé časové ose (jen když není vidět celá)
  function drawMinimap() {
    if (view.x0 <= 0.001 && view.x1 >= worldEnd - 0.001) return
    const w = right() - left()
    const yy = height - 6
    ctx.fillStyle = color('--grid')
    ctx.fillRect(left(), yy, w, 3)
    ctx.fillStyle = color('--zone')
    ctx.fillRect(left() + (1 / worldEnd) * w, yy - 1, (future / worldEnd) * w, 5)
    ctx.fillStyle = color('--accent')
    ctx.fillRect(left() + (Math.max(0, view.x0) / worldEnd) * w, yy, ((Math.min(worldEnd, view.x1) - Math.max(0, view.x0)) / worldEnd) * w, 3)
  }

  // Klouzavý průměr za N obchodních dní (časovým oknem – funguje i u zředěných řad), spočítá se jednou
  const averages = {}
  function movingAverage(n) {
    if (averages[n]) return averages[n]
    const span = n * 1.45 * 86400000
    const rows = model.history
    averages[n] = rows
      .map((r, i) => {
        if (r.ts - rows[0].ts < span) return null
        let sum = 0
        let count = 0
        for (let j = i; j >= 0 && r.ts - rows[j].ts <= span; j--) {
          sum += rows[j].price
          count++
        }
        return { ts: r.ts, price: sum / count }
      })
      .filter(Boolean)
    return averages[n]
  }

  function drawLayers() {
    if (layers.market && model.market.length) {
      const visible = revealed ? model.market : model.market.filter((r) => r.ts <= model.now)
      ctx.setLineDash([5, 3])
      line(visible.map((r) => [xOf(r.ts), y(r.price)]), color('--index'), 1.4)
      ctx.setLineDash([])
    }
    for (const [n, key, c] of [[50, 'ma50', '--ma1'], [200, 'ma200', '--ma2']]) {
      if (layers[key]) line(movingAverage(n).map((r) => [xOf(r.ts), y(r.price)]), color(c), 1.3)
    }
  }

  // Procentní vodítka v zóně budoucnosti: pomáhají kreslit konkrétní pohyb
  function drawGuides() {
    if (!layers.guides || (mode !== 'finger' && mode !== 'points')) return
    const span = yr.b - yr.a
    const steps = span > 1.6 ? [-0.5, 0.5, 1, 2] : span > 0.8 ? [-0.3, -0.2, 0.2, 0.3, 0.5] : [-0.2, -0.1, 0.1, 0.2]
    ctx.font = "10px 'IBM Plex Mono', monospace"
    ctx.textAlign = 'left'
    for (const step of [0, ...steps]) {
      const py = yR(Math.log(1 + step))
      if (py < top() || py > bottom() - RESERVED) continue
      ctx.setLineDash(step === 0 ? [] : [2, 4])
      line([[splitX(), py], [right(), py]], color(step === 0 ? '--muted' : '--grid-strong'), step === 0 ? 0.8 : 1)
      ctx.setLineDash([])
      ctx.fillStyle = color('--muted')
      ctx.fillText(step === 0 ? '0 %' : `${step > 0 ? '+' : ''}${Math.round(step * 100)} %`, splitX() + 6, py - 3)
    }
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
        ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    if (!revealed && (drawing || dragIndex != null)) {
      const p = dragIndex != null ? points[dragIndex] : points.at(-1)
      label(`${fmtPct(Math.exp(p.r) - 1)} · ${fmtPrice(model.p0 * Math.exp(p.r))}`, xFut(p.t), yR(p.r) - 18)
    }
  }

  // Popis výsledků: čísla z výkazu a reakce trhu (u budoucích až po odhalení)
  function earningsText(e, isFuture) {
    const lines = [`${e.preliminary ? 'Předběžné údaje' : 'Výsledky'} ${fmtDate(e.date)}${e.afterClose ? ' (po zavření)' : ''}`]
    const snap = e.snapshot
    if (snap) lines.push(`Tržby ${fmtPct(snap.growth)} r/r · P/E ${snap.pe ? fmtX(snap.pe) : '–'}`)
    if (e.reaction != null && (!isFuture || revealed)) lines.push(`Reakce akcie ${fmtPct(e.reaction)}`)
    return lines.join('\n')
  }

  function markers() {
    const list = [
      ...model.earnings
        .filter((e) => e.date >= model.history[0].date.slice(0, 10))
        .map((e) => {
          const isFuture = e.reactionDate > model.s.decisionDate
          return { ts: e.ts, kind: 'E', future: isFuture, text: earningsText(e, isFuture) }
        }),
      ...model.events.map((e) => ({ ts: e.ts, kind: '•', future: e.date > model.s.decisionDate, text: `${fmtDate(e.date)}: ${e.label}` })),
    ]
    return list.map((m) => ({ ...m, x: xOf(m.ts) }))
  }

  function drawMarkers() {
    ctx.font = "600 9px 'IBM Plex Sans', system-ui"
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
    ctx.font = "500 12px 'IBM Plex Sans', system-ui"
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

  // --- posun a přiblížení ---
  function panBy(dx, dy) {
    const span = view.x1 - view.x0
    const dw = (-dx / (right() - left())) * span
    const x0 = clamp(view.x0 + dw, -0.05, worldEnd + 0.05 - span)
    view = { x0, x1: x0 + span }
    const dl = (dy / plotH()) * (yr.b - yr.a)
    yr = { a: yr.a + dl, b: yr.b + dl }
  }

  function zoomX(factor, centerPx) {
    const span = clamp((view.x1 - view.x0) / factor, 0.15, worldEnd + 0.1)
    const c = worldOfX(centerPx)
    const ratio = (c - view.x0) / (view.x1 - view.x0)
    const x0 = clamp(c - ratio * span, -0.05, Math.max(-0.05, worldEnd + 0.05 - span))
    view = { x0, x1: x0 + span }
  }

  // Při kreslení u okraje se rozsah rozšíří a okno posune – lze kreslit mimo původní graf
  function followEdges(px, py) {
    const edge = plotH() * 0.07
    const step = (yr.b - yr.a) * 0.008
    // Strop: nejvýš 30× nad a pod dnešní cenu
    const limit = Math.log(30)
    const p0 = Math.log(model.p0)
    if (py < top() + edge) yr = { ...yr, b: Math.min(yr.b + step, p0 + limit) }
    if (py > bottom() - RESERVED - edge) yr = { ...yr, a: Math.max(yr.a - step, p0 - limit) }
    const span = view.x1 - view.x0
    if (px > right() - (right() - left()) * 0.08 && view.x1 < worldEnd + 0.04) {
      const x0 = Math.min(view.x0 + span * 0.012, worldEnd + 0.05 - span)
      view = { x0, x1: x0 + span }
    }
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

  const pointer = (e) => {
    const rect = canvas.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }

  function startGesture() {
    const [a, b] = [...pointers.values()]
    gesture = { mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], dist: Math.abs(a[0] - b[0]) || 1 }
  }

  function onDown(e) {
    const [x, py] = pointer(e)
    pointers.set(e.pointerId, [x, py])
    canvas.setPointerCapture(e.pointerId)

    // Dva prsty = posun a přiblížení, rozdělaná čára se ukončí
    if (pointers.size === 2) {
      if (drawing || dragIndex != null) {
        drawing = false
        dragIndex = null
        onChange(api)
      }
      return startGesture()
    }
    const canDraw = !revealed && (mode === 'finger' || mode === 'points') && worldOfX(x) > 1 - 0.02
    // Mimo kreslení jeden prst posouvá graf, krátké klepnutí ukáže hodnotu
    if (!canDraw) {
      gesture = { last: [x, py], start: [x, py], moved: false }
      return
    }
    tooltip = null
    undoStack.push(points.map((p) => ({ ...p })))
    if (mode === 'finger') {
      drawing = true
      addFreehand(x, py)
    } else {
      const hit = points.findIndex((p) => Math.hypot(xFut(p.t) - x, yR(p.r) - py) < 24)
      if (hit >= 0) dragIndex = hit
      else {
        const t = tOfX(x)
        points.push({ t, r: rOfY(py) })
        points.sort((a, b) => a.t - b.t)
        dragIndex = points.findIndex((p) => p.t === t)
      }
    }
    render()
  }

  function onMove(e) {
    if (!pointers.has(e.pointerId)) {
      if (e.pointerType === 'mouse' && !revealed && mode === 'view') return
      return
    }
    const [x, py] = pointer(e)
    pointers.set(e.pointerId, [x, py])

    if (pointers.size === 2 && gesture?.mid) {
      const [a, b] = [...pointers.values()]
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      const dist = Math.abs(a[0] - b[0]) || 1
      panBy(mid[0] - gesture.mid[0], mid[1] - gesture.mid[1])
      if (Math.abs(dist / gesture.dist - 1) > 0.01) zoomX(dist / gesture.dist, mid[0])
      gesture = { mid, dist }
      return render()
    }
    if (gesture?.last) {
      if (Math.hypot(x - gesture.start[0], py - gesture.start[1]) > 6) gesture.moved = true
      if (!gesture.moved) return
      // Na výšku jen vodorovně – svislý pohyb zůstává stránce na rolování
      panBy(x - gesture.last[0], layout === 'full' ? py - gesture.last[1] : 0)
      gesture.last = [x, py]
      tooltip = null
      return render()
    }
    if (drawing) {
      followEdges(x, py)
      addFreehand(x, py)
    } else if (dragIndex != null) {
      followEdges(x, py)
      const lo = (points[dragIndex - 1]?.t ?? 0) + 0.005
      const hi = (points[dragIndex + 1]?.t ?? 1.005) - 0.005
      points[dragIndex] = { t: clamp(tOfX(x), lo, Math.min(1, hi)), r: rOfY(py) }
    } else return
    render()
  }

  function onUp(e) {
    pointers.delete(e.pointerId)
    if (gesture?.last && !gesture.moved && e.type === 'pointerup') showTooltip(...gesture.start)
    if (pointers.size < 2) gesture = null
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
    points.push({ t, r: rOfY(py) })
  }

  // Celá budoucnost + kousek historie, aby byl vidět bod „dnes“, odkud se kreslí
  const futureView = () => ({ x0: 1 - future * 0.14, x1: worldEnd + future * 0.03 })

  // Plynulý přesun okna
  function animateTo(target) {
    cancelAnimationFrame(animation)
    const from = { ...view }
    const started = performance.now()
    const step = (now) => {
      const k = Math.min(1, (now - started) / 420)
      const e = 1 - (1 - k) ** 3
      view = { x0: from.x0 + (target.x0 - from.x0) * e, x1: from.x1 + (target.x1 - from.x1) * e }
      render()
      if (k < 1) animation = requestAnimationFrame(step)
    }
    animation = requestAnimationFrame(step)
  }

  function onWheel(e) {
    e.preventDefault()
    const [x] = pointer(e)
    if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) * 2) zoomX(e.deltaY < 0 ? 1.1 : 1 / 1.1, x)
    else panBy(-e.deltaX, 0)
    render()
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
  if (layout === 'full') canvas.addEventListener('wheel', onWheel, { passive: false })
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)

  const api = {
    get points() {
      return points
    },
    get zoom() {
      return zoom
    },
    get view() {
      return { ...view, end: worldEnd }
    },
    get complete() {
      return points.length > 0 && points.at(-1).t >= 0.97
    },
    setPoints(list) {
      points = list.map((p) => ({ ...p }))
      yr = baseRange()
      render()
    },
    setMode(m) {
      mode = m
      const drawingMode = m === 'finger' || m === 'points'
      canvas.style.touchAction = !drawingMode && layout === 'inline' ? 'pan-y' : 'none'
      // Při malování se okno přesune na budoucnost s kouskem historie
      if (drawingMode && !revealed && view.x1 < 1 + future * 0.6) animateTo(futureView())
      else render()
    },
    setLayers(patch) {
      layers = { ...layers, ...patch }
      render()
    },
    get layers() {
      return layers
    },
    setZoom(z) {
      zoom = z
      yr = baseRange()
      render()
    },
    setBand(sigma) {
      band = sigma
      render()
    },
    // Posun okna: do budoucnosti (na kreslení) nebo na celou osu
    showFuture() {
      animateTo(futureView())
    },
    showHistory() {
      animateTo({ x0: 0, x1: 1 })
    },
    showAll() {
      yr = baseRange()
      animateTo({ x0: 0, x1: worldEnd })
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
      view = { x0: 0, x1: worldEnd }
      yr = baseRange()
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
