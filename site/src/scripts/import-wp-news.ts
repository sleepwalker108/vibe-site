// Імпорт усіх новин зі старого сайту (WordPress) у новий — разом із картинками й PDF.
//
//   На сервері:   sudo nartu-task import-wp-news
//   Для перевірки: LIMIT=5 … (лише 5 новин),  ONLY_NEW=0 … (перезаписати вже імпортовані)
//
// Що робить для кожної новини:
//   • українська версія: заголовок, дата, короткий опис, текст, адреса (як на старому сайті), стара адреса для переадресації;
//   • картинки з тексту завантажує в медіатеку (WebP) і вставляє в текст; перша картинка стає обкладинкою;
//   • PDF зі старого сервера теж переносить у медіатеку й міняє посилання на нові;
//   • англійська версія (якщо є на старому сайті) — додається до тієї самої новини.
// Повторний запуск безпечний: уже імпортовані новини й завантажені файли не дублюються.
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import crypto from 'crypto'
import fs from 'fs'
import { JSDOM } from 'jsdom'
import path from 'path'
import { getPayload } from 'payload'
import config from '../payload.config'

const OLD = 'https://dp-reintegration.gov.ua'
const LIMIT = Number(process.env.LIMIT || 0)
const ONLY_NEW = process.env.ONLY_NEW !== '0'
const CACHE_FILE = path.resolve('.wp-import-cache.json') // старий URL файлу → id у медіатеці

const payload = await getPayload({ config: await config })
const editorConfig = await editorConfigFactory.default({ config: payload.config })
const log = (m: string) => payload.logger.info(m)

// ---------- кеш завантажених файлів ----------
const cache: Record<string, number> = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {}
const saveCache = () => fs.writeFileSync(CACHE_FILE, JSON.stringify(cache))

const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf' }

// Розпакований архів wp-content/uploads старого сайту (поруч із папкою site). Якщо файл там є — беремо звідти,
// інакше завантажуємо зі старого сайту.
const UPLOADS_DIR = path.resolve(process.env.WP_UPLOADS || '../wp-uploads')
const hasLocal = fs.existsSync(UPLOADS_DIR)
let fromDisk = 0
let fromWeb = 0

