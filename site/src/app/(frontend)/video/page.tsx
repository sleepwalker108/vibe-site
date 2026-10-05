import Link from 'next/link'
import { SiteShell } from '@/components/SiteShell'
import { VideoGallery, type GalleryVideo } from '@/components/VideoGallery'
import { getDict, localeQuery } from '@/lib/i18n'
import { formatDate, getClient, isDraftMode, mediaUrl } from '@/lib/payload'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const { t } = await getDict()
  return pageMetadata({ title: t.videos, path: '/video' })
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function VideosPage({ searchParams }: Props) {
  const draft = await isDraftMode(await searchParams)
  const { locale, t } = await getDict()
  const payload = await getClient()
  const { docs } = await payload.find({ collection: 'videos', sort: '-publishedAt', limit: 100, depth: 1, ...localeQuery(locale) })

  const videos: GalleryVideo[] = docs
    .map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      src: (v.source === 'file' ? mediaUrl(v.file) : v.url) || '',
      poster: mediaUrl(v.poster, 'wide') || null,
      date: formatDate(v.publishedAt),
    }))
    .filter((v) => v.src)

  return (
    <SiteShell draft={draft}>
      <section className="page-head">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{t.breadcrumbHome}</Link> / {t.videos}
          </div>
          <h1>{t.videos}</h1>
        </div>
      </section>
      <section className="video-sec">
        <div className="wrap">
          <VideoGallery videos={videos} labels={{ playVideo: t.playVideo, close: t.close }} />
        </div>
      </section>
    </SiteShell>
  )
}
