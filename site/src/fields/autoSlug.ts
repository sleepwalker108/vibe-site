import type { FieldHook } from 'payload'
import { slugify } from '../utils/slugify'

// Адреса сторінки (slug) для новин і сторінок — заповнюється з українського заголовка.
//
// Раніше адреса бралась із заголовка лише один раз — коли поле ще порожнє. Але автозбереження спрацьовує вже
// за 0,4 с після початку набору, тож адреса «застигала» на перших літерах («test-3» для «ТЕСТ-3 Повільний
// набір назви»), а дві новини з однаковою назвою не публікувались («Значення має бути унікальним»). Тепер:
//   • поки документ жодного разу не публікувався, автоматична адреса оновлюється разом із заголовком
//     (вписану вручну — не чіпаємо);
//   • після першої публікації адреса не змінюється — посилання на новину не ламаються;
//   • якщо така адреса вже зайнята іншим документом (зокрема чернеткою чи в кошику) — додаємо -2, -3…

type Collection = 'news' | 'pages'

export const autoSlug =
  (collection: Collection): FieldHook =>
  async ({ value, data, originalDoc, req }) => {
    // адресу задає український заголовок; в англійській версії поле лише показується
    if (req.locale && req.locale !== 'uk') return value
    const title = typeof data?.title === 'string' ? data.title : ''
    const id = originalDoc?.id ?? data?.id
    let slug = typeof value === 'string' ? value.trim() : ''

    if (title) {
      const prevTitle = typeof originalDoc?.title === 'string' ? originalDoc.title : ''
      // автоматична адреса — та, що зроблена з заголовка (попереднього чи теперішнього), зокрема «застигла» на
      // його початку під час набору, і та сама з доданим номером (-2, -3…)
      const base = slug.replace(/-\d+$/, '')
      const fromTitle = (t: string) => !!t && !!base && (slugify(t) === base || slugify(t).startsWith(base + '-'))
      const auto = !slug || fromTitle(prevTitle) || fromTitle(title)
      if (auto) {
        let published = originalDoc?._status === 'published'
        if (!published && id) {
          const v = await req.payload.findVersions({
            collection,
            where: { and: [{ parent: { equals: id } }, { 'version._status': { equals: 'published' } }] },
            limit: 1,
            depth: 0,
            overrideAccess: true,
            req,
          })
          published = v.totalDocs > 0
        }
        if (!published || !slug) slug = slugify(title)
      }
    }
    if (!slug) return value

    // зайнята іншим документом — шукаємо вільну: адреса, адреса-2, адреса-3…
    const base = slug
    for (let n = 2; n < 100; n++) {
      const { totalDocs } = await req.payload.find({
        collection,
        where: { and: [{ slug: { equals: slug } }, ...(id ? [{ id: { not_equals: id } }] : [])] },
        limit: 1,
        depth: 0,
        draft: true,
        trash: true,
        overrideAccess: true,
        req,
      } as never)
      if (!totalDocs) break
      slug = `${base}-${n}`
    }
    return slug
  }
