import Link from 'next/link'
import type { Where } from 'payload'
import { ListNav, NavLink } from '@/components/ListNav'
import { NewsFilters } from '@/components/NewsFilters'
import { Pager } from '@/components/Pager'
import { SiteShell } from '@/components/SiteShell'
import { formatDate, getClient, publishedOnly } from '@/lib/payload'
import { getDict, localeQuery } from '@/lib/i18n'
import {
  hasNewsFilter,
  newsSort,
  newsYears,
  parseNewsFilter,
  periodWhere,
  topicCounts,
  topicWhere,
  withParams,
} from '@/lib/newsFilters'
import { pageMetadata } from '@/lib/seo'
import { safeHref } from '@/lib/safeHref'
import { normalize, plainText, queryWords, searchWhere, snippet, stem } from '@/lib/searchText'
import { getTopics, topicName } from '@/lib/topics'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const { t } = await getDict()
  return {
    ...(await pageMetadata({ title: t.search, path: '/search' })),
    robots: { index: false, follow: true },
  }
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }
type ResultType = 'all' | 'pages' | 'news' | 'video'
const TYPES: ResultType[] = ['all', 'pages', 'news', 'video']

const PER_PAGE = 20

// Для коротких рядків (контакти, ресурси, відео) — перевірка прямо тут
const hasAll = (text: string, words: string[]) => {
  const low = normalize(text)
  return words.every((w) => low.includes(stem(w)))
}

