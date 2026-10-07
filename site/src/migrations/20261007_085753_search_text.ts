import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'
import { buildSearchText } from '../lib/searchText'

// «Текст для пошуку» для новин і сторінок + одразу заповнюємо його для всього, що вже є в базі
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`news_locales\` ADD \`search_text\` text;`)
  await db.run(sql`ALTER TABLE \`_news_v_locales\` ADD \`version_search_text\` text;`)
  await db.run(sql`ALTER TABLE \`pages_locales\` ADD \`search_text\` text;`)
  await db.run(sql`ALTER TABLE \`_pages_v_locales\` ADD \`version_search_text\` text;`)

  const parse = (v: unknown) => {
    if (typeof v !== 'string') return v
    try {
      return JSON.parse(v)
    } catch {
      return null
    }
  }
  const news = (await db.all(sql`SELECT id, title, excerpt, content FROM news_locales`)) as any[]
  for (const r of news) {
    await db.run(sql`UPDATE news_locales SET search_text = ${buildSearchText(r.title, r.excerpt, parse(r.content))} WHERE id = ${r.id}`)
  }
  const pages = (await db.all(sql`SELECT id, title, content FROM pages_locales`)) as any[]
  for (const r of pages) {
    await db.run(sql`UPDATE pages_locales SET search_text = ${buildSearchText(r.title, parse(r.content))} WHERE id = ${r.id}`)
  }
  payload.logger.info(`Текст для пошуку: новин ${news.length}, сторінок ${pages.length} (з урахуванням мов)`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`news_locales\` DROP COLUMN \`search_text\`;`)
  await db.run(sql`ALTER TABLE \`_news_v_locales\` DROP COLUMN \`version_search_text\`;`)
  await db.run(sql`ALTER TABLE \`pages_locales\` DROP COLUMN \`search_text\`;`)
  await db.run(sql`ALTER TABLE \`_pages_v_locales\` DROP COLUMN \`version_search_text\`;`)
}
