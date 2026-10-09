import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// «Річний звіт гарячих ліній»: посилання на Google-таблицю з відповідями форми (див. lib/sheetSync.ts).
// Можна безпечно запускати повторно.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const addColumn = async (table: string, column: string) => {
    const cols = (await db.all(sql.raw(`PRAGMA table_info(\`${table}\`)`))) as { name: string }[]
    if (!cols.some((c) => c.name === column)) await db.run(sql.raw(`ALTER TABLE \`${table}\` ADD \`${column}\` text;`))
  }
  await addColumn('annual_report', 'sheet_url')
  await addColumn('_annual_report_v', 'version_sheet_url')
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`annual_report\` DROP COLUMN \`sheet_url\`;`)
  await db.run(sql`ALTER TABLE \`_annual_report_v\` DROP COLUMN \`version_sheet_url\`;`)
}