const Snip = ({
  text,
  words,
  fallback,
}: {
  text: string
  words: string[]
  fallback?: string | null
}) => {
  const parts = snippet(text, words)
  if (!parts) return fallback ? <p className="hit-snip">{fallback.slice(0, 200)}</p> : null
  return (
    <p className="hit-snip">
      {parts.map((p, i) => (p.mark ? <mark key={i}>{p.text}</mark> : p.text))}
    </p>
  )
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = String(sp.q || '')
    .trim()
    .slice(0, 100)
  const page = Math.max(1, Number(sp.page) || 1)
  const { locale, t } = await getDict()
  const en = locale === 'en'
  const words = queryWords(q)
  const payload = await getClient()
  const topics = await getTopics(payload, locale)
  const filter = parseNewsFilter(sp, topics)
  const askedType = TYPES.includes(sp.type as ResultType) ? (sp.type as ResultType) : 'all'
  // фільтри за категорією чи датою стосуються лише новин — тоді й показуємо лише новини (без слів пошуку — теж)
  const type: ResultType = !words.length || (askedType === 'all' && hasNewsFilter(filter)) ? 'news' : askedType

  let pages: any[] = []
  let news: { docs: any[]; totalDocs: number; totalPages: number } | null = null
  let videos: any[] = []
  let contactLines: string[] = []
  let resources: { label: string; url?: string | null; description?: string | null }[] = []
  let counts: Awaited<ReturnType<typeof topicCounts>> | null = null
  let years: number[] = []

  const published = publishedOnly(false)!
  const wordsWhere: Where[] = words.length ? [searchWhere(words)] : []
  const newsBase: Where[] = [published, ...wordsWhere, ...periodWhere(filter)]
  // без слів пошуку новини теж можна знайти — за категорією, роком чи місяцем
  const listNews = words.length > 0 || hasNewsFilter(filter)
  const [topicCountsRes, yearsRes, newsRes] = await Promise.all([
    topicCounts(payload, newsBase, topics),
    newsYears(payload, [published, ...wordsWhere]),
    listNews
      ? payload.find({
          collection: 'news',
          where: { and: [...newsBase, ...topicWhere(filter.topic)] },
          sort: newsSort(filter),
          limit: PER_PAGE,
          page,
          depth: 0,
          // повний текст потрібен лише для уривка зі знайденими словами
          select: { title: true, slug: true, excerpt: true, publishedAt: true, topics: true, ...(words.length ? { content: true } : {}) },
          ...localeQuery(locale),
        })
      : null,
  ])
  counts = topicCountsRes
  years = yearsRes
  news = newsRes

  if (words.length) {
    const [pagesRes, videosRes, contacts, res] = await Promise.all([
      payload.find({
        collection: 'pages',
        where: { and: [published, searchWhere(words)] },
        limit: 30,
        depth: 0,
        select: { title: true, slug: true, content: true },
        ...localeQuery(locale),
      }),
      payload.find({ collection: 'videos', limit: 200, depth: 0, select: { title: true, description: true }, ...localeQuery(locale) }),
      payload.findGlobal({ slug: 'contacts', depth: 0, ...localeQuery(locale) }),
      payload.findGlobal({ slug: 'resources', depth: 0, ...localeQuery(locale) }),
    ])
    // сторінки: спершу ті, де слова є в назві
    pages = pagesRes.docs.sort((a: any, b: any) => Number(hasAll(b.title, words)) - Number(hasAll(a.title, words)))
    videos = videosRes.docs.filter((v: any) => hasAll(`${v.title} ${v.description || ''}`, words))
    const c = contacts as any
    const lines = [
      c.orgName,
      c.address,
      ...(c.schedule || []).map((l: any) => l.text),
      ...(c.phones || []).map((l: any) => l.text),
      c.email,
      c.hotline?.number && `${en ? 'Hotline' : 'Гаряча лінія'} ${c.hotline.number}`,
      ...(c.hotline?.lines || []).map((l: any) => l.text),
    ].filter(Boolean) as string[]
    // показуємо контакти, якщо запит про них (усі слова знайдено серед рядків контактів)
    if (hasAll(lines.join(' '), words)) contactLines = lines.filter((l) => words.some((w) => normalize(l).includes(stem(w))))
    resources = (((res as any)?.items || []) as typeof resources).filter((r) => hasAll(`${r.label} ${r.description || ''} ${r.url || ''}`, words))
  }

  const extras = (contactLines.length ? 1 : 0) + resources.length
  const byType: Record<ResultType, number> = {
    all: pages.length + (news?.totalDocs || 0) + videos.length + extras,
    pages: pages.length,
    news: news?.totalDocs || 0,
    video: videos.length,
  }
  const show = (k: Exclude<ResultType, 'all'>) => type === 'all' || type === k
  const typeLabel: Record<ResultType, string> = {
    all: t.typeAll,
    pages: t.typePages,
    news: t.typeNews,
    video: t.typeVideo,
  }
  const L = {
    page: en ? 'Page' : 'Сторінка',
    news: en ? 'News' : 'Новина',
    video: en ? 'Video' : 'Відео',
    contacts: en ? 'Contacts' : 'Контакти',
    resources: en ? 'Useful resources' : 'Корисні ресурси',
    allContacts: en
      ? 'All contacts are at the bottom of the page'
      : 'Усі контакти — внизу сторінки',
  }
  // нічого не знайдено взагалі (без урахування фільтрів новин)
  const nothingAtAll = !pages.length && !videos.length && !extras && !counts?.all

  return (
    <SiteShell draft={false}>
      <section className="page-head">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{t.breadcrumbHome}</Link> / {t.search}
          </div>
          <h1>{t.search}</h1>
          <form className="search-form" action="/search" role="search">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              autoFocus={!q}
            />
            {/* під час нового пошуку вибраний тип результатів зберігається */}
            {askedType !== 'all' && <input type="hidden" name="type" value={askedType} />}
            {/* і вибрані фільтри новин (категорія, період, порядок) теж */}
            {filter.topic && <input type="hidden" name="topic" value={filter.topic.slug} />}
            {filter.year && <input type="hidden" name="year" value={filter.year} />}
            {filter.month && <input type="hidden" name="month" value={filter.month} />}
            {filter.sort === 'old' && <input type="hidden" name="sort" value="old" />}
            <button type="submit">{t.searchButton}</button>
          </form>
        </div>
      </section>

      <section className="search-results">
        <div className="wrap">
          {q && !words.length ? (
            <p className="search-note">{t.searchTooShort}</p>
          ) : words.length > 0 && nothingAtAll ? (
            <p className="search-note">
              {t.searchNothing} «{q}».
            </p>
          ) : (
            // фільтри новин є завжди — навіть до введення запиту (новини можна знайти за категорією чи датою)
            <ListNav className="with-filters">
              <aside className="filters-side" aria-label={t.filters}>
                {words.length > 0 && (
                  <>
                    <p className="filters-title">{t.resultType}</p>
                    <nav className="type-tabs" aria-label={t.resultType}>
                      {TYPES.filter((k) => k === 'all' || byType[k] || k === type).map((k) => (
                        <NavLink
                          key={k}
                          href={withParams('/search', { q }, { type: k === 'all' ? undefined : k })}
                          aria-current={k === type ? 'page' : undefined}
                        >
                          {typeLabel[k]} <span>{byType[k]}</span>
                        </NavLink>
                      ))}
                    </nav>
                  </>
                )}

                {(type === 'news' || type === 'all') && counts && (
                  <NewsFilters
                    path="/search"
                    sp={sp}
                    filter={filter}
                    counts={counts}
                    years={years}
                    t={t}
                    topics={topics}
                    hidden={{ ...(q ? { q } : {}), ...(askedType !== 'all' ? { type: askedType } : {}) }}
                  />
                )}
              </aside>
              <div className="filters-main">
                {!listNews && <p className="search-note">{t.searchHint}</p>}
                {!words.length && news && (
                  <p className="filter-total" role="status">
                    {t.newsCount}: <b>{news.totalDocs}</b>
                  </p>
                )}
                {type === 'all' && page === 1 && extras > 0 && (
                  <div className="hit-extras">
                    {!!contactLines.length && (
                      <div className="hit-card">
                        <span className="hit-kind">{L.contacts}</span>
                        <ul>
                          {contactLines.map((l) => (
                            <li key={l}>{l}</li>
                          ))}
                        </ul>
                        <a className="hit-more" href="#footer">
                          {L.allContacts} ↓
                        </a>
                      </div>
                    )}
                    {!!resources.length && (
                      <div className="hit-card">
                        <span className="hit-kind">{L.resources}</span>
                        <ul>
                          {resources.map((r) => (
                            <li key={r.label}>
                              {r.url ? (
                                <a href={safeHref(r.url)} target="_blank" rel="noopener noreferrer">
                                  {r.label}
                                </a>
                              ) : (
                                r.label
                              )}
                              {r.description && <small> — {r.description}</small>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <ol className="hits">
                  {show('pages') &&
                    page === 1 &&
                    pages.map((p) => (
                      <li key={`p${p.id}`} className="hit">
                        <span className="hit-kind">{L.page}</span>
                        <h2>
                          <Link href={`/${encodeURIComponent(p.slug || '')}`}>{p.title}</Link>
                        </h2>
                        <Snip text={plainText(p.content)} words={words} />
                      </li>
                    ))}
                  {show('video') &&
                    page === 1 &&
                    videos.map((v) => (
                      <li key={`v${v.id}`} className="hit">
                        <span className="hit-kind">{L.video}</span>
                        <h2>
                          <Link href="/video">{v.title}</Link>
                        </h2>
                        {v.description && (
                          <Snip text={v.description} words={words} fallback={v.description} />
                        )}
                      </li>
                    ))}
                  {show('news') &&
                    news?.docs.map((n: any) => (
                      <li key={`n${n.id}`} className="hit">
                        <span className="hit-kind">
                          {L.news} ·{' '}
                          <time dateTime={n.publishedAt}>{formatDate(n.publishedAt)}</time>
                          {topicName(n.topics?.[0], topics) && <> · {topicName(n.topics?.[0], topics)}</>}
                        </span>
                        <h2>
                          <Link href={`/news/${encodeURIComponent(n.slug || '')}`}>{n.title}</Link>
                        </h2>
                        <Snip
                          text={`${n.excerpt || ''}\n${plainText(n.content)}`}
                          words={words}
                          fallback={n.excerpt}
                        />
                      </li>
                    ))}
                </ol>
                {show('news') && news && !news.docs.length && (
                  <p className="search-note">{t.newsNothing}</p>
                )}

                {show('news') && news && (
                  <Pager
                    path="/search"
                    sp={sp}
                    page={page}
                    totalPages={news.totalPages}
                    label={t.newsPages}
                  />
                )}
              </div>
            </ListNav>
          )}
        </div>
      </section>
    </SiteShell>
  )
}
