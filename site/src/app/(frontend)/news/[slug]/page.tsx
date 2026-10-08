import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageSidebar } from '@/components/PageSidebar'
import { Prose } from '@/components/Prose'
import { SiteShell } from '@/components/SiteShell'
import { formatDate, getClient, isDraftMode, mediaUrl, publishedOnly } from '@/lib/payload'
import { getDict, localeQuery } from '@/lib/i18n'
import type { Locale } from '@/lib/dictionary'
import { JsonLd } from '@/components/JsonLd'
import { getSeo, localizedUrl, pageMetadata, plainText, SITE_URL } from '@/lib/seo'

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
  if (!item) return { title: t.newsNotFound, robots: { index: false } }
  return pageMetadata({
    title: item.meta?.title || item.title,
    description: item.meta?.description || item.excerpt || plainText(item.content),
    path: `/news/${item.slug}`,
    image: mediaUrl(item.meta?.image, 'wide') || mediaUrl(item.cover, 'wide'),
    noindex: item.meta?.noindex,
    type: 'article',
    publishedTime: item.publishedAt,
    modifiedTime: item.updatedAt,
  })
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

  const seo = await getSeo(locale)
  const url = localizedUrl(`/news/${item.slug}`, locale)

  return (
    <SiteShell draft={draft}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: item.title,
          description: item.excerpt || plainText(item.content),
          image: cover ? [SITE_URL + cover] : undefined,
          datePublished: item.publishedAt,
          dateModified: item.updatedAt,
          inLanguage: locale,
          mainEntityOfPage: url,
          author: { '@type': 'Organization', name: seo.siteTitle, url: SITE_URL },
          publisher: { '@type': 'GovernmentOrganization', name: seo.siteTitle, logo: { '@type': 'ImageObject', url: `${SITE_URL}/img/emblem.png` } },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: t.breadcrumbHome, item: localizedUrl('/', locale) },
            { '@type': 'ListItem', position: 2, name: t.news, item: localizedUrl('/news', locale) },
            { '@type': 'ListItem', position: 3, name: item.title, item: url },
          ],
        }}
      />
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
          {item.content ? <Prose data={item.content} labels={t} /> : <p className="prose">{item.excerpt}</p>}
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
