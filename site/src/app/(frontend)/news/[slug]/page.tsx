import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageSidebar } from '@/components/PageSidebar'
import { Prose } from '@/components/Prose'
import { SiteShell } from '@/components/SiteShell'
import { formatDate, getClient, isDraftMode, mediaUrl, publishedOnly } from '@/lib/payload'
import { getDict, localeQuery } from '@/lib/i18n'
import type { Locale } from '@/lib/dictionary'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

const getNews = async (slug: string, draft: boolean, locale: Locale) => {
  const payload = await getClient()
  const res = await payload.find({
    collection: 'news',
    draft,
    where: { and: [{ slug: { equals: decode(slug) } }, ...(draft ? [] : [publishedOnly(false)!])] },
    limit: 1,
    depth: 1,
    ...localeQuery(locale),
  })
  const doc = res.docs[0]
  if (!doc || locale === 'uk') return doc ? { ...doc, translated: true } : undefined
  // чи є англійський заголовок без запасного українського
  const own = await payload.findByID({ collection: 'news', id: doc.id, draft, locale, fallbackLocale: false, select: { title: true } })
  return { ...doc, translated: !!own?.title }
}

export async function generateMetadata({ params }: Props) {
  const { locale, t } = await getDict()
  const item = await getNews((await params).slug, false, locale)
  return { title: item ? `${item.title} — НАРТУ` : t.newsNotFound, description: item?.excerpt || undefined }
}

export default async function NewsItemPage({ params, searchParams }: Props) {
  const draft = await isDraftMode(await searchParams)
  const { locale, t } = await getDict()
  const item = await getNews((await params).slug, draft, locale)
  if (!item) notFound()
  const cover = mediaUrl(item.cover, 'wide')
  const payload = await getClient()
  const latest = (
    await payload.find({
      collection: 'news',
      where: { and: [publishedOnly(false)!, { id: { not_equals: item.id } }] },
      sort: '-publishedAt',
      limit: 4,
      depth: 0,
      select: { title: true, slug: true, publishedAt: true },
      ...localeQuery(locale),
    })
  ).docs

  return (
    <SiteShell draft={draft}>
      <section className="page-head">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{t.breadcrumbHome}</Link> / <Link href="/news">{t.news}</Link>
          </div>
          <h1>{item.title}</h1>
          <time>{formatDate(item.publishedAt)}</time>
        </div>
      </section>
      <div className="article wrap page-layout">
        <article className="page-main">
          {!item.translated && <p className="not-translated">{t.notTranslated}</p>}
          {cover && (
            <div className="cover">
              <img src={cover} alt={typeof item.cover === 'object' ? item.cover?.alt || '' : ''} />
            </div>
          )}
          {item.content ? <Prose data={item.content} /> : <p className="prose">{item.excerpt}</p>}
        </article>
        <PageSidebar path="/news" locale={locale} t={t} draft={draft}>
          {latest.length > 0 && (
            <nav className="side-nav" aria-label={t.latestNews}>
              <div className="side-title">{t.latestNews}</div>
              <ul className="side-news">
                {latest.map((n) => (
                  <li key={n.id}>
                    <Link href={`/news/${encodeURIComponent(n.slug || '')}`}>
                      <time>{formatDate(n.publishedAt)}</time>
                      {n.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </PageSidebar>
      </div>
    </SiteShell>
  )
}
