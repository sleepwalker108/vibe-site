import Link from 'next/link'
import type { Where } from 'payload'
import { SiteShell } from '@/components/SiteShell'
import { formatDate, getClient, publishedOnly } from '@/lib/payload'
import { getDict, localeQuery } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'
import { normalize, plainText, queryWords, snippet, stem } from '@/lib/searchText'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const { t } = await getDict()
  return { ...(await pageMetadata({ title: t.search, path: '/search' })), robots: { index: false, follow: true } }
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const PER_PAGE = 20

// Кожне слово запиту (за основою) має бути в «тексті для пошуку»: заголовок + опис + увесь текст
const matchAll = (words: string[]): Where => ({ and: words.map((w) => ({ searchText: { like: stem(w) } })) })
// Для коротких рядків (контакти, ресурси, відео) — перевірка прямо тут
const hasAll = (text: string, words: string[]) => {
  const low = normalize(text)
  return words.every((w) => low.includes(stem(w)))
}

const Snip = ({ text, words, fallback }: { text: string; words: string[]; fallback?: string | null }) => {
  const parts = snippet(text, words)
  if (!parts) return fallback ? <p className="hit-snip">{fallback.slice(0, 200)}</p> : null
  return <p className="hit-snip">{parts.map((p, i) => (p.mark ? <mark key={i}>{p.text}</mark> : p.text))}</p>
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = String(sp.q || '').trim().slice(0, 100)
  const page = Math.max(1, Number(sp.page) || 1)
  const { locale, t } = await getDict()
  const en = locale === 'en'
  const words = queryWords(q)
  const payload = await getClient()

  let pages: any[] = []
  let news: { docs: any[]; totalDocs: number; totalPages: number } | null = null
  let videos: any[] = []
  let contactLines: string[] = []
  let resources: { label: string; url?: string | null; description?: string | null }[] = []

  if (words.length) {
    const [pagesRes, newsRes, videosRes, contacts, res] = await Promise.all([
      page === 1
        ? payload.find({
            collection: 'pages',
            where: { and: [publishedOnly(false)!, matchAll(words)] },
            limit: 20,
            depth: 0,
            select: { title: true, slug: true, content: true },
            ...localeQuery(locale),
          })
        : null,
      payload.find({
        collection: 'news',
        where: { and: [publishedOnly(false)!, matchAll(words)] },
        sort: '-publishedAt',
        limit: PER_PAGE,
        page,
        depth: 0,
        select: { title: true, slug: true, excerpt: true, content: true, publishedAt: true },
        ...localeQuery(locale),
      }),
      page === 1 ? payload.find({ collection: 'videos', limit: 200, depth: 0, select: { title: true, description: true }, ...localeQuery(locale) }) : null,
      page === 1 ? payload.findGlobal({ slug: 'contacts', depth: 0, ...localeQuery(locale) }) : null,
      page === 1 ? payload.findGlobal({ slug: 'resources', depth: 0, ...localeQuery(locale) }) : null,
    ])
    // сторінки: спершу ті, де слова є в назві
    pages = (pagesRes?.docs || []).sort((a: any, b: any) => Number(hasAll(b.title, words)) - Number(hasAll(a.title, words)))
    news = newsRes
    videos = (videosRes?.docs || []).filter((v: any) => hasAll(`${v.title} ${v.description || ''}`, words))
    if (contacts) {
      const c = contacts as any
      const all = [
        c.orgName,
        c.address,
        ...(c.schedule || []).map((l: any) => l.text),
        ...(c.phones || []).map((l: any) => l.text),
        c.email,
        c.hotline?.number && `${en ? 'Hotline' : 'Гаряча лінія'} ${c.hotline.number}`,
        ...(c.hotline?.lines || []).map((l: any) => l.text),
      ].filter(Boolean) as string[]
      // показуємо контакти, якщо запит про них (усі слова знайдено серед рядків контактів)
      if (hasAll(all.join(' '), words)) contactLines = all.filter((l) => words.some((w) => normalize(l).includes(stem(w))))
    }
    resources = (((res as any)?.items || []) as typeof resources).filter((r) => hasAll(`${r.label} ${r.description || ''} ${r.url || ''}`, words))
  }

  const total = pages.length + (news?.totalDocs || 0) + videos.length + (contactLines.length ? 1 : 0) + resources.length
  const pageLink = (p: number) => `/search?q=${encodeURIComponent(q)}${p > 1 ? `&page=${p}` : ''}`
  const L = {
    page: en ? 'Page' : 'Сторінка',
    news: en ? 'News' : 'Новина',
    video: en ? 'Video' : 'Відео',
    contacts: en ? 'Contacts' : 'Контакти',
    resources: en ? 'Useful resources' : 'Корисні ресурси',
    allContacts: en ? 'All contacts are at the bottom of the page' : 'Усі контакти — внизу сторінки',
  }

  return (
    <SiteShell draft={false}>
      <section className="page-head">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{t.breadcrumbHome}</Link> / {t.search}
          </div>
          <h1>{t.search}</h1>
          <form className="search-form" action="/search" role="search">
            <input type="search" name="q" defaultValue={q} placeholder={t.searchPlaceholder} aria-label={t.searchPlaceholder} autoFocus={!q} />
            <button type="submit">{t.searchButton}</button>
          </form>
        </div>
      </section>

      <section className="search-results">
        <div className="wrap">
          {!q ? (
            <p className="search-note">{t.searchHint}</p>
          ) : !words.length ? (
            <p className="search-note">{t.searchTooShort}</p>
          ) : total === 0 ? (
            <p className="search-note">
              {t.searchNothing} «{q}».
            </p>
          ) : (
            <>
              <p className="search-note" role="status">
                {t.searchFound}: <b>{total}</b>
              </p>

              {(!!contactLines.length || !!resources.length) && (
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
                              <a href={r.url} target="_blank" rel="noopener noreferrer">
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
                {pages.map((p) => (
                  <li key={`p${p.id}`} className="hit">
                    <span className="hit-kind">{L.page}</span>
                    <h2>
                      <Link href={`/${encodeURIComponent(p.slug || '')}`}>{p.title}</Link>
                    </h2>
                    <Snip text={plainText(p.content)} words={words} />
                  </li>
                ))}
                {videos.map((v) => (
                  <li key={`v${v.id}`} className="hit">
                    <span className="hit-kind">{L.video}</span>
                    <h2>
                      <Link href="/video">{v.title}</Link>
                    </h2>
                    {v.description && <Snip text={v.description} words={words} fallback={v.description} />}
                  </li>
                ))}
                {news?.docs.map((n: any) => (
                  <li key={`n${n.id}`} className="hit">
                    <span className="hit-kind">
                      {L.news} · <time dateTime={n.publishedAt}>{formatDate(n.publishedAt)}</time>
                    </span>
                    <h2>
                      <Link href={`/news/${encodeURIComponent(n.slug || '')}`}>{n.title}</Link>
                    </h2>
                    <Snip text={`${n.excerpt || ''}\n${plainText(n.content)}`} words={words} fallback={n.excerpt} />
                  </li>
                ))}
              </ol>

              {news && news.totalPages > 1 && (
                <nav className="pager" aria-label={t.newsPages}>
                  {Array.from({ length: news.totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === news!.totalPages || Math.abs(p - page) <= 2)
                    .map((p) => (
                      <Link key={p} className={p === page ? 'on' : undefined} href={pageLink(p)} aria-current={p === page ? 'page' : undefined}>
                        {p}
                      </Link>
                    ))}
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </SiteShell>
  )
}
