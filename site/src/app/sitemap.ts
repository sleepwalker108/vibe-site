import type { MetadataRoute } from 'next'
import { getClient } from '@/lib/payload'
import { localizedUrl } from '@/lib/seo'

// Карта сайту для Google: /sitemap.xml. Оновлюється сама — нові новини й сторінки з’являються тут одразу.
export const dynamic = 'force-dynamic'

type Doc = { slug?: string | null; updatedAt?: string; hasEnglish?: boolean | null; meta?: { noindex?: boolean | null } | null }

const entry = (path: string, lastModified?: string, english = true, priority = 0.6): MetadataRoute.Sitemap[number] => ({
  url: localizedUrl(path, 'uk'),
  lastModified: lastModified ? new Date(lastModified) : undefined,
  priority,
  alternates: { languages: english ? { uk: localizedUrl(path, 'uk'), en: localizedUrl(path, 'en') } : { uk: localizedUrl(path, 'uk') } },
})

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getClient()
  const seo = await payload.findGlobal({ slug: 'seo', depth: 0 }).catch(() => null)
  if (seo?.allowIndexing === false) return []

  const published = { _status: { equals: 'published' } } as const
  const select = { slug: true, updatedAt: true, hasEnglish: true, meta: { noindex: true } } as const
  const [pages, news] = await Promise.all([
    payload.find({ collection: 'pages', where: published, limit: 1000, depth: 0, select, pagination: false }),
    payload.find({ collection: 'news', where: published, sort: '-publishedAt', limit: 5000, depth: 0, select, pagination: false }),
  ])
  const ok = (d: Doc) => d.slug && !d.meta?.noindex

  return [
    entry('/', news.docs[0]?.updatedAt, true, 1),
    entry('/news', news.docs[0]?.updatedAt, true, 0.9),
    entry('/video', undefined, true, 0.5),
    ...(pages.docs as Doc[]).filter(ok).map((p) => entry(`/${p.slug}`, p.updatedAt, !!p.hasEnglish, 0.7)),
    ...(news.docs as Doc[]).filter(ok).map((n) => entry(`/news/${n.slug}`, n.updatedAt, !!n.hasEnglish, 0.6)),
  ]
}