const download = async (url: string) => {
  const m = hasLocal ? new URL(url).pathname.match(/^\/wp-content\/uploads\/(.+)$/) : null
  if (m) {
    let rel = m[1]
    try {
      rel = decodeURIComponent(rel)
    } catch {}
    const file = path.join(UPLOADS_DIR, rel)
    if (file.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(file)) {
      fromDisk++
      return fs.readFileSync(file)
    }
  }
  fromWeb++
  if (hasLocal) log(`    ↓ з інтернету: ${decodeURI(url).slice(0, 120)}`)
  const r = await fetch(url, { signal: AbortSignal.timeout(60000) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return Buffer.from(await r.arrayBuffer())
}

// Завантажує файл зі старого сайту в медіатеку (один раз). Для картинок пробує оригінал без «-1320x880».
const toMedia = async (rawUrl: string, alt: string): Promise<{ id: number; url: string } | null> => {
  const url = new URL(rawUrl, OLD).href
  if (cache[url]) {
    const doc = await payload.findByID({ collection: 'media', id: cache[url], depth: 0 }).catch(() => null)
    if (doc) return { id: doc.id as number, url: doc.url as string }
  }
  const original = url.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1')
  let data: Buffer | null = null
  for (const u of original !== url ? [original, url] : [url]) {
    try {
      data = await download(u)
      break
    } catch {}
  }
  if (!data) {
    payload.logger.warn(`    ! не вдалося завантажити ${url}`)
    return null
  }
  const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'file').replace(/-\d+x\d+(\.[a-z]+)$/i, '$1')
  const ext = (name.split('.').pop() || '').toLowerCase()
  const mimetype = MIME[ext]
  if (!mimetype) return null
  try {
    const doc = await payload.create({
      collection: 'media',
      data: { alt: alt.slice(0, 250) },
      file: { data, mimetype, name, size: data.length },
      overrideAccess: true,
    })
    cache[url] = doc.id as number
    saveCache()
    return { id: doc.id as number, url: doc.url as string }
  } catch (e: any) {
    payload.logger.warn(`    ! не вдалося зберегти ${name}: ${e.message?.slice(0, 80)}`)
    return null
  }
}

// ---------- перетворення HTML старої новини ----------
const textOf = (html: string) => new JSDOM(`<body>${html}</body>`).window.document.body.textContent?.replace(/\s+/g, ' ').trim() || ''
const isOldFile = (href: string) => /^(https?:\/\/(www\.)?dp-reintegration\.gov\.ua)?\/wp-content\/uploads\//i.test(href)

type Prepared = { html: string; images: { id: number; url: string }[] }

const prepare = async (html: string, title: string): Promise<Prepared> => {
  const doc = new JSDOM(`<body>${html}</body>`).window.document
  doc.querySelectorAll('script, style, noscript, iframe').forEach((e) => e.remove())
  const images: { id: number; url: string }[] = []

  // картинки → мітки @@IMG:n@@ (окремим абзацом), підпис — курсивом під нею
  for (const img of Array.from(doc.querySelectorAll('img'))) {
    const src = img.getAttribute('data-src') || img.getAttribute('src') || ''
    let wrapper: Element = img
    while (wrapper.parentElement && wrapper.parentElement !== doc.body && ['A', 'FIGURE', 'P', 'SPAN', 'DIV'].includes(wrapper.parentElement.tagName) && wrapper.parentElement.querySelectorAll('img').length === 1) {
      wrapper = wrapper.parentElement
    }
    const caption = wrapper.querySelector?.('figcaption')?.textContent?.trim()
    const media = src && !src.startsWith('data:') ? await toMedia(src, img.getAttribute('alt')?.trim() || caption || title) : null
    const p = doc.createElement('p')
    if (media) {
      images.push(media)
      p.textContent = `@@IMG:${images.length - 1}@@`
    }
    const parts: Element[] = media ? [p] : []
    if (caption) {
      const c = doc.createElement('p')
      const em = doc.createElement('em')
      em.textContent = caption
      c.appendChild(em)
      parts.push(c)
    }
    wrapper.replaceWith(...parts)
  }
  // галереї та інші обгортки — розгортаємо, щоб мітки стали окремими абзацами
  doc.querySelectorAll('figure, figcaption').forEach((f) => f.replaceWith(...Array.from(f.childNodes)))

  // посилання: порожні — прибираємо; PDF/документи зі старого сервера — переносимо в медіатеку
  for (const a of Array.from(doc.querySelectorAll('a'))) {
    const href = a.getAttribute('href')?.trim() || ''
    if (!href) {
      a.replaceWith(...Array.from(a.childNodes))
      continue
    }
    if (isOldFile(href) && /\.pdf(\?|$)/i.test(href)) {
      const media = await toMedia(href, a.textContent?.trim() || title)
      if (media) a.setAttribute('href', media.url)
    }
  }
  return { html: doc.body.innerHTML, images }
}

const uploadNode = (mediaId: number) => ({
  type: 'upload',
  version: 3,
  format: '',
  id: crypto.randomBytes(12).toString('hex'),
  fields: null,
  relationTo: 'media',
  value: mediaId,
})

// HTML → текст редактора; мітки картинок → вузли «картинка з медіатеки»
const toLexical = (prepared: Prepared, skipFirstImage: boolean) => {
  let state: any
  try {
    state = convertHTMLToLexical({ editorConfig, html: prepared.html, JSDOM }) as any
  } catch {
    state = convertHTMLToLexical({ editorConfig, html: `<p>${textOf(prepared.html)}</p>`, JSDOM }) as any
  }
  const textInside = (n: any): string => (n.text || '') + (n.children || []).map(textInside).join('')
  state.root.children = (state.root.children as any[]).flatMap((n: any, i: number) => {
    const m = n.type === 'paragraph' ? textInside(n).trim().match(/^@@IMG:(\d+)@@$/) : null
    if (!m) return [n]
    const k = Number(m[1])
    if (k === 0 && skipFirstImage && i <= 1) return [] // перша картинка вгорі — це вже обкладинка
    return [uploadNode(prepared.images[k].id)]
  })
  // мітки, що опинились усередині інших блоків, — просто прибираємо
  const strip = (n: any) => {
    if (typeof n.text === 'string') n.text = n.text.replace(/@@IMG:\d+@@/g, '')
    ;(n.children || []).forEach(strip)
  }
  strip(state.root)
  return state
}

const excerptOf = (p: any) =>
  textOf(p.excerpt?.rendered || '')
    .replace(/(Читати далі|Continue reading|Read more).*$/i, '')
    .replace(/\[…\]|\[\.\.\.\]|…$/g, '')
    .trim()
    .slice(0, 300) || textOf(p.content.rendered).slice(0, 250)

// ---------- завантаження списку новин зі старого сайту ----------
log(hasLocal ? `Файли беру з ${UPLOADS_DIR}` : `Папки ${UPLOADS_DIR} немає — файли завантажую зі старого сайту`)
log('Завантажую список новин зі старого сайту…')
const all: any[] = []
for (let page = 1; ; page++) {
  const r = await fetch(`${OLD}/wp-json/wp/v2/posts?per_page=100&page=${page}&_fields=id,date,date_gmt,slug,link,title,excerpt,content,categories`)
  if (!r.ok) break
  const batch = await r.json()
  if (!batch.length) break
  all.push(...batch)
  if (batch.length < 100) break
}
// рубрики старого сайту → теми новин (фільтр на сайті)
const catNames = new Map<number, string>()
try {
  const r = await fetch(`${OLD}/wp-json/wp/v2/categories?per_page=100&_fields=id,name`)
  if (r.ok) for (const c of await r.json()) catNames.set(c.id, textOf(c.name))
} catch {}
// рубрика старого сайту → категорія (за полем «Рубрики старого сайту» або за назвою категорії)
const norm = (s: string) => s.toLocaleLowerCase('uk').replace(/\s+/g, ' ').trim()
const topicByWp = new Map<string, number>()
for (const locale of ['uk', 'en'] as const) {
  const { docs } = await payload.find({ collection: 'topics', limit: 200, depth: 0, locale, fallbackLocale: false })
  for (const t of docs as any[]) {
    if (t.name) topicByWp.set(norm(t.name), t.id)
    for (const w of String(t.wpNames || '').split(',')) if (w.trim()) topicByWp.set(norm(w), t.id)
  }
}
const topicsOf = (p: any): number[] => [
  ...new Set(((p.categories || []) as number[]).map((id) => topicByWp.get(norm(catNames.get(id) || ''))).filter((t): t is number => !!t)),
]

const isEn = (p: any) =>/\/en\//.test(p.link)
const enByDate = new Map(all.filter(isEn).map((p) => [p.date, p]))
let uk = all.filter((p) => !isEn(p)).sort((a, b) => a.date.localeCompare(b.date))
if (LIMIT) uk = uk.slice(-LIMIT)
log(`Знайдено ${uk.length} українських новин (${enByDate.size} англійських версій)`)

let created = 0
let topicsSet = 0
let updated = 0
let skipped = 0
let failed = 0
for (const [i, p] of uk.entries()) {
  const title = textOf(p.title.rendered)
  const tag = `[${i + 1}/${uk.length}]`
  try {
    const existing = (
      await payload.find({ collection: 'news', where: { legacyUrl: { equals: p.link } }, limit: 1, depth: 0, trash: true, overrideAccess: true })
    ).docs[0]
    // Новини, перенесені раніше без картинок у тексті (лише з обкладинкою), — дописуємо картинки.
    //  • лише якщо на старому сайті картинок більше однієї (єдина картинка стає обкладинкою, у текст не йде);
    //  • лише один раз (позначка в кеші) — щоб наступні запуски не перезаписували правки редакторів
    //    і новини, з яких картинки прибрали навмисно.
    const hasImages = (c: any) => JSON.stringify(c || {}).includes('"type":"upload"')
    const imgCount = (p.content.rendered.match(/<img\s/gi) || []).length
    const needsImages = existing && !cache[`done:${p.link}`] && imgCount > 1 && !hasImages((existing as any).content)
    const topics = topicsOf(p)
    if (existing && ONLY_NEW && !needsImages) {
      // уже перенесена новина: лише дописуємо теми, якщо їх ще немає (текст не чіпаємо)
      if (topics.length && !((existing as any).topics || []).length) {
        await payload.update({ collection: 'news', id: existing.id, data: { topics } as any, overrideAccess: true })
        topicsSet++
      }
      skipped++
      continue
    }

    const prepUk = await prepare(p.content.rendered, title)
    const cover = prepUk.images[0]?.id
    let slug = decodeURIComponent(p.slug)
    const clash = await payload.find({ collection: 'news', where: { slug: { equals: slug } }, limit: 1, depth: 0, trash: true, overrideAccess: true })
    if (clash.docs[0] && clash.docs[0].id !== existing?.id) slug = `${slug}-${p.id}`

    const data: any = {
      title,
      slug,
      publishedAt: new Date(`${p.date_gmt}Z`).toISOString(),
      excerpt: excerptOf(p),
      content: toLexical(prepUk, true),
      legacyUrl: p.link,
      ...(topics.length ? { topics } : {}),
      _status: 'published',
      ...(cover && !(existing as any)?.cover ? { cover } : {}), // наявну обкладинку не чіпаємо
    }
    const doc = existing
      ? await payload.update({ collection: 'news', id: existing.id, locale: 'uk', data, overrideAccess: true })
      : await payload.create({ collection: 'news', locale: 'uk', data, overrideAccess: true })
    existing ? updated++ : created++
    cache[`done:${p.link}`] = 1 // новину перенесено — повторно картинки не дописуємо
    saveCache()

    const en = enByDate.get(p.date)
    if (en) {
      const enTitle = textOf(en.title.rendered)
      const prepEn = await prepare(en.content.rendered, enTitle)
      await payload.update({
        collection: 'news',
        id: doc.id,
        locale: 'en',
        data: { title: enTitle, excerpt: excerptOf(en), content: toLexical(prepEn, prepEn.images[0]?.id === cover), _status: 'published' } as any,
        overrideAccess: true,
      })
    }
    log(`${tag} ✓ ${title.slice(0, 70)}${prepUk.images.length ? ` · картинок: ${prepUk.images.length}` : ''}${en ? ' · EN' : ''}`)
  } catch (e: any) {
    failed++
    payload.logger.error(`${tag} ✖ ${title.slice(0, 60)}: ${e.message?.slice(0, 160)}`)
  }
}

log(`Готово. Нових: ${created}, оновлено: ${updated}, вже були: ${skipped}, з помилками: ${failed}${topicsSet ? `, дописано теми: ${topicsSet}` : ''}`)
log(`Файли: з архіву ${fromDisk}, з інтернету ${fromWeb}`)
process.exit(0)
