// Початкові налаштування SEO (назва, опис, ключові слова) українською та англійською
import { getPayload } from 'payload'
import config from '../payload.config'
const payload = await getPayload({ config: await config })
await payload.updateGlobal({
  slug: 'seo',
  locale: 'uk',
  data: {
    siteTitle: 'НАРТУ — Національна агенція розвитку територій України',
    titleSuffix: 'НАРТУ',
    description:
      'ДНТ «Національна агенція розвитку територій України»: гарячі лінії 1548 та 1648, допомога ВПО, евакуація з прифронтових територій, житло та підтримка людей з ТОТ.',
    keywords:
      'НАРТУ, Національна агенція розвитку територій України, гаряча лінія 1548, гаряча лінія 1648, ВПО, внутрішньо переміщені особи, допомога ВПО, житло для ВПО, евакуація, тимчасово окуповані території, ТОТ, реінтеграція, деокуповані території',
    allowIndexing: true,
  },
})
await payload.updateGlobal({
  slug: 'seo',
  locale: 'en',
  data: {
    siteTitle: 'National Agency for Territorial Development of Ukraine',
    titleSuffix: 'NATDU',
    description:
      'National Agency for Territorial Development of Ukraine: hotlines 1548 and 1648, support for IDPs, evacuation from frontline areas, housing and help for people from occupied territories.',
    keywords:
      'National Agency for Territorial Development of Ukraine, hotline 1548, hotline 1648, IDPs, internally displaced persons, Ukraine evacuation, occupied territories, reintegration, housing for IDPs',
  },
})
payload.logger.info('SEO заповнено')
process.exit(0)
