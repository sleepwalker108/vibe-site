// Офіційні англійські версії новин зі старого сайту (зіставлені за датою й часом публікації)
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import fs from 'fs'
import { JSDOM } from 'jsdom'
import path from 'path'
import { getPayload } from 'payload'
import config from '../payload.config'

const payload = await getPayload({ config: await config })
const editorConfig = await editorConfigFactory.default({ config: payload.config })
const pairs: { newsId: number; enPostId: number }[] = JSON.parse(fs.readFileSync(path.resolve('src/scripts/data/news-en-pairs.json'), 'utf8'))

const clean = (html: string) => {
  const doc = new JSDOM(`<body>${html}</body>`).window.document
  doc.querySelectorAll('img, figure:empty, script, style').forEach((e) => e.remove())
  doc.querySelectorAll('a').forEach((a) => {
    if (!a.getAttribute('href')?.trim()) a.replaceWith(...Array.from(a.childNodes))
  })
  return doc.body.innerHTML
}
const text = (html: string) => new JSDOM(`<body>${html}</body>`).window.document.body.textContent?.replace(/\s+/g, ' ').trim() || ''
const toLexical = (html: string) => convertHTMLToLexical({ editorConfig, html, JSDOM }) as any

const ids = pairs.map((p) => p.enPostId).join(',')
const res = await fetch(`https://dp-reintegration.gov.ua/wp-json/wp/v2/posts?include=${ids}&per_page=100&_fields=id,title,excerpt,content`)
const posts: any[] = await res.json()
const byId = new Map(posts.map((p) => [p.id, p]))

let ok = 0
for (const { newsId, enPostId } of pairs) {
  const p = byId.get(enPostId)
  if (!p) continue
  const title = text(p.title.rendered)
  const excerpt = text(p.excerpt.rendered).replace(/Continue reading.*$/i, '').slice(0, 300)
  const html = clean(p.content.rendered)
  let content
  for (const variant of [html, `<p>${text(html)}</p>`]) {
    try {
      content = toLexical(variant)
      await payload.update({ collection: 'news', id: newsId, locale: 'en', data: { title, excerpt, content, _status: 'published' } as any })
      ok++
      payload.logger.info(`  ✓ #${newsId} ${title.slice(0, 70)}`)
      break
    } catch (e: any) {
      payload.logger.warn(`  … #${newsId}: ${e.message?.slice(0, 80)} — пробую спрощений варіант`)
    }
  }
}
payload.logger.info(`Готово: ${ok} з ${pairs.length}`)
process.exit(0)
