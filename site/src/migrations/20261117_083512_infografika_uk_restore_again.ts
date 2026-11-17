import fs from 'fs'
import path from 'path'
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// «Гаряча лінія → Корисна інформація» (/infografika): українська версія знову опинилась з англійським текстом
// (після 20261116_122142_infografika_uk_restore). Повертаємо український оригінал ще раз — і в опубліковану
// версію, і в чернетку. Від повторення тепер захищає hooks/guardUkrainianFromEnglish.ts.
// Нічого не робить, якщо українська версія вже українською — можна запускати повторно.
const FILE = path.resolve(process.cwd(), 'src/migrations/files/infografika-uk.json')

type Doc = { id: number; title?: string | null; content?: unknown }
// англійська, якщо назва як в англійській / «Useful information» або в тексті немає жодної української літери
const english = (d: Doc | undefined, en: Doc | undefined) => {
  if (!d) return false
  const title = String(d.title || '').trim()
  const text = JSON.stringify(d.content || '')
  return !title || title === 'Useful information' || (!!en?.title && title === String(en.title).trim()) || !/[а-яіїєґ]/i.test(text)
}

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const find = async (locale: 'uk' | 'en', draft: boolean) =>
    (
      await payload.find({
        collection: 'pages',
        where: { slug: { equals: 'infografika' } },
        locale,
        fallbackLocale: false,
        draft,
        depth: 0,
        limit: 1,
        overrideAccess: true,
        req,
      })
    ).docs[0] as Doc | undefined
  const published = await find('uk', false)
  const draft = await find('uk', true)
  const en = await find('en', true)
  const page = published || draft
  if (!page) return
  if (!english(published, en) && !english(draft, en)) {
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
