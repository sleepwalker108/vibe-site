import Link from 'next/link'
import type { News } from '@/payload-types'
import { formatDate, mediaUrl } from '@/lib/payload'
import { topicName } from '@/lib/topics'

export const NewsCard = ({
  item,
  featured = false,
  level = 3,
}: {
  item: News
  featured?: boolean
  level?: 2 | 3
  locale?: 'uk' | 'en' // назву категорії вже повертає база потрібною мовою
}) => {
  const H = level === 2 ? 'h2' : 'h3'
  const img = mediaUrl(item.cover, featured ? 'wide' : 'card')
  // мітка на картці — перша категорія новини
  const tag = topicName(item.topics?.[0])
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
