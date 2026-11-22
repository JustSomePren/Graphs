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

// Geometrie zóny pro kreslení (musí odpovídat PAD a HISTORY_SHARE v chart.js)
async function zone(page) {
  const box = await page.locator('canvas').boundingBox()
  const left = box.x + 6 + (box.width - 58) * 0.58
  const right = box.x + box.width - 52
  return { box, left, right, y: (f) => box.y + box.height * f }
}

async function drawFinger(page, shape) {
  const z = await zone(page)
  await page.mouse.move(z.left + 4, z.y(shape(0)))
  await page.mouse.down()
  for (let i = 0; i <= 24; i++) await page.mouse.move(z.left + 4 + ((z.right - z.left) * i) / 24, z.y(shape(i / 24)), { steps: 2 })
  await page.mouse.up()
}

async function drawPoints(page, points) {
  const z = await zone(page)
  for (const [t, f] of points) await page.touchscreen.tap(z.left + (z.right - z.left) * t, z.y(f))
}

const noHorizontalScroll = async (page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert.ok(overflow <= 0, `stránka přetéká do strany o ${overflow}px`)
}

await test('domovská obrazovka ukazuje všechny scénáře', async (page) => {
  assert.equal(await page.locator('.scenario').count(), scenarios.length)
  await noHorizontalScroll(page)
})

await test('filtr podle horizontu', async (page) => {
  await page.click('.segmented button:text-is("Krátké")')
  const short = await page.locator('.scenario').count()
  await page.click('.segmented button:text-is("Dlouhé")')
  const long = await page.locator('.scenario').count()
  assert.ok(short > 0 && long > 0 && short + long < scenarios.length)
})

await test('úvodní nápověda jde zavřít a nevrátí se', async (page) => {
  await page.click('.intro .link')
  await page.reload()
  assert.equal(await page.locator('.intro').count(), 0)
})

for (const [i, s] of scenarios.entries()) {
  await test(`scénář ${s.id}: analýza, kreslení a vyhodnocení`, async (page) => {
    await page.click(`.scenario:has-text("${s.title}")`)
    for (const tab of ['Data', 'Konkurence', 'Články', 'Přehled']) {
      await page.click(`.tabs button:has-text("${tab}")`)
      assert.ok((await page.locator('.pane').innerText()).length > 50, `prázdná záložka ${tab}`)
    }
    assert.ok((await page.locator('.signals li').count()) >= 3, 'málo signálů')
    await noHorizontalScroll(page)

    const button = page.locator('.primary')
    assert.equal(await button.isDisabled(), true, 'vyhodnotit jde bez kresby')

    // Střídáme způsob zadání: prst / body
    if (i % 2) await drawPoints(page, [[0.3, 0.4], [0.7, 0.3], [1, 0.35]])
    else await drawFinger(page, (t) => 0.45 - 0.1 * Math.sin(t * 3))
    assert.equal(await button.isDisabled(), false, 'po nakreslení nejde vyhodnotit')

    await button.click()
    await page.waitForSelector('.result', { timeout: 5000 })
    const total = Number(await page.locator('.ring b').innerText())
    assert.ok(total >= 0 && total <= 115, `skóre mimo rozsah: ${total}`)
    assert.ok((await page.locator('.result').innerText()).includes('Proč to dopadlo'))
    assert.equal(await page.locator('.toolbar').count(), 0, 'po vyhodnocení jde dál kreslit')
  })
}

await test('hodinová data: graf i vyhodnocení', async (page) => {
  await page.click('.scenario:has-text("DeepSeek")')
  assert.equal(await page.locator('.legend .pill').innerText(), 'hodinová data')
  await drawFinger(page, (t) => 0.5 + 0.1 * t)
  await page.click('.primary')
  await page.waitForSelector('.result')
  // Propad a následný odraz v hodinových datech se musí objevit jako kontrolní body tvaru
  assert.match(await page.locator('.chips').innerText(), /Pokles [\s\S]*Růst/)
})

