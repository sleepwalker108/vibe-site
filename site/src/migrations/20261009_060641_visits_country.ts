import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// Статистика: країна відвідувача (код, напр. UA) і індекс за мовою — для звіту окремо по англійській версії.
// Можна безпечно запускати повторно.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const cols = (await db.all(sql`PRAGMA table_info(\`visits\`)`)) as { name: string }[]
  if (!cols.some((c) => c.name === 'country')) await db.run(sql`ALTER TABLE \`visits\` ADD \`country\` text;`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`visits_lang_idx\` ON \`visits\` (\`lang\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX IF EXISTS \`visits_lang_idx\`;`)
  await db.run(sql`ALTER TABLE \`visits\` DROP COLUMN \`country\`;`)
}
