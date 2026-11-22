// End-to-end test na rozlišení Pixelu: projde všechny scénáře jako hráč.
// Spuštění: npm run test:e2e (potřebuje sestavený web a nainstalovaný Playwright)
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { preview } from 'vite'
import scenarios from '../src/data/scenarios.json' with { type: 'json' }

const { chromium } = createRequire(import.meta.url)('playwright')
const PIXEL = { viewport: { width: 412, height: 892 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }

const server = await preview({ preview: { port: 4174 } })
const url = 'http://localhost:4174'
const browser = await chromium.launch()
let failed = 0

async function test(name, fn) {
  const context = await browser.newContext(PIXEL)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: url })
  // V testech chceme sdílení přes schránku, ne systémový dialog
  await context.addInitScript(() => delete Navigator.prototype.share)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  try {
    await page.goto(url)
    await fn(page)
    assert.deepEqual(errors, [], 'chyby v konzoli')
    console.log('✓', name)
  } catch (e) {
    failed++
    console.log('✗', name, '\n ', e.message.split('\n')[0])
  }
  await context.close()
}

// Přepne režim a nakreslí do zóny budoucnosti podle aktuálního okna grafu (data-x0/x1)
async function geometry(page, selector = 'canvas.chart') {
  const canvas = page.locator(selector)
  await canvas.scrollIntoViewIfNeeded()
  const c = await canvas.boundingBox()
  const x0 = Number(await canvas.getAttribute('data-x0'))
  const x1 = Number(await canvas.getAttribute('data-x1'))
  return { c, X: (w) => c.x + 6 + ((w - x0) / (x1 - x0)) * (c.width - 58), y: (f) => c.y + c.height * f }
}

async function switchMode(page, label) {
  await page.click(`.segmented.modes button:has-text("${label}")`)
  await page.waitForTimeout(550)
}

async function drawFinger(page, shape) {
  await switchMode(page, 'Malovat')
  const g = await geometry(page)
  await page.mouse.move(g.X(1.004), g.y(shape(0)))
  await page.mouse.down()
  for (let i = 1; i <= 24; i++) await page.mouse.move(g.X(1 + i / 24), g.y(shape(i / 24)), { steps: 2 })
  await page.mouse.up()
}

async function drawPoints(page, points) {
  await switchMode(page, 'Body')
  const g = await geometry(page)
  for (const [t, f] of points) await page.touchscreen.tap(g.X(1 + t), g.y(f))
}

const noHorizontalScroll = async (page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert.ok(overflow <= 0, `stránka přetéká do strany o ${overflow}px`)
}

await test('domovská obrazovka ukazuje všechny scénáře', async (page) => {
  assert.equal(await page.locator('.wl-row').count(), scenarios.length)
  await noHorizontalScroll(page)
})

await test('filtr podle horizontu', async (page) => {
  await page.click('.chips button:text-is("Krátké")')
  const short = await page.locator('.wl-row').count()
  await page.click('.chips button:text-is("Dlouhé")')
  const long = await page.locator('.wl-row').count()
  assert.ok(short > 0 && long > 0 && short + long < scenarios.length)
})

await test('úvodní nápověda jde zavřít a nevrátí se', async (page) => {
  await page.click('.intro .link')
  await page.reload()
  assert.equal(await page.locator('.intro').count(), 0)
})

for (const [i, s] of scenarios.entries()) {
  await test(`scénář ${s.id}: analýza, kreslení a vyhodnocení`, async (page) => {
    await page.click(`.wl-row:has-text("${s.title}")`)
    for (const tab of ['Data', 'Konkurence', 'Články', 'Přehled']) {
      await page.click(`.tabs button:has-text("${tab}")`)
      assert.ok((await page.locator('.pane').innerText()).length > 50, `prázdná záložka ${tab}`)
    }
    assert.ok((await page.locator('.signals li').count()) >= 10, 'málo faktů v přehledu')
    await noHorizontalScroll(page)

    const button = page.locator('.action-bar .primary')
    assert.equal(await button.isDisabled(), true, 'vyhodnotit jde bez kresby')

    // Střídáme způsob zadání: prst / body
    if (i % 2) await drawPoints(page, [[0.3, 0.4], [0.7, 0.3], [1, 0.35]])
    else await drawFinger(page, (t) => 0.45 - 0.1 * Math.sin(t * 3))
    assert.equal(await button.isDisabled(), false, 'po nakreslení nejde vyhodnotit')

    await button.click()
    await page.waitForSelector('.result', { timeout: 5000 })
    const total = Number(await page.locator('.score-big').innerText())
    assert.ok(total >= 0 && total <= 115, `skóre mimo rozsah: ${total}`)
    assert.ok((await page.locator('.result').innerText()).includes('Proč to dopadlo'))
    assert.equal(await page.locator('.toolbar').count(), 0, 'po vyhodnocení jde dál kreslit')
  })
}