await test('minulé výsledky: tabulka a popis v grafu', async (page) => {
  await page.click('.scenario:has-text("Meta: rok efektivity")')
  await page.click('.tabs button:has-text("Data")')
  const table = await page.locator('.section:has-text("Minulé výsledky") table').innerText()
  assert.match(table, /-24,6 %|−24,6 %|-25 %/)
  await page.click('.tabs button:has-text("Články")')
  assert.ok((await page.locator('.pane').innerText()).includes('Tisková zpráva'))
})

await test('rychlá hra: anonymní firma a odhalení jména', async (page) => {
  await page.click('.segmented.big button:has-text("Rychlá hra")')
  await page.click('.quick .primary')
  await page.waitForSelector('canvas')
  const before = await page.locator('main').innerText()
  assert.ok(before.includes('Anonymní firma'), 'chybí anonymní označení')
  await page.click('.tabs button:has-text("Konkurence")')
  assert.ok((await page.locator('.peers').innerText()).includes('Tato firma'))
  assert.equal(await page.locator('.pane a').count(), 0, 'odkaz na SEC by prozradil firmu')
  await drawFinger(page, () => 0.42)
  await page.click('.primary')
  await page.waitForSelector('.result')
  assert.match(await page.locator('.result').innerText(), /Šlo o .+\([A-Z.]+\)/)
  await page.click('.primary:has-text("Další firma")')
  await page.waitForSelector('canvas')
  assert.ok((await page.locator('main').innerText()).includes('Anonymní firma'))
})

await test('profil: hodnost, odznaky a historie po hře', async (page) => {
  await page.click('.scenario >> nth=0')
  await drawFinger(page, () => 0.4)
  await page.click('.primary')
  await page.waitForSelector('.result')
  assert.ok((await page.locator('.new-badges').innerText()).includes('První odhad'))
  await page.click('[aria-label="Zpět na seznam"]')
  await page.waitForSelector('.profile')
  assert.equal(await page.locator('.badge-icon:not(.locked)').count() >= 1, true)
  await page.click('.profile .link')
  assert.equal(await page.locator('.history .row').count(), 1)
})

await test('kreslení: zpět a smazat', async (page) => {
  await page.click('.scenario >> nth=0')
  await drawPoints(page, [[0.5, 0.4], [1, 0.4]])
  assert.equal(await page.locator('.primary').isDisabled(), false)
  await page.click('[aria-label="Vrátit krok"]')
  assert.equal(await page.locator('.primary').isDisabled(), true, 'zpět neodebral poslední bod')
  await page.click('[aria-label="Smazat odhad"]')
  assert.match(await page.locator('.primary').innerText(), /Nakresli/)
})

await test('rozsah osy se přepíná dokola', async (page) => {
  await page.click('.scenario >> nth=0')
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
  await page.click('.scenario >> nth=0')
  await drawFinger(page, () => 0.4)
  await page.click('.primary')
  await page.waitForSelector('.result')
  const firstTitle = await page.locator('.topbar strong').innerText()
  await page.click('.primary:has-text("Další scénář")')
  await page.waitForTimeout(100)
  assert.notEqual(await page.locator('.topbar strong').innerText(), firstTitle)
  await page.click('[aria-label="Zpět na seznam"]')
  await page.waitForSelector('.scenario')
  assert.equal(await page.locator('.badge').count(), 1, 'skóre se neuložilo')
})

await test('tlačítko zpět v systému (Android) vrací na seznam', async (page) => {
  await page.click('.scenario >> nth=0')
  await page.goBack()
  await page.waitForSelector('.scenario')
})

await test('světlý režim', async (page) => {
  await page.emulateMedia({ colorScheme: 'light' })
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  assert.equal(bg, 'rgb(244, 246, 249)')
})

await browser.close()
await server.close()
console.log(failed ? `\n${failed} test(ů) selhalo` : '\nVšechny e2e testy prošly')
process.exit(failed ? 1 : 0)
