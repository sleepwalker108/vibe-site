// Одноразово: «Корисна інформація» (/infografika) — на старому сайті це вкладені розгортні блоки <details>.
// Перетворюємо: розділи → заголовки, запитання → блок «Запитання — відповіді».
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import { getPayload } from 'payload'
import config from '../payload.config'

const SLUG = process.env.SLUG || 'infografika'
const payload = await getPayload({ config: await config })
const editorConfig = await editorConfigFactory.default({ config: payload.config })

const res = await fetch(`https://dp-reintegration.gov.ua/wp-json/wp/v2/pages?slug=${encodeURIComponent(SLUG)}&_fields=content`)
const html: string = (await res.json())[0].content.rendered
const doc = new JSDOM(`<body>${html}</body>`).window.document
// посилання без адреси (якорі) — просто текст
doc.querySelectorAll('a').forEach((a) => {
  if (!a.getAttribute('href')?.trim()) a.replaceWith(...Array.from(a.childNodes))
})

const toLexical = (h: string) => convertHTMLToLexical({ editorConfig, html: h, JSDOM }) as any
const text = (el: Element | null) => (el?.textContent || '').replace(/\s+/g, ' ').trim()
const heading = (tag: 'h2' | 'h3', t: string) => ({
  type: 'heading', tag, version: 1, direction: 'ltr', format: '', indent: 0,
  children: [{ type: 'text', text: t, version: 1, detail: 0, format: 0, mode: 'normal', style: '' }],
})
const isLeaf = (d: Element) => !d.querySelector(':scope > details')
let blockN = 0
const faqBlock = (items: { question: string; answer: any }[]) => ({
  type: 'block', version: 2, format: '',
  fields: { id: `faq${Date.now().toString(36)}${blockN++}`, blockName: '', blockType: 'faq', items },
})

const out: any[] = []
const walk = (container: Element, depth: number) => {
  let pending: { question: string; answer: any }[] = []
  const flush = () => {
    if (pending.length) out.push(faqBlock(pending))
    pending = []
  }
  for (const el of Array.from(container.children)) {
    if (el.tagName === 'SUMMARY') continue
    if (el.tagName === 'DETAILS') {
      const q = text(el.querySelector(':scope > summary'))
      if (isLeaf(el)) {
        const body = Array.from(el.children).filter((c) => c.tagName !== 'SUMMARY').map((c) => c.outerHTML).join('')
        pending.push({ question: q, answer: toLexical(body || '<p></p>') })
      } else {
        flush()
        out.push(heading(depth === 0 ? 'h2' : 'h3', q))
        walk(el, depth + 1)
      }
      continue
    }
    flush()
    if (text(el)) out.push(...toLexical(el.outerHTML).root.children)
  }
  flush()
}
walk(doc.body, 0)

const content = { root: { type: 'root', version: 1, direction: 'ltr', format: '', indent: 0, children: out } }
const page = (await payload.find({ collection: 'pages', where: { slug: { equals: SLUG } }, limit: 1, depth: 0 })).docs[0]
if (!page) throw new Error(`Сторінку ${SLUG} не знайдено`)
try {
  await payload.update({ collection: 'pages', id: page.id, locale: 'uk', data: { content, _status: 'published' } as any })
} catch (e: any) {
  console.log(JSON.stringify(e.data?.errors, null, 1).slice(0, 3000))
  throw e
}

const blocks = out.filter((n) => n.type === 'block')
payload.logger.info(
  `Готово: ${out.filter((n) => n.type === 'heading').length} заголовків, ${blocks.length} блоків, ${blocks.reduce((a, b) => a + b.fields.items.length, 0)} запитань`,
)
process.exit(0)