await test('hodinová data: graf i vyhodnocení', async (page) => {
  await page.click('.wl-row:has-text("DeepSeek R1")')
  assert.equal(await page.locator('.legend .pill').innerText(), 'hodinová data')
  await drawFinger(page, (t) => 0.5 + 0.1 * t)
  await page.click('.primary')
  await page.waitForSelector('.result')
  // Propad a následný odraz v hodinových datech se musí objevit jako kontrolní body tvaru
  assert.match(await page.locator('.checks').innerText(), /Pokles [\s\S]*Růst/)
})

await test('minulé výsledky: tabulka a popis v grafu', async (page) => {
  await page.click('.wl-row:has-text("Meta před výsledky Q4 2022")')
  await page.click('.tabs button:has-text("Data")')
  const table = await page.locator('.section:has-text("Minulé výsledky") table').innerText()
  assert.match(table, /-24,6 %|−24,6 %|-25 %/)
  await page.click('.tabs button:has-text("Články")')
  assert.ok((await page.locator('.pane').innerText()).includes('Tisková zpráva'))
})

await test('rychlá hra: anonymní firma a odhalení jména', async (page) => {
  await page.click('.main-tabs button:has-text("Rychlá hra")')
  await page.click('.quick .primary')
  await page.waitForSelector('canvas')
  const before = await page.locator('main').innerText()
  assert.ok(before.includes('Anonymní firma'), 'chybí anonymní označení')
  await page.click('.tabs button:has-text("Konkurence")')
  assert.ok((await page.locator('.peers').innerText()).includes('Tato firma'), 'v konkurenci chybí „Tato firma“')
  assert.equal(await page.locator('.pane a').count(), 0, 'odkaz na SEC by prozradil firmu')
  await drawFinger(page, () => 0.42)
  await page.click('.primary')
  await page.waitForSelector('.result')
  assert.match(await page.locator('.result').innerText(), /Šlo o .+\([A-Z.]+\)/)
  await page.click('.primary:has-text("Další firma")')
  await page.waitForSelector('.result', { state: 'detached' })
  assert.ok((await page.locator('main').innerText()).includes('Anonymní firma'), 'další firma není anonymní')
})

await test('rychlá hra: 10 náhodných firem za sebou (různé části datasetu)', async (page) => {
  await page.click('.main-tabs button:has-text("Rychlá hra")')
  await page.click('.quick .primary')
  const seen = new Set()
  for (let i = 0; i < 10; i++) {
    await page.waitForSelector('.toolbar')
    seen.add(await page.locator('.topbar small').innerText())
    await drawFinger(page, (t) => 0.45 - 0.05 * t)
    await page.click('.primary')
    await page.waitForSelector('.result')
    assert.match(await page.locator('.result').innerText(), /Šlo o /)
    await page.click('.primary:has-text("Další firma")')
    await page.waitForSelector('.result', { state: 'detached' })
  }
  assert.ok(seen.size >= 8, `málo různých scénářů: ${seen.size}`)
})

await test('profil: hodnost, odznaky a historie po hře', async (page) => {
  await page.click('.wl-row >> nth=0')
  await drawFinger(page, () => 0.4)
  await page.click('.primary')
  await page.waitForSelector('.result')
  assert.ok((await page.locator('.new-badges').innerText()).includes('První odhad'))
  await page.click('[aria-label="Zpět na seznam"]')
  await page.waitForSelector('.strip')
  assert.match(await page.locator('.strip').innerText(), /1\/7/)
  await page.click('[aria-label="Statistiky"]')
  assert.ok((await page.locator('.badge-chip:not(.locked)').count()) >= 1)
  assert.equal(await page.locator('.history .row').count(), 1)
})

