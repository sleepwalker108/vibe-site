import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'
import { buildSearchText } from '../lib/searchText'

// «Текст для пошуку» для новин і сторінок + одразу заповнюємо його для всього, що вже є в базі.
// Міграцію можна безпечно запускати повторно (після збою): вже додані колонки не додаються вдруге.
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу (статистика відвідувань) — чекаємо, поки база звільниться, а не падаємо
  await db.run(sql`PRAGMA busy_timeout = 30000`)

  const addColumn = async (table: string, column: string) => {
    const cols = (await db.all(sql.raw(`PRAGMA table_info(\`${table}\`)`))) as { name: string }[]
    if (!cols.some((c) => c.name === column)) await db.run(sql.raw(`ALTER TABLE \`${table}\` ADD \`${column}\` text;`))
  }
  await addColumn('news_locales', 'search_text')
  await addColumn('_news_v_locales', 'version_search_text')
  await addColumn('pages_locales', 'search_text')
  await addColumn('_pages_v_locales', 'version_search_text')

  const parse = (v: unknown) => {
    if (typeof v !== 'string') return v
    try {
      return JSON.parse(v)
    } catch {
      return null
    }
  }
  let failed = 0
  const fill = async (table: 'news_locales' | 'pages_locales', rows: any[], text: (r: any) => string) => {
    for (const r of rows) {
      try {
        await db.run(sql`UPDATE ${sql.raw(table)} SET search_text = ${text(r)} WHERE id = ${r.id}`)
      } catch (e) {
        failed++
        payload.logger.warn(`Текст для пошуку: ${table} #${r.id} — ${(e as Error).message}`)
      }
    }
  }
  const news = (await db.all(sql`SELECT id, title, excerpt, content FROM news_locales`)) as any[]
  await fill('news_locales', news, (r) => buildSearchText(r.title, r.excerpt, parse(r.content)))
  const pages = (await db.all(sql`SELECT id, title, content FROM pages_locales`)) as any[]
  await fill('pages_locales', pages, (r) => buildSearchText(r.title, parse(r.content)))
  payload.logger.info(`Текст для пошуку: новин ${news.length}, сторінок ${pages.length} (з урахуванням мов)${failed ? `, пропущено ${failed}` : ''}`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`news_locales\` DROP COLUMN \`search_text\`;`)
  await db.run(sql`ALTER TABLE \`_news_v_locales\` DROP COLUMN \`version_search_text\`;`)
  await db.run(sql`ALTER TABLE \`pages_locales\` DROP COLUMN \`search_text\`;`)
  await db.run(sql`ALTER TABLE \`_pages_v_locales\` DROP COLUMN \`version_search_text\`;`)
}
