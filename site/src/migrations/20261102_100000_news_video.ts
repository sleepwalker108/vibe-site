import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// Новини: поле «Відео» (файл з медіатеки) — показується на початку новини замість обкладинки.
// Лише додає колонки й індекси. Можна безпечно запускати повторно.

const TABLES = [
  { table: 'news', column: 'video_id', index: 'news_video_idx' },
  { table: '_news_v', column: 'version_video_id', index: '_news_v_version_version_video_idx' },
]

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const colsOf = async (t: string) =>
    ((await db.all(sql.raw(`PRAGMA table_info(\`${t}\`)`))) as { name: string }[]).map((c) => c.name)
  for (const { table, column, index } of TABLES) {
    if (!(await colsOf(table)).includes(column)) {
      await db.run(sql.raw(`ALTER TABLE \`${table}\` ADD \`${column}\` integer REFERENCES media(id) ON DELETE set null;`))
    }
    await db.run(sql.raw(`CREATE INDEX IF NOT EXISTS \`${index}\` ON \`${table}\` (\`${column}\`);`))
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // SQLite не дає видалити колонку з зовнішнім ключем без перебудови таблиці новин —
  // лише прибираємо індекси й очищаємо значення (колонка лишається порожньою й нічому не заважає)
  for (const { table, column, index } of TABLES) {
    await db.run(sql.raw(`DROP INDEX IF EXISTS \`${index}\`;`))
    await db.run(sql.raw(`UPDATE \`${table}\` SET \`${column}\` = NULL;`))
  }
}
