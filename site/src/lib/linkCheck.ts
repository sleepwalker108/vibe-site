// Перевірка посилань і картинок у текстах новин і сторінок (лише читання бази, без запитів в інтернет)
import type { Payload } from 'payload'

export type LinkIssueKind = 'missing-page' | 'missing-file' | 'missing-image' | 'empty' | 'old-site-page' | 'old-site-file'
export type LinkIssue = {
  kind: LinkIssueKind
  collection: 'news' | 'pages'
  id: number | string
  title: string
  locale: 'uk' | 'en'
  text: string
  url: string
}
export type LinkReport = { checked: number; docs: number; issues: LinkIssue[] }

// Справжні проблеми (посилання вже не працює) і попередження (перестане працювати, коли вимкнуть старий сайт)
export const BROKEN: LinkIssueKind[] = ['missing-page', 'missing-file', 'missing-image', 'empty']

const OLD_SITE = /^https?:\/\/(www\.)?dp-reintegration\.gov\.ua/i
const STATIC_PATHS = new Set(['/', '/news', '/video', '/search', '/stats'])

const dec = (u: string) => {
  try {
    return decodeURI(u)
  } catch {
    return u
  }
}
const textOf = (n: any): string => (n?.text || '') + (n?.children || []).map(textOf).join('')

export const checkLinks = async (payload: Payload): Promise<LinkReport> => {
  const [pagesAll, newsAll, mediaAll] = await Promise.all([
    payload.find({ collection: 'pages', limit: 0, pagination: false, depth: 0, select: { slug: true } }),
    payload.find({ collection: 'news', limit: 0, pagination: false, depth: 0, select: { slug: true } }),
    payload.find({ collection: 'media', limit: 0, pagination: false, depth: 0, select: { filename: true, sizes: true } }),
  ])
  const pageSlugs = new Set(pagesAll.docs.map((d: any) => d.slug))
  const newsSlugs = new Set(newsAll.docs.map((d: any) => d.slug))
  const ids = { pages: new Set(pagesAll.docs.map((d) => String(d.id))), news: new Set(newsAll.docs.map((d) => String(d.id))) }
  const mediaIds = new Set(mediaAll.docs.map((d) => String(d.id)))
  const files = new Set<string>()
  for (const m of mediaAll.docs as any[]) {
    if (m.filename) files.add(m.filename)
    for (const s of Object.values(m.sizes || {}) as any[]) if (s?.filename) files.add(s.filename)
  }

  const pathExists = (p: string) => {
    const clean = dec(p).split(/[?#]/)[0].replace(/\/$/, '') || '/'
    if (STATIC_PATHS.has(clean)) return true
    if (clean.startsWith('/news/')) return newsSlugs.has(clean.slice(6))
    if (clean.startsWith('/api/media/file/')) return files.has(clean.slice(16))
    return pageSlugs.has(clean.slice(1))
  }

  const issues: LinkIssue[] = []
  let checked = 0
  let docsCount = 0
  for (const collection of ['news', 'pages'] as const) {
    for (const locale of ['uk', 'en'] as const) {
      const { docs } = await payload.find({
        collection,
        limit: 0,
        pagination: false,
        depth: 0,
        locale,
        fallbackLocale: false,
        select: { title: true, content: true },
      })
      for (const d of docs as any[]) {
        if (!d.content) continue
        docsCount++
        const add = (kind: LinkIssueKind, text: string, url: string) =>
          issues.push({ kind, collection, id: d.id, title: d.title || '(без назви)', locale, text: text.slice(0, 80), url: dec(url).slice(0, 200) })
        const walk = (n: any) => {
          if (!n || typeof n !== 'object') return
          if (Array.isArray(n)) return n.forEach(walk)
          if (n.type === 'upload') {
            checked++
            const v = typeof n.value === 'object' && n.value ? n.value.id : n.value
            if (v == null || !mediaIds.has(String(v))) add('missing-image', 'картинка / файл з медіатеки', `медіатека #${v ?? '?'}`)
          } else if ((n.type === 'link' || n.type === 'autolink') && n.fields) {
            checked++
            const text = textOf(n)
            const f = n.fields
            if (f.linkType === 'internal') {
              const rel = f.doc?.relationTo as 'news' | 'pages' | undefined
              const v = typeof f.doc?.value === 'object' && f.doc?.value ? f.doc.value.id : f.doc?.value
              if (!rel || v == null || !ids[rel]?.has(String(v))) add('missing-page', text, 'посилання на видалену сторінку')
            } else {
              const u: string = (f.url || '').trim()
              if (!u || u === '#' || u === 'https://' || u === 'http://') add('empty', text, u || '(порожньо)')
              else if (OLD_SITE.test(u)) {
                const p = u.replace(OLD_SITE, '') || '/'
                if (/\/wp-content\//i.test(p)) add('old-site-file', text, u)
                else if (!pathExists(p)) add('old-site-page', text, u)
              } else if (u.startsWith('/wp-content/')) add('old-site-file', text, u)
              else if (u.startsWith('/') && !u.startsWith('//')) {
                if (!pathExists(u)) add(u.startsWith('/api/media/') ? 'missing-file' : 'missing-page', text, u)
              }
            }
          }
          for (const v of Object.values(n)) if (v && typeof v === 'object') walk(v)
        }
        walk(d.content)
      }
    }
  }
  return { checked, docs: docsCount, issues }
}
