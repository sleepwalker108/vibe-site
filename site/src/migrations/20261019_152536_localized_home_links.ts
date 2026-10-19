import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// Головна: посилання кнопок першого екрана й карток — окремі для кожної мови (напр. український і англійський PDF
// переліку територій). Наявні посилання переносяться в обидві мови, тож після оновлення все працює як раніше;
// порожнє посилання в English підміняється українським (fallback). Можна безпечно запускати повторно.

type Move = {
  table: string // таблиця, де посилання лежить зараз (спільне для мов)
  locales: string // таблиця перекладів цієї ж сутності
  columns: string[]
}

const MOVES: Move[] = [
  { table: 'home', locales: 'home_locales', columns: ['hero_primary_url', 'hero_call2_url', 'hero_secondary_url'] },
  { table: 'home_cards', locales: 'home_cards_locales', columns: ['url'] },
  {
    table: '_home_v',
    locales: '_home_v_locales',
    columns: ['version_hero_primary_url', 'version_hero_call2_url', 'version_hero_secondary_url'],
  },
  { table: '_home_v_version_cards', locales: '_home_v_version_cards_locales', columns: ['url'] },
]

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const colsOf = async (t: string) =>
    ((await db.all(sql.raw(`PRAGMA table_info(\`${t}\`)`))) as { name: string }[]).map((c) => c.name)

  for (const { table, locales, columns } of MOVES) {
    const tableCols = await colsOf(table)
    const localeCols = await colsOf(locales)
    for (const col of columns) {
      if (!localeCols.includes(col)) await db.run(sql.raw(`ALTER TABLE \`${locales}\` ADD \`${col}\` text;`))
      if (!tableCols.includes(col)) continue
      // 1) у наявні рядки перекладів (українська, англійська) — те саме посилання, що було
      await db.run(
        sql.raw(
          `UPDATE \`${locales}\` SET \`${col}\` = (SELECT t.\`${col}\` FROM \`${table}\` t WHERE t.id = \`${locales}\`._parent_id)
           WHERE \`${col}\` IS NULL`,
        ),
      )
      // 2) якщо українського рядка перекладу ще немає — створюємо, щоб посилання не загубилось
      await db.run(
        sql.raw(
          `INSERT OR IGNORE INTO \`${locales}\` (_locale, _parent_id, \`${col}\`)
           SELECT 'uk', t.id, t.\`${col}\` FROM \`${table}\` t WHERE t.\`${col}\` IS NOT NULL`,
        ),
      )
    }
  }

  // Старі спільні колонки НЕ видаляємо: nartu-update застосовує міграції ще до перезапуску сайту, і кілька хвилин
  // (поки збирається нова версія) працює попередній код, який читає посилання саме звідти. Нова версія їх не
  // використовує; там лишається копія посилань на момент оновлення.
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // назад: спільне посилання = українське
  const colsOf = async (t: string) =>
    ((await db.all(sql.raw(`PRAGMA table_info(\`${t}\`)`))) as { name: string }[]).map((c) => c.name)
  for (const { table, locales, columns } of MOVES) {
    const tableCols = await colsOf(table)
    for (const col of columns) {
      if (!tableCols.includes(col)) await db.run(sql.raw(`ALTER TABLE \`${table}\` ADD \`${col}\` text;`))
      await db.run(
        sql.raw(
          `UPDATE \`${table}\` SET \`${col}\` = (SELECT l.\`${col}\` FROM \`${locales}\` l WHERE l._parent_id = \`${table}\`.id AND l._locale = 'uk')`,
        ),
      )
      await db.run(sql.raw(`ALTER TABLE \`${locales}\` DROP COLUMN \`${col}\`;`))
    }
  }
}