await test('přehled: klíčová čísla, roční rozpětí a signály', async (page) => {
  await page.click('.wl-row:has-text("Target před výsledky")')
  assert.equal(await page.locator('.tile').count(), 8)
  assert.equal(await page.locator('.range').count(), 1)
  assert.ok((await page.locator('.signals li').count()) >= 12)
  assert.match(await page.locator('.pane').innerText(), /Fakta v kostce/i)
  // Před odhadem žádné hodnocení ani barevné zvýraznění dobře/špatně
  assert.equal(await page.locator('.analysis .up, .analysis .down, .signals li.good, .signals li.bad').count(), 0)
  assert.doesNotMatch(await page.locator('main').innerText(), /levná|drahá|riziko|pozitivních|negativních/i)
})

await test('pásmo běžného pohybu se zapne a zapamatuje', async (page) => {
  await page.click('.wl-row:has-text("Target před výsledky")')
  const band = page.locator('[aria-label="Pásmo běžného pohybu"]')
  await band.click()
  assert.equal(await band.getAttribute('aria-pressed'), 'true')
  await page.click('[aria-label="Zpět na seznam"]')
  await page.click('.wl-row:has-text("Boeing po incidentu")')
  assert.equal(await page.locator('[aria-label="Pásmo běžného pohybu"]').getAttribute('aria-pressed'), 'true')
})

await test('sdílení výsledku a srovnání s rovnou čárou', async (page) => {
  await page.click('.wl-row >> nth=1')
  await drawFinger(page, () => 0.4)
  await page.click('.primary')
  await page.waitForSelector('.result')
  assert.match(await page.locator(".naive").innerText(), /rovn/i)
  await page.click('.secondary:has-text("Sdílet")')
  await page.waitForSelector('.secondary:has-text("Zkopírováno")')
  const text = await page.evaluate(() => navigator.clipboard.readText())
  assert.match(text, /Kam to půjde\?[\s\S]*Realita/)
})

await test('denní výzva: odehrání a označení jako splněné', async (page) => {
  await page.waitForSelector('.daily small:not(:text("Načítám…"))')
  await page.click('.daily')
  await page.waitForSelector('canvas')
  assert.match(await page.locator('.topbar strong').innerText(), /Denní výzva/)
  await drawFinger(page, () => 0.42)
  await page.click('.primary')
  await page.waitForSelector('.result')
  await page.goto(url)
  assert.match(await page.locator('.daily').innerText(), /splněna/)
})

await test('statistiky po hře a nastavení motivu', async (page) => {
  await page.click('[aria-label="Statistiky"]')
  assert.match(await page.locator('main').innerText(), /Zatím žádné hry/)
  await page.goBack()
  await page.click('.wl-row >> nth=0')
  await drawFinger(page, () => 0.4)
  await page.click('.primary')
  await page.waitForSelector('.result')
  await page.goto(url)
  await page.click('[aria-label="Statistiky"]')
  assert.match(await page.locator('main').innerText(), /1 hra[\s\S]*Trefený směr/)
  await page.goBack()
  await page.click('[aria-label="Nastavení"]')
  await page.click('.segmented button:has-text("Tmavý")')
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark')
  await page.reload()
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark')
  await page.click('[aria-label="Nastavení"]')
  await page.click('.danger')
  await page.click('.danger')
  await page.goto(url)
  await page.click('[aria-label="Statistiky"]')
  assert.match(await page.locator('main').innerText(), /Zatím žádné hry/)
})

await test('výchozí pohled: jen historie, posun prstem, malování přesune graf na budoucnost', async (page) => {
  await page.click('.wl-row:has-text("Tesla")')
  const canvas = page.locator('canvas.chart')
  await page.waitForSelector('canvas.chart[data-x1]')
  assert.equal(await canvas.getAttribute('data-x1'), '1.000', 'na začátku má být vidět jen historie')
  const g = await geometry(page)
  await page.mouse.move(g.c.x + g.c.width * 0.6, g.y(0.5))
  await page.mouse.down()
  await page.mouse.move(g.c.x + g.c.width * 0.3, g.y(0.5), { steps: 6 })
  await page.mouse.up()
  assert.ok(Number(await canvas.getAttribute('data-x0')) > 0.05, 'posun prstem nefunguje')
  await switchMode(page, 'Malovat')
  assert.ok(Number(await canvas.getAttribute('data-x1')) > 1.9, 'malování nepřesunulo graf na budoucnost')
  assert.ok(Number(await canvas.getAttribute('data-x0')) > 0.8, 'z historie má být vidět jen malá část')
})

