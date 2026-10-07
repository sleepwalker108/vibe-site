import Link from 'next/link'
import type { Where } from 'payload'
import { NewsCard } from '@/components/NewsCard'
import { NewsFilters } from '@/components/NewsFilters'
import { SiteShell } from '@/components/SiteShell'
import { getClient, isDraftMode, publishedOnly } from '@/lib/payload'
import { getDict, localeQuery } from '@/lib/i18n'
import { newsSort, newsYears, parseNewsFilter, periodWhere, topicCounts, topicWhere, withParams } from '@/lib/newsFilters'
import { queryWords, searchWhere } from '@/lib/searchText'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export async function generateMetadata({ searchParams }: Props) {
  const { t } = await getDict()
  const sp = await searchParams
  // відфільтровані списки не індексуємо — у пошуковиках лише сам розділ «Новини»
  const filtered = Object.keys(sp).some((k) => ['q', 'topic', 'year', 'month', 'sort'].includes(k))
  return { ...(await pageMetadata({ title: t.news, path: '/news' })), ...(filtered ? { robots: { index: false, follow: true } } : {}) }
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function NewsPage({ searchParams }: Props) {
  const sp = await searchParams
  const draft = await isDraftMode(sp)
  const { locale, t } = await getDict()
  const page = Math.max(1, Number(sp.page) || 1)
  const filter = parseNewsFilter(sp)
  const q = String(sp.q || '').trim().slice(0, 100)
  const words = queryWords(q)
  const payload = await getClient()

  // усі умови, крім теми (тему додаємо окремо — щоб порахувати новини в кожній темі)
  const base: Where[] = [publishedOnly(draft) || {}, ...periodWhere(filter), ...(words.length ? [searchWhere(words)] : [])]
  const [news, counts, years] = await Promise.all([
    payload.find({
      collection: 'news',
      draft,
      where: { and: [...base, ...topicWhere(filter.topic)] },
      sort: newsSort(filter),
      limit: 12,
      page,
      depth: 1,
      ...localeQuery(locale),
    }),
    topicCounts(payload, base),
    newsYears(payload, [publishedOnly(draft) || {}]),
  ])

  const pages = Array.from({ length: news.totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === news.totalPages || Math.abs(p - page) <= 2,
  )

  return (
    <SiteShell draft={draft}>
      <section className="page-head">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{t.breadcrumbHome}</Link> / {t.news}
          </div>
          <h1>{t.news}</h1>
        </div>
      </section>
      <section className="news-list">
        <div className="wrap">
          <NewsFilters path="/news" sp={sp} filter={filter} counts={counts} years={years} t={t} locale={locale} query={q} />
          <p className="filter-total" role="status">
            {t.newsCount}: <b>{news.totalDocs}</b>
          </p>
          {news.docs.length ? (
            <div className="news-grid">
              {news.docs.map((n) => (
                <NewsCard key={n.id} item={n} level={2} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="search-note">{t.newsNothing}</p>
          )}
          {news.totalPages > 1 && (
            <nav className="pager" aria-label={t.newsPages}>
              {pages.map((p) => (
                <Link key={p} className={p === page ? 'on' : undefined} href={withParams('/news', sp, { page: p > 1 ? p : undefined })} aria-current={p === page ? 'page' : undefined}>
                  {p}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </section>
    </SiteShell>
  )
}
