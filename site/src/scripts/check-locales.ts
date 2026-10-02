// Перевірка: українські й англійські тексти головних розділів
import { getPayload } from 'payload'
import config from '../payload.config'
const payload = await getPayload({ config: await config })
for (const locale of ['uk', 'en'] as const) {
  const h = await payload.findGlobal({ slug: 'home', locale, fallbackLocale: false, depth: 0 })
  const n = await payload.findGlobal({ slug: 'navigation', locale, fallbackLocale: false, depth: 0 })
  const c = await payload.findGlobal({ slug: 'contacts', locale, fallbackLocale: false, depth: 0 })
  console.log(locale, '|', h.hero?.title, '|', h.cards?.[0]?.title, '|', h.cards?.[0]?.chips?.map((x) => x.text).join(' / '), '|', n.items?.map((i) => i.label).join(', '), '|', c.address)
}
process.exit(0)
