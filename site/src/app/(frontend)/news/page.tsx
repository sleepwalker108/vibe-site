import Link from 'next/link'
import { NewsCard } from '@/components/NewsCard'
import { SiteShell } from '@/components/SiteShell'
import { getClient, isDraftMode, publishedOnly } from '@/lib/payload'
import { getDict, localeQuery } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export async function generateMetadata() {
  const { t } = await getDict()
  return pageMetadata({ title: t.news, path: '/news' })
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function NewsPage({ searchParams }: Props) {
  const sp = await searchParams
  const draft = await isDraftMode(sp)
  const { locale, t } = await getDict()
  const page = Math.max(1, Number(sp.page) || 1)
  const payload = await getClient()
  const news = await payload.find({
    collection: 'news',
    draft,
    where: publishedOnly(draft),
    sort: '-publishedAt',
    limit: 12,
    page,
    depth: 1,
    ...localeQuery(locale),
  })

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
          <div className="news-grid">
            {news.docs.map((n) => (
              <NewsCard key={n.id} item={n} level={2} />
            ))}
          </div>
          {news.totalPages > 1 && (
            <nav className="pager" aria-label={t.newsPages}>
              {pages.map((p) => (
                <Link key={p} className={p === page ? 'on' : undefined} href={`/news?page=${p}`}>
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
