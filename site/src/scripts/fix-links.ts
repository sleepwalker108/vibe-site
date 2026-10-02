// Одноразово: посилання в текстах, що ведуть на старий WordPress (?page_id=…, https://dp-reintegration.gov.ua/slug/),
// переписуємо на сторінки нового сайту. Файли (PDF тощо) поки лишаються на старому сервері.
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '../payload.config'

const payload = await getPayload({ config: await config })
const OLD = 'dp-reintegration.gov.ua'

const wpPages: { id: number; slug: string; link: string }[] = JSON.parse(
  fs.readFileSync(path.resolve('src/scripts/wp-page-ids.json'), 'utf8'),
)
const ours = new Set((await payload.find({ collection: 'pages', limit: 500, depth: 0, select: { slug: true } })).docs.map((p) => p.slug))
const news = (await payload.find({ collection: 'news', limit: 2000, depth: 0, select: { slug: true, legacyUrl: true } })).docs

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}
const byId = new Map(wpPages.map((p) => [String(p.id), decode(p.slug)]))
const byLegacy = new Map(news.map((n) => [n.legacyUrl?.replace(/\/$/, ''), n.slug]))

const rewrite = (url: string): string => {
  if (!url.includes(OLD) || url.includes('/wp-content/')) return url // файли поки лишаємо
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return url // зіпсоване посилання — лишаємо як є
  }
  const pid = u.searchParams.get('page_id')
  if (pid && byId.has(pid) && ours.has(byId.get(pid)!)) return '/' + byId.get(pid)
  const legacy = byLegacy.get(url.replace(/\/$/, ''))
  if (legacy) return '/news/' + legacy
  const last = decode(u.pathname.split('/').filter(Boolean).pop() || '')
  if (!u.pathname.includes('/en/') && last && ours.has(last)) return '/' + last
  if (u.pathname === '/' && !u.search) return '/'
  return url
}

let changed = 0
const walk = (node: any) => {
  if (!node || typeof node !== 'object') return
  if (node.fields?.url && typeof node.fields.url === 'string') {
    const next = rewrite(node.fields.url)
    if (next !== node.fields.url) {
      node.fields.url = next
      node.fields.newTab = false
      changed++
    }
  }
  for (const k of Object.keys(node)) if (typeof node[k] === 'object') walk(node[k])
}

for (const collection of ['pages', 'news'] as const) {
  const { docs } = await payload.find({ collection, limit: 2000, depth: 0, locale: 'uk', fallbackLocale: false })
  for (const doc of docs) {
    if (!doc.content) continue
    const before = changed
    walk(doc.content)
    if (changed > before) {
      await payload.update({ collection, id: doc.id, locale: 'uk', data: { content: doc.content, _status: 'published' } as any })
      payload.logger.info(`  ✓ ${collection}: ${doc.slug} (${changed - before})`)
    }
  }
}
payload.logger.info(`Готово: переписано посилань — ${changed}`)
process.exit(0)
