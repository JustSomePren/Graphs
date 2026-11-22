// Stáhne ceny, fundamenty (SEC EDGAR) a makro data (FRED) a vytvoří src/data/scenarios.json
// Volitelně: node scripts/build-data.mjs --auto  → vygeneruje i automatické scénáře (src/data/auto.json)
import fs from 'node:fs/promises'
import { scenarios } from '../scenarios/scenarios.mjs'
import { buildScenario } from './lib/scenario.mjs'
import { validateScenario } from './lib/validate.mjs'
import { buildAuto } from './lib/auto.mjs'

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

if (process.argv.includes('--auto')) await writeChecked('src/data/auto.json', await buildAuto(), true)
