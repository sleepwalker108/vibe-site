import type { MetadataRoute } from 'next'
import { getClient } from '@/lib/payload'
import { SITE_URL } from '@/lib/seo'

// /robots.txt — що пошуковикам можна читати. Адмінку й службові адреси закрито.
export const dynamic = 'force-dynamic'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const payload = await getClient()
  const seo = await payload.findGlobal({ slug: 'seo', depth: 0 }).catch(() => null)
  if (seo?.allowIndexing === false) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: { userAgent: '*', allow: ['/', '/api/media/'], disallow: ['/admin', '/api/', '/visit', '/*?preview=1'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
