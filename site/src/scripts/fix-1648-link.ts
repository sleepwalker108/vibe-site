// Одноразово: посилання «Детальніше» у картці 1648 — як на старому сайті (НІБ)
import { getPayload } from 'payload'
import config from '../payload.config'

const payload = await getPayload({ config: await config })
const home = await payload.findGlobal({ slug: 'home', depth: 0 })
await payload.updateGlobal({
  slug: 'home',
  data: {
    _status: 'published',
    cards: (home.cards || []).map((c) =>
      c.number === '1648' ? { ...c, url: 'https://nib.gov.ua/news/yak-diyati-i-kudi-zvertatis-yaksho-lyudina-znikla/' } : c,
    ) as any,
  },
})
payload.logger.info('Готово: посилання 1648 виправлено')
process.exit(0)
