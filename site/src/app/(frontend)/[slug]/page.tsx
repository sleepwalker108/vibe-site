import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { PageSidebar } from '@/components/PageSidebar'
import { Prose } from '@/components/Prose'
import { SiteShell } from '@/components/SiteShell'
import { getClient, isDraftMode, mediaUrl, publishedOnly } from '@/lib/payload'
import { getDict, getLocale, localeQuery } from '@/lib/i18n'
import { pageMetadata, plainText } from '@/lib/seo'

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

export async function generateMetadata({ params }: Props) {
  const locale = await getLocale()
  const slug = decode((await params).slug)
  const payload = await getClient()
  const page = (
    await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: slug } }, publishedOnly(false)!] },
      limit: 1,
      depth: 1,
      ...localeQuery(locale),
    })
  ).docs[0]
  if (!page) return { robots: { index: false } }
  return pageMetadata({
    title: page.meta?.title || page.title,
    description: page.meta?.description || plainText(page.content),
    path: `/${page.slug}`,
    image: mediaUrl(page.meta?.image, 'wide'),
    noindex: page.meta?.noindex,
  })
}

export default async function Page({ params, searchParams }: Props) {
  const draft = await isDraftMode(await searchParams)
  const { locale, t } = await getDict()
  const slug = decode((await params).slug)
  // стара адреса сторінки відео на WordPress → нова сторінка-галерея
  if (slug === 'відеоматеріали') redirect('/video')
  const payload = await getClient()
  const res = await payload.find({
    collection: 'pages',
    draft,
    where: { and: [{ slug: { equals: slug } }, ...(draft ? [] : [publishedOnly(false)!])] },
    limit: 1,
    ...localeQuery(locale),
  })
  const page = res.docs[0]
  if (!page) notFound()
  const translated =
    locale === 'uk' ||
    !!(await payload.findByID({ collection: 'pages', id: page.id, draft, locale, fallbackLocale: false, select: { title: true } }))?.title

  return (
    <SiteShell draft={draft}>
      <section className="page-head">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{t.breadcrumbHome}</Link> / {page.title}
          </div>
          <h1>{page.title}</h1>
        </div>
      </section>
      <div className="article wrap page-layout">
        <article className="page-main">
          {!translated && <p className="not-translated">{t.notTranslated}</p>}
          {page.content && <Prose data={page.content} labels={t} />}
        </article>
        <PageSidebar path={`/${slug}`} locale={locale} t={t} draft={draft} />
      </div>
    </SiteShell>
  )
}
