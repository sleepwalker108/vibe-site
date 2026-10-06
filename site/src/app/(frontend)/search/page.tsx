import Link from 'next/link'
import type { Where } from 'payload'
import { NewsCard } from '@/components/NewsCard'
import { SiteShell } from '@/components/SiteShell'
import { getClient, publishedOnly } from '@/lib/payload'
import { getDict, localeQuery } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const { t } = await getDict()
  return { ...(await pageMetadata({ title: t.search, path: '/search' })), robots: { index: false, follow: true } }
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// Українські слова змінюються (евакуація → евакуації, евакуацію), тож шукаємо за основою:
// у довгих словах відкидаємо закінчення (останні 1–2 літери)
const stem = (w: string) => (w.length >= 7 ? w.slice(0, -2) : w.length >= 5 ? w.slice(0, -1) : w)

// База розрізняє великі й малі кириличні літери — тож шукаємо кожне слово в кількох написаннях
const variants = (word: string) => {
  const w = stem(word)
  const low = w.toLocaleLowerCase('uk')
  return [...new Set([w, low, low.charAt(0).toLocaleUpperCase('uk') + low.slice(1), low.toLocaleUpperCase('uk')])]
}
// Кожне слово запиту має знайтися в одному з полів (у будь-якому написанні)
const matchAll = (words: string[], fields: string[]): Where => ({
  and: words.map((w) => ({ or: fields.flatMap((f) => variants(w).map((v) => ({ [f]: { like: v } }))) })),
})

const PER_PAGE = 24

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = String(sp.q || '').trim().slice(0, 100)
  const page = Math.max(1, Number(sp.page) || 1)
  const { locale, t } = await getDict()
  const words = q.split(/\s+/).filter((w) => w.length >= 2).slice(0, 6)

  const payload = await getClient()
  const [news, pages] = words.length
    ? await Promise.all([
        payload.find({
          collection: 'news',
          where: { and: [publishedOnly(false)!, matchAll(words, ['title', 'excerpt'])] },
          sort: '-publishedAt',
          limit: PER_PAGE,
          page,
          depth: 1,
          ...localeQuery(locale),
        }),
        page === 1
          ? payload.find({
              collection: 'pages',
              where: { and: [publishedOnly(false)!, matchAll(words, ['title'])] },
              limit: 10,
              depth: 0,
              select: { title: true, slug: true },
              ...localeQuery(locale),
            })
          : Promise.resolve({ docs: [] as { id: number; title: string; slug?: string | null }[] }),
      ])
    : [null, null]

  const total = (news?.totalDocs || 0) + (pages?.docs.length || 0)
  const pageLink = (p: number) => `/search?q=${encodeURIComponent(q)}${p > 1 ? `&page=${p}` : ''}`

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

      <section className="news-list search-results">
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
              <p className="search-note">
                {t.searchFound}: <b>{total}</b>
              </p>
              {!!pages?.docs.length && (
                <ul className="search-pages">
                  {pages.docs.map((p) => (
                    <li key={p.id}>
                      <Link href={`/${encodeURIComponent(p.slug || '')}`}>{p.title}</Link>
                    </li>
                  ))}
                </ul>
              )}
              {!!news?.docs.length && (
                <div className="news-grid">
                  {news.docs.map((n) => (
                    <NewsCard key={n.id} item={n} level={2} />
                  ))}
                </div>
              )}
              {news && news.totalPages > 1 && (
                <nav className="pager" aria-label={t.newsPages}>
                  {Array.from({ length: news.totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === news.totalPages || Math.abs(p - page) <= 2)
                    .map((p) => (
                      <Link key={p} className={p === page ? 'on' : undefined} href={pageLink(p)}>
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
