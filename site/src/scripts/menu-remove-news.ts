// Одноразово: прибрати «Новини» з меню — в оригінальному меню такого пункту немає
import { getPayload } from 'payload'
import config from '../payload.config'

const payload = await getPayload({ config: await config })
const nav = await payload.findGlobal({ slug: 'navigation', depth: 0 })
await payload.updateGlobal({
  slug: 'navigation',
  data: { _status: 'published', items: (nav.items || []).filter((i) => i.label !== 'Новини') as any },
})
payload.logger.info('Готово: «Новини» прибрано з меню')
process.exit(0)
