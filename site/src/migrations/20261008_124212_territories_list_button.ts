import path from 'path'
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// Кнопка «Перелік територій бойових дій» на першому екрані веде на документ (наказ №1389 від 16.07.2026)
// у медіатеці нашого сайту, а не на сторонній сайт. Якщо документа ще немає в медіатеці — додаємо його
// з файлу, що йде разом із кодом (src/migrations/files). Можна безпечно запускати повторно.
const FILE = path.resolve(process.cwd(), 'src/migrations/files/perelik-1389.pdf')
const ALT = 'Перелік територій, на яких ведуться (велися) бойові дії або тимчасово окупованих російською федерацією'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)

  // 1) документ у медіатеці (уже перенесений зі старого сайту — або додаємо)
  const found = await payload.find({
    collection: 'media',
    where: { and: [{ filename: { like: '1389' } }, { mimeType: { equals: 'application/pdf' } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  let url = (found.docs[0] as { url?: string } | undefined)?.url
  if (!url) {
    const doc = (await payload.create({ collection: 'media', data: { alt: ALT }, filePath: FILE, overrideAccess: true, req })) as { url: string }
    url = doc.url
  }

  // 2) кнопка на першому екрані — і в поточній версії головної, і в останній версії (її показує адмінка)
  await db.run(sql`UPDATE home SET hero_secondary_url = ${url}`)
  await db.run(sql`UPDATE _home_v SET version_hero_secondary_url = ${url} WHERE latest = 1`)
  payload.logger.info(`Кнопка «Перелік територій бойових дій» → ${url}`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`UPDATE home SET hero_secondary_url = 'https://www.minre.gov.ua/'`)
  await db.run(sql`UPDATE _home_v SET version_hero_secondary_url = 'https://www.minre.gov.ua/' WHERE latest = 1`)
}
