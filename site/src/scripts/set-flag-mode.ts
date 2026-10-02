// Перемикає фон першого екрана: npm run payload run src/scripts/set-flag-mode.ts -- animated|video
import { getPayload } from 'payload'
import config from '../payload.config'

const mode = process.argv.at(-1) === 'video' ? 'video' : 'animated'
const payload = await getPayload({ config: await config })
const home = await payload.findGlobal({ slug: 'home', depth: 0 })
await payload.updateGlobal({
  slug: 'home',
  data: { _status: 'published', hero: { ...home.hero, flagMode: mode } },
})
payload.logger.info(`Готово: фон першого екрана — ${mode === 'video' ? 'відео' : 'намальований прапор'}`)
process.exit(0)
