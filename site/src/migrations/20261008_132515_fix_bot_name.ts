import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// У контактах (підвал сайту) був указаний неіснуючий Telegram-бот @1548_MinRe_bot.
// Справжній бот гарячої лінії — @MinRe1548_bot (на нього ж веде кнопка в мобільному меню).
// Виправляємо в поточних контактах і в останній версії (її показує адмінка). Можна запускати повторно.
const WRONG = '@1548_MinRe_bot'
const RIGHT = '@MinRe1548_bot'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const tables = ((await db.all(sql`SELECT name FROM sqlite_master WHERE type = 'table'`)) as { name: string }[])
    .map((t) => t.name)
    .filter((n) => n.startsWith('contacts_') || n.startsWith('_contacts_v_'))
  let fixed = 0
  for (const t of tables) {
    const cols = ((await db.all(sql.raw(`PRAGMA table_info(\`${t}\`)`))) as { name: string; type: string }[]).filter((c) => /text/i.test(c.type))
    for (const c of cols) {
      const before = ((await db.all(sql.raw(`SELECT count(*) AS n FROM \`${t}\` WHERE \`${c.name}\` LIKE '%${WRONG}%'`))) as { n: number }[])[0].n
      if (!before) continue
      await db.run(sql.raw(`UPDATE \`${t}\` SET \`${c.name}\` = replace(\`${c.name}\`, '${WRONG}', '${RIGHT}') WHERE \`${c.name}\` LIKE '%${WRONG}%'`))
      fixed += Number(before)
    }
  }
  payload.logger.info(`Назва Telegram-бота в контактах виправлена (${fixed} рядків): ${RIGHT}`)
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // повертати неіснуючу назву бота немає сенсу
}
