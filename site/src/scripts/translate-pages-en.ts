// Англійська версія сторінок: копіюємо українську структуру (заголовки, посилання, блоки) і замінюємо
// лише текстові фрагменти за словником src/scripts/data/pages-en.json. Неперекладене — у звіті.
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '../payload.config'

const payload = await getPayload({ config: await config })
const norm = (s: string) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
const dict = new Map(
  Object.entries(JSON.parse(fs.readFileSync(path.resolve('src/scripts/data/pages-en.json'), 'utf8')) as Record<string, string>).map(
    ([k, v]) => [norm(k), v],
  ),
)
const CYR = /[А-Яа-яІіЇїЄєҐґ]/
const missing = new Set<string>()

// перекладає фрагмент, зберігаючи пробіли на його краях (важливо між жирним і звичайним текстом)
const tr = (s: string) => {
  if (!CYR.test(s)) return s
  const en = dict.get(norm(s))
  if (en === undefined) {
    missing.add(norm(s))
    return s
  }
  const lead = /^[\s ]/.test(s) ? ' ' : ''
  const trail = /[\s ]$/.test(s) ? ' ' : ''
  return lead + en + trail
}

const BLOCK_TEXT_FIELDS = new Set(['question', 'title', 'text', 'label', 'note'])
const walk = (n: any): any => {
  if (Array.isArray(n)) return n.map(walk)
  if (!n || typeof n !== 'object') return n
  const out: any = {}
  for (const [k, v] of Object.entries(n)) {
    if (k === 'text' && n.type === 'text' && typeof v === 'string') out[k] = tr(v)
    else if (BLOCK_TEXT_FIELDS.has(k) && typeof v === 'string' && n.type !== 'text') out[k] = tr(v)
    else out[k] = walk(v)
  }
  return out
}

const { docs } = await payload.find({ collection: 'pages', limit: 500, depth: 0, locale: 'uk', fallbackLocale: false })
for (const page of docs) {
  const title = tr(page.title)
  const content = page.content ? walk(page.content) : page.content
  await payload.update({ collection: 'pages', id: page.id, locale: 'en', data: { title, content, _status: 'published' } as any })
  payload.logger.info(`  ✓ ${page.slug} → ${title}`)
}
if (missing.size) payload.logger.warn(`Без перекладу (${missing.size}):\n  ${[...missing].join('\n  ')}`)
payload.logger.info(`Готово: ${docs.length} сторінок`)
process.exit(0)
