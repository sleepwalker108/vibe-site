import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// Медіатека: кошик — видалені файли можна відновити. Можна безпечно запускати повторно.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const cols = (await db.all(sql`PRAGMA table_info(\`media\`)`)) as { name: string }[]
  if (!cols.some((c) => c.name === 'deleted_at')) await db.run(sql`ALTER TABLE \`media\` ADD \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`media_deleted_at_idx\` ON \`media\` (\`deleted_at\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX IF EXISTS \`media_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`deleted_at\`;`)
}
