// Stáhne ceny, fundamenty (SEC EDGAR) a makro data (FRED) a vytvoří src/data/scenarios.json
// Volitelně: node scripts/build-data.mjs --auto  → vygeneruje i automatické scénáře (src/data/auto.json)
import fs from 'node:fs/promises'
import { scenarios } from '../scenarios/scenarios.mjs'
import { buildScenario } from './lib/scenario.mjs'
import { validateScenario } from './lib/validate.mjs'
import { buildAuto } from './lib/auto.mjs'
import { buildEvents } from './lib/events.mjs'

// Automatické scénáře s chybou kontroly se vyřadí, ručně psané jen vypíšou varování
async function writeChecked(file, list, dropInvalid = false) {
  const problems = list.flatMap(validateScenario)
  problems.forEach((p) => console.warn('⚠', p))
  if (dropInvalid) list = list.filter((s) => !validateScenario(s).length)
  await fs.mkdir('src/data', { recursive: true })
  await fs.writeFile(file, JSON.stringify(list))
  console.log(`Hotovo: ${file} (${list.length} scénářů, ${problems.length} varování)`)
}

const out = []
for (const s of scenarios) {
  console.log('→', s.id)
  out.push(await buildScenario(s))
}
await writeChecked('src/data/scenarios.json', out)

if (process.argv.includes('--events') || process.argv.includes('--auto')) await writeChecked('src/data/events.json', await buildEvents(), true)

// Automatické scénáře: po odvětvích do samostatných souborů + malý index, aplikace je načítá až když je potřebuje
if (process.argv.includes('--auto')) {
  const list = (await buildAuto()).filter((s) => {
    const problems = validateScenario(s)
    problems.forEach((p) => console.warn('⚠', p))
    return !problems.length
  })
  await fs.rm('src/data/auto', { recursive: true, force: true })
  await fs.mkdir('src/data/auto', { recursive: true })
  const sectors = [...new Set(list.map((s) => s.sector))]
  const index = []
  for (const [i, sector] of sectors.entries()) {
    const part = `part-${String(i).padStart(2, '0')}`
    const items = list.filter((s) => s.sector === sector)
    await fs.writeFile(`src/data/auto/${part}.json`, JSON.stringify(items))
    items.forEach((s) => index.push({ id: s.id, part, sector, horizon: s.horizon, date: s.decisionDate }))
  }
  await fs.writeFile('src/data/auto/index.json', JSON.stringify(index))
  await fs.rm('src/data/auto.json', { force: true })
  console.log(`Hotovo: ${list.length} automatických scénářů v ${sectors.length} částech`)
}
