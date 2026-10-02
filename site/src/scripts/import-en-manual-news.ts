// Переклади новин, яких не було англійською на старому сайті (src/scripts/data/news-en-manual.json)
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '../payload.config'
import { toLexicalBlocks, type SimpleBlock } from './lib/lexical'

const payload = await getPayload({ config: await config })
const data: Record<string, { title: string; excerpt: string; blocks: SimpleBlock[] }> = JSON.parse(
  fs.readFileSync(path.resolve('src/scripts/data/news-en-manual.json'), 'utf8'),
)
for (const [id, d] of Object.entries(data)) {
  await payload.update({
    collection: 'news',
    id: Number(id),
    locale: 'en',
    data: { title: d.title, excerpt: d.excerpt, content: toLexicalBlocks(d.blocks), _status: 'published' } as any,
  })
  payload.logger.info(`  ✓ #${id} ${d.title.slice(0, 70)}`)
}
// мітка першої новини
const tagged = await payload.find({ collection: 'news', where: { tag: { exists: true } }, locale: 'uk', limit: 100, depth: 0 })
for (const n of tagged.docs) {
  if (n.tag === 'Житло для ВПО') await payload.update({ collection: 'news', id: n.id, locale: 'en', data: { tag: 'Housing for IDPs', _status: 'published' } as any })
}
payload.logger.info('Готово')
process.exit(0)