await test('vrstvy: S&P 500 a klouzavé průměry', async (page) => {
  await page.click('.wl-row:has-text("Tesla")')
  for (const label of ['S&P 500', 'Ø50', 'Ø200']) {
    const b = page.locator(`.layer:has-text("${label}")`)
    await b.click()
    assert.equal(await b.getAttribute('aria-pressed'), 'true', `vrstva ${label} se nezapnula`)
  }
})

await test('celá obrazovka: historie přes celou šířku, malování a přenos kresby', async (page) => {
  await page.click('.wl-row:has-text("Tesla")')
  await page.click('[aria-label="Kreslit na celou obrazovku"]')
  const canvas = page.locator('.chart-full')
  await page.waitForSelector('.chart-full[data-x1]')
  assert.equal(await canvas.getAttribute('data-x1'), '1.000', 'na začátku má být vidět celá historie')
  await page.click('.fs-side .segmented button:nth-child(2)')
  await page.waitForTimeout(550)
  assert.ok(Number(await canvas.getAttribute('data-x1')) > 1.9, 'okno se neposunulo do budoucnosti')
  const g = await geometry(page, '.chart-full')
  await page.mouse.move(g.X(1.005), g.y(0.5))
  await page.mouse.down()
  for (let i = 1; i <= 30; i++) await page.mouse.move(g.X(1 + i / 30), g.y(0.45), { steps: 2 })
  await page.mouse.up()
  await page.click('.fs-side .primary')
  await page.waitForSelector('.fullscreen', { state: 'detached' })
  assert.equal(await page.locator('.action-bar .primary').innerText(), 'Vyhodnotit', 'kresba se nepřenesla z celé obrazovky')
})

await test('kreslení u horní hrany rozšíří graf nad původní rozsah', async (page) => {
  await page.click('.wl-row:has-text("Tesla")')
  await page.click('[aria-label="Kreslit na celou obrazovku"]')
  await page.click('.fs-side .segmented button:nth-child(2)')
  await page.waitForTimeout(550)
  const canvas = page.locator('.chart-full')
  const before = Number(await canvas.getAttribute('data-top'))
  const g = await geometry(page, '.chart-full')
  await page.mouse.move(g.X(1.3), g.y(0.5))
  await page.mouse.down()
  for (let i = 0; i < 40; i++) await page.mouse.move(g.X(1.3) + i * 2, g.c.y + 34, { steps: 1 })
  await page.mouse.up()
  const after = Number(await canvas.getAttribute('data-top'))
  assert.ok(after > before * 1.3, `horní hrana se nerozšířila (${before} → ${after})`)
  assert.ok(after <= 30.01, 'rozšíření nemá strop')
})

await test('celá obrazovka: posun a přiblížení kolečkem', async (page) => {
  await page.click('.wl-row:has-text("Tesla")')
  await page.click('[aria-label="Kreslit na celou obrazovku"]')
  const canvas = page.locator('.chart-full')
  await page.waitForSelector('.chart-full[data-x0]')
  const c = await canvas.boundingBox()
  const before = Number(await canvas.getAttribute('data-x0'))
  await page.mouse.move(c.x + c.width * 0.5, c.y + c.height * 0.5)
  await page.mouse.down()
  await page.mouse.move(c.x + c.width * 0.2, c.y + c.height * 0.5, { steps: 5 })
  await page.mouse.up()
  assert.ok(Number(await canvas.getAttribute('data-x0')) > before, 'posun doprava nefunguje')
  const span = () => canvas.evaluate((el) => Number(el.dataset.x1) - Number(el.dataset.x0))
  const s1 = await span()
  await page.mouse.wheel(0, -300)
  assert.ok((await span()) < s1, 'přiblížení nefunguje')
  await page.click('[aria-label="Celý graf"] >> nth=-1')
  await page.waitForTimeout(550)
  assert.equal(await canvas.getAttribute('data-x0'), '0.000')
})

await test('události: výběr firmy a horizontu, hra a vysvětlení', async (page) => {
  await page.click('.main-tabs button:has-text("Události")')
  await page.waitForSelector('.ev-card')
  assert.ok((await page.locator('.ev-card').count()) >= 15, 'málo událostí')
  const card = page.locator('.ev-card:has-text("Ruská invaze")')
  await card.locator('.ev-head').click()
  await card.locator('.ev-body .chips >> nth=0').locator('button:has-text("LMT")').click()
  await card.locator('.ev-body .chips >> nth=1').locator('button:has-text("rok")').click()
  await card.locator('.ev-body .primary').click()
  await page.waitForSelector('canvas.chart')
  assert.match(await page.locator('.topbar').innerText(), /Ruská invaze[\s\S]*Lockheed[\s\S]*Geopolitika/i)
  // Budoucí události z časové osy nesmí být vidět před odhadem
  assert.doesNotMatch(await page.locator('main').innerText(), /zakazují dovoz ruské ropy/)
  await drawFinger(page, () => 0.45)
  await page.click('.action-bar .primary')
  await page.waitForSelector('.result')
  assert.match(await page.locator('.result').innerText(), /první obchodní den [+-−]?\d+ %, za celé období/)
})

