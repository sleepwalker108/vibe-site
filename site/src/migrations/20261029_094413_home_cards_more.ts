import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// Головна, блок карток: картки можуть мати друге посилання (link2Label / link2Url) —
// напр. «Переглянути перелік» + «Інтерактивна мапа». Лише додає колонки. Можна безпечно запускати повторно.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const colsOf = async (t: string) =>
    ((await db.all(sql.raw(`PRAGMA table_info(\`${t}\`)`))) as { name: string }[]).map((c) => c.name)
  for (const t of ['home_cards_locales', '_home_v_version_cards_locales']) {
    const cols = await colsOf(t)
    for (const c of ['link2_label', 'link2_url']) {
      if (!cols.includes(c)) await db.run(sql.raw(`ALTER TABLE \`${t}\` ADD \`${c}\` text;`))
    }
  }
  // дані (картки ГІС РР і DREAM, мапа в «Актуальному переліку») додає наступна міграція — home_hero_links,
  // коли структура головної вже повна (Payload читає головну з усіма полями).
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // картки ГІС РР і DREAM за потреби прибирає адміністратор у «Головна сторінка» → «Картки гарячих ліній»
  await db.run(sql`ALTER TABLE \`home_cards_locales\` DROP COLUMN \`link2_label\`;`)
  await db.run(sql`ALTER TABLE \`home_cards_locales\` DROP COLUMN \`link2_url\`;`)
  await db.run(sql`ALTER TABLE \`_home_v_version_cards_locales\` DROP COLUMN \`link2_label\`;`)
  await db.run(sql`ALTER TABLE \`_home_v_version_cards_locales\` DROP COLUMN \`link2_url\`;`)
}
