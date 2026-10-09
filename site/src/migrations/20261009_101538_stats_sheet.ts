import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// «Статистика гарячих ліній»: посилання на Google-таблицю з відповідями форми (див. lib/sheetSync.ts).
// Можна безпечно запускати повторно.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const addColumn = async (table: string, column: string) => {
    const cols = (await db.all(sql.raw(`PRAGMA table_info(\`${table}\`)`))) as { name: string }[]
    if (!cols.some((c) => c.name === column)) await db.run(sql.raw(`ALTER TABLE \`${table}\` ADD \`${column}\` text;`))
  }
  await addColumn('stats', 'sheet_url')
  await addColumn('_stats_v', 'version_sheet_url')
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`stats\` DROP COLUMN \`sheet_url\`;`)
  await db.run(sql`ALTER TABLE \`_stats_v\` DROP COLUMN \`version_sheet_url\`;`)
}
