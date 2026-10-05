import type { Metadata } from 'next'
import { cache } from 'react'
import { getClient, mediaUrl } from './payload'
import { getLocale } from './i18n'
import type { Locale } from './dictionary'

// Справжня адреса сайту — для Google, карти сайту й соцмереж (навіть коли сайт відкрито локально)
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dp-reintegration.gov.ua').replace(/\/$/, '')

const DEFAULTS = {
  uk: {
    siteTitle: 'Національна агенція розвитку територій України (НАРТУ)',
    titleSuffix: 'НАРТУ',
    description:
      'ДНТ «Національна агенція розвитку територій України»: гарячі лінії 1548 та 1648, допомога ВПО, евакуація, житло та відновлення територій.',
  },
  en: {
    siteTitle: 'National Agency for Territorial Development of Ukraine',
    titleSuffix: 'NATDU',
    description:
      'National Agency for Territorial Development of Ukraine: hotlines 1548 and 1648, support for IDPs, evacuation, housing and recovery of territories.',
  },
}

export const getSeo = cache(async (locale: Locale) => {
  const payload = await getClient()
  const seo = await payload.findGlobal({ slug: 'seo', depth: 1, locale, fallbackLocale: 'uk' }).catch(() => null)
  const d = DEFAULTS[locale]
  return {
    siteTitle: seo?.siteTitle || d.siteTitle,
    titleSuffix: seo?.titleSuffix || d.titleSuffix,
    description: seo?.description || d.description,
    keywords: seo?.keywords || undefined,
    image: mediaUrl(seo?.shareImage, 'wide'),
    googleVerification: seo?.googleVerification || undefined,
    bingVerification: seo?.bingVerification || undefined,
    allowIndexing: seo?.allowIndexing !== false,
  }
})

// Адреса сторінки певною мовою: українська — звичайна, англійська — з ?lang=en
export const localizedUrl = (path: string, locale: Locale) => {
  const url = SITE_URL + encodeURI(path)
  return locale === 'en' ? `${url}${url.includes('?') ? '&' : '?'}lang=en` : url
}

const absolute = (url?: string) => (url ? (/^https?:/.test(url) ? url : SITE_URL + url) : undefined)

// Перші ~160 символів тексту з редактора — запасний опис для Google
export const plainText = (richText: unknown, max = 160) => {
  const parts: string[] = []
  const walk = (n: any) => {
    // підзаголовки пропускаємо — опис має бути звичайним реченням
    if (!n || n.type === 'heading' || parts.join(' ').length > max * 2) return
    if (n.type === 'text' && typeof n.text === 'string') parts.push(n.text)
    if (Array.isArray(n.children)) n.children.forEach(walk)
    if (n.root) walk(n.root)
  }
  walk(richText)
  const text = parts.join(' ').replace(/\s+/g, ' ').trim()
  return text.length > max ? text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : text
}

type PageMetaInput = {
  title?: string | null // назва сторінки; без неї — назва сайту
  description?: string | null
  path: string
  image?: string
  noindex?: boolean | null
  type?: 'website' | 'article'
  publishedTime?: string | null
  modifiedTime?: string | null
}

// Повний набір даних для пошуковиків і соцмереж для однієї сторінки
export const pageMetadata = async (p: PageMetaInput): Promise<Metadata> => {
  const locale = await getLocale()
  const seo = await getSeo(locale)
  const title = p.title ? `${p.title} — ${seo.titleSuffix}` : seo.siteTitle
  const description = p.description?.trim() || seo.description
  const url = localizedUrl(p.path, locale)
  const image = absolute(p.image) || absolute(seo.image) || `${SITE_URL}/img/og-default.png`
  const index = seo.allowIndexing && !p.noindex

  return {
    metadataBase: new URL(SITE_URL),
    title: { absolute: title },
    description,
    keywords: seo.keywords,
    alternates: {
      canonical: url,
      languages: { uk: localizedUrl(p.path, 'uk'), en: localizedUrl(p.path, 'en'), 'x-default': localizedUrl(p.path, 'uk') },
    },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: p.type || 'website',
      url,
      title,
      description,
      siteName: seo.siteTitle,
      locale: locale === 'en' ? 'en_US' : 'uk_UA',
      alternateLocale: locale === 'en' ? 'uk_UA' : 'en_US',
      images: [{ url: image }],
      ...(p.type === 'article' ? { publishedTime: p.publishedTime || undefined, modifiedTime: p.modifiedTime || undefined } : {}),
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    verification: {
      google: seo.googleVerification,
      other: seo.bingVerification ? { 'msvalidate.01': seo.bingVerification } : undefined,
    },
  }
}
