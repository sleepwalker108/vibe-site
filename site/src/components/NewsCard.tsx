import Link from 'next/link'
import type { News } from '@/payload-types'
import { formatDate, mediaUrl } from '@/lib/payload'
import { topicLabel } from '@/lib/topics'

export const NewsCard = ({
  item,
  featured = false,
  level = 3,
  locale = 'uk',
}: {
  item: News
  featured?: boolean
  level?: 2 | 3
  locale?: 'uk' | 'en'
}) => {
  const H = level === 2 ? 'h2' : 'h3'
  const img = mediaUrl(item.cover, featured ? 'wide' : 'card')
  // мітка: власна (якщо вписана в адмінці) або перша тема новини
  const tag = item.tag || (item.topics?.[0] ? topicLabel(item.topics[0], locale) : null)
  return (
    <Link className={`news-card${featured ? ' featured' : ''}`} href={`/news/${encodeURIComponent(item.slug || '')}`}>
      <div className="img">{img ? <img src={img} alt="" loading="lazy" /> : <div className="ph">1548</div>}</div>
      <div className="body">
        {featured && tag && <span className="tag">{tag}</span>}
        <time>
          {formatDate(item.publishedAt)}
          {!featured && tag && <span className="card-topic"> · {tag}</span>}
        </time>
        <H className="news-card-title">{item.title}</H>
        {featured && item.excerpt && <p>{item.excerpt}</p>}
      </div>
    </Link>
  )
}
