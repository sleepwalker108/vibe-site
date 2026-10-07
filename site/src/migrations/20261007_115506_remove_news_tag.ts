import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// Поле «Мітка» в новинах прибрано — замість нього на картках показується категорія новини.
// Можна безпечно запускати повторно.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const dropColumn = async (table: string, column: string) => {
    const cols = (await db.all(sql.raw(`PRAGMA table_info(\`${table}\`)`))) as { name: string }[]
    if (cols.some((c) => c.name === column)) await db.run(sql.raw(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\`;`))
  }
  await dropColumn('news_locales', 'tag')
  await dropColumn('_news_v_locales', 'version_tag')
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`news_locales\` ADD \`tag\` text;`)
  await db.run(sql`ALTER TABLE \`_news_v_locales\` ADD \`version_tag\` text;`)
}
