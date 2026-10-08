import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// Картка «Актуальний перелік — Території, на яких ведуться (велися) бойові дії…» на головній
// веде на PDF наказу №1389 у медіатеці нашого сайту (раніше — на сайт Мінрозвитку).
// Документ додає попередня міграція (кнопка першого екрана). Можна безпечно запускати повторно.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const found = await payload.find({
    collection: 'media',
    where: { and: [{ filename: { like: '1389' } }, { mimeType: { equals: 'application/pdf' } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const url = (found.docs[0] as { url?: string } | undefined)?.url
  if (!url) {
    payload.logger.warn('Картка «Актуальний перелік»: документа №1389 немає в медіатеці — посилання не змінено')
    return
  }
  // картка з іконкою документа, що вела на сайт Мінрозвитку (у поточній версії головної й в останній версії)
  await db.run(sql`UPDATE home_cards SET url = ${url} WHERE icon = 'document' AND url LIKE '%minre.gov.ua%'`)
  await db.run(
    sql`UPDATE _home_v_version_cards SET url = ${url} WHERE icon = 'document' AND url LIKE '%minre.gov.ua%' AND _parent_id IN (SELECT id FROM _home_v WHERE latest = 1)`,
  )
  payload.logger.info(`Картка «Актуальний перелік» → ${url}`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`UPDATE home_cards SET url = 'https://www.minre.gov.ua/' WHERE icon = 'document' AND url LIKE '%1389%'`)
}