await test('rychlá hra: dlouhý horizont 5 let', async (page) => {
  await page.click('.main-tabs button:has-text("Rychlá hra")')
  await page.click('.quick .chips button:has-text("5 let")')
  await page.click('.quick .primary')
  await page.waitForSelector('canvas.chart')
  assert.match(await page.locator('.pane').innerText(), /na 5 let/)
  await drawFinger(page, (t) => 0.45 - 0.1 * t)
  await page.click('.action-bar .primary')
  await page.waitForSelector('.result')
})

await test('přehled: časová osa minulých událostí a výsledků', async (page) => {
  await page.click('.wl-row:has-text("Meta před výsledky Q4 2022")')
  const items = await page.locator('.timeline li').allInnerTexts()
  assert.ok(items.length >= 5, 'časová osa je prázdná')
  assert.ok(items.some((t) => /Výsledky[\s\S]*-2[45]/.test(t)), 'chybí reakce na výsledky v časové ose')
})

await test('kreslení: zpět a smazat', async (page) => {
  await page.click('.wl-row >> nth=0')
  await drawPoints(page, [[0.5, 0.4], [1, 0.4]])
  assert.equal(await page.locator('.action-bar .primary').isDisabled(), false)
  await page.click('[aria-label="Vrátit krok"]')
  assert.equal(await page.locator('.action-bar .primary').isDisabled(), true, 'zpět neodebral poslední bod')
  await page.click('[aria-label="Smazat odhad"]')
  assert.match(await page.locator('.action-bar .primary').innerText(), /Malovat/)
})

await test('rozsah osy se přepíná dokola', async (page) => {
  await page.click('.wl-row >> nth=0')
  const zoom = page.locator('[aria-label="Rozsah osy"]')
  const first = await zoom.innerText()
  const seen = new Set([first])
  for (let i = 0; i < 4; i++) {
    await zoom.click()
    seen.add(await zoom.innerText())
  }
  assert.equal(seen.size, 4)
  assert.equal(await zoom.innerText(), first)
})

await test('výsledek se uloží, další scénář a návrat zpět', async (page) => {
  await page.click('.wl-row >> nth=0')
  await drawFinger(page, () => 0.4)
  await page.click('.primary')
  await page.waitForSelector('.result')
  const firstTitle = await page.locator('.topbar strong').innerText()
  await page.click('.primary:has-text("Další scénář")')
  await page.waitForTimeout(100)
  assert.notEqual(await page.locator('.topbar strong').innerText(), firstTitle)
  await page.click('[aria-label="Zpět na seznam"]')
  await page.waitForSelector('.wl-row')
  assert.equal(await page.locator('.wl-score.great, .wl-score.ok, .wl-score.low').count(), 1, 'skóre se neuložilo')
})

await test('tlačítko zpět v systému (Android) vrací na seznam', async (page) => {
  await page.click('.wl-row >> nth=0')
  await page.goBack()
  await page.waitForSelector('.wl-row')
})

await test('na šířku: graf a analýza vedle sebe', async (page) => {
  await page.setViewportSize({ width: 915, height: 412 })
  await page.click('.wl-row >> nth=0')
  const chart = await page.locator('.chart-card').boundingBox()
  const analysis = await page.locator('.analysis').boundingBox()
  assert.ok(analysis.x >= chart.x + chart.width, 'analýza není vedle grafu')
  assert.ok(chart.height > 230, `graf je moc nízký: ${chart.height}`)
  await noHorizontalScroll(page)
})

await test('světlý režim', async (page) => {
  await page.emulateMedia({ colorScheme: 'light' })
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  assert.equal(bg, 'rgb(246, 245, 241)')
})

await browser.close()
await server.close()
console.log(failed ? `\n${failed} test(ů) selhalo` : '\nVšechny e2e testy prošly')
process.exit(failed ? 1 : 0)
