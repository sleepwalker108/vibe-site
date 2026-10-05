// Перевірка всіх посилань у текстах новин і сторінок (лише читання)
import { getPayload } from 'payload'
import config from '../payload.config'
const payload = await getPayload({ config: await config })
const links: { where: string; text: string; url: string; type?: string; newTab?: boolean }[] = []
const walk = (n: any, where: string) => {
  if (!n || typeof n !== 'object') return
  if (Array.isArray(n)) return n.forEach((x) => walk(x, where))
  if ((n.type === 'link' || n.type === 'autolink') && n.fields) {
    links.push({ where, text: (n.children || []).map((c: any) => c.text || '').join(''), url: n.fields.url, type: n.fields.linkType, newTab: n.fields.newTab })
  }
  for (const v of Object.values(n)) if (v && typeof v === 'object') walk(v, where)
}
for (const locale of ['uk', 'en'] as const) {
  for (const col of ['news', 'pages'] as const) {
    const { docs } = await payload.find({ collection: col, limit: 2000, depth: 0, locale, fallbackLocale: false, where: { _status: { equals: 'published' } } })
    for (const d of docs as any[]) walk(d.content, `${col}/${d.slug} [${locale}]`)
  }
}
const pages = new Set((await payload.find({ collection: 'pages', limit: 2000, depth: 0, pagination: false })).docs.map((d: any) => d.slug))
const news = new Set((await payload.find({ collection: 'news', limit: 5000, depth: 0, pagination: false })).docs.map((d: any) => d.slug))
const dec = (u: string) => { try { return decodeURI(u) } catch { return u } }
const cats: Record<string, typeof links> = {}
const add = (k: string, l: (typeof links)[number]) => (cats[k] ||= []).push(l)
for (const l of links) {
  const u = l.url || ''
  if (l.type === 'internal') add('internal (без адреси)', l)
  else if (!u || u === 'https://' || u === '#') add('порожнє', l)
  else if (/^https?:\/\/(www\.)?dp-reintegration\.gov\.ua/i.test(u)) {
    const path = dec(u.replace(/^https?:\/\/(www\.)?dp-reintegration\.gov\.ua/i, '')).replace(/\/$/, '') || '/'
    const slug = path.replace(/^\//, '')
    if (/wp-content|\.pdf|\.docx?|\.xlsx?/i.test(path)) add('старий сайт: файл', l)
    else if (pages.has(slug) || path === '/' || path === '/news' || (path.startsWith('/news/') && news.has(path.slice(6)))) add('старий сайт: сторінка існує', l)
    else add('старий сайт: сторінки нема', l)
  } else if (u.startsWith('/')) {
    const path = dec(u).split(/[?#]/)[0].replace(/\/$/, '') || '/'
    const slug = path.replace(/^\//, '')
    if (pages.has(slug) || ['/', '/news', '/video'].includes(path) || (path.startsWith('/news/') && news.has(path.slice(6)))) add('внутрішнє: ок', l)
    else add('внутрішнє: сторінки нема', l)
  } else if (/^(mailto:|tel:)/.test(u)) add('пошта/телефон', l)
  else if (/^https?:\/\//.test(u)) add('зовнішнє', l)
  else add('дивна адреса', l)
}
for (const [k, v] of Object.entries(cats)) {
  console.log(`\n== ${k}: ${v.length}`)
  if (!/ок|зовнішнє|пошта|існує/.test(k)) v.slice(0, 15).forEach((l) => console.log(`  ${l.where} | «${l.text.slice(0, 40)}» -> ${dec(l.url || '').slice(0, 110)}`))
  else v.slice(0, 3).forEach((l) => console.log(`  e.g. ${dec(l.url || '').slice(0, 100)}`))
}
process.exit(0)
