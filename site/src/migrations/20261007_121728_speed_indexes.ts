import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// Індекси для швидкості.
//  • Таблиці з текстами двома мовами (*_locales) шукаються за _parent_id, але мали лише індекс (мова, запис) —
//    тож для кожного рядка списку база переглядала всю таблицю текстів. На ~850 новинах 30-та сторінка
//    списку новин відкривалася 5,7 с, з індексом — 3 мс.
//  • Список новин сортується за датою публікації (і датою створення) — індекс прибирає сортування «вручну».
// Можна безпечно запускати повторно.
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const tables = ((await db.all(sql`SELECT name FROM sqlite_master WHERE type = 'table'`)) as { name: string }[]).filter((t) => t.name.endsWith('_locales'))
  for (const { name } of tables) {
    await db.run(sql.raw(`CREATE INDEX IF NOT EXISTS \`${name}_parent_id_idx\` ON \`${name}\` (\`_parent_id\`);`))
  }
  // сайт: опубліковані новини від найновіших; адмінка: усі новини за датою
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`news_status_published_idx\` ON \`news\` (\`_status\`, \`published_at\`, \`created_at\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`news_published_idx\` ON \`news\` (\`published_at\`, \`created_at\`);`)
  // оновити статистику, за якою база вибирає індекси
  await db.run(sql`ANALYZE`)
  payload.logger.info(`Індекси для швидкості: таблиць із текстами — ${tables.length}, плюс сортування новин`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  const tables = ((await db.all(sql`SELECT name FROM sqlite_master WHERE type = 'table'`)) as { name: string }[]).filter((t) => t.name.endsWith('_locales'))
  for (const { name } of tables) await db.run(sql.raw(`DROP INDEX IF EXISTS \`${name}_parent_id_idx\`;`))
  await db.run(sql`DROP INDEX IF EXISTS \`news_status_published_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`news_published_idx\`;`)
}
