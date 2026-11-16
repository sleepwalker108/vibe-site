import fs from 'fs'
import path from 'path'
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// «Гаряча лінія → Корисна інформація» (/infografika): українську версію сторінки перезаписали англійським
// текстом (назва «Useful information», увесь текст англійською). Повертаємо український оригінал — той самий
// текст, що був до перезапису (src/migrations/files/infografika-uk.json; англійська версія не змінюється).
// Нічого не робить, якщо українська версія вже не англійська (напр. її виправили вручну) — можна запускати повторно.
const FILE = path.resolve(process.cwd(), 'src/migrations/files/infografika-uk.json')

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'infografika' } },
    locale: 'uk',
    fallbackLocale: false,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  const page = docs[0] as { id: number; title?: string | null; content?: unknown } | undefined
  if (!page) return
  const looksEnglish = !page.title || page.title.trim() === 'Useful information' || JSON.stringify(page.content || '').includes('Useful information from hotlines')
  if (!looksEnglish) {
    payload.logger.info('Корисна інформація: українська версія вже українською — не змінюю')
    return
  }
  const uk = JSON.parse(fs.readFileSync(FILE, 'utf8')) as { title: string; content: unknown }
  await payload.update({
    collection: 'pages',
    id: page.id,
    locale: 'uk',
    data: { title: uk.title, content: uk.content, _status: 'published' } as never,
    overrideAccess: true,
    req,
  })
  payload.logger.info('Корисна інформація: українську версію повернуто')
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // повертати англійський текст в українську версію не потрібно
}
