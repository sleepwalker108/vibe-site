import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// Категорії новин — окремий розділ адмінки замість фіксованого списку тем.
// Наявні теми стають першими категоріями, а вже проставлені новинам теми переносяться.
// Можна безпечно запускати повторно (після збою).
const START = [
  { value: 'evacuation', uk: 'Евакуація', en: 'Evacuation', wp: 'Евакуація, Evacuation' },
  { value: 'idp-support', uk: 'Підтримка ВПО', en: 'Support for IDPs', wp: 'Підтримка ВПО, Support for IDPs' },
  { value: 'shelter', uk: 'Прихисток', en: 'Shelter', wp: 'Прихисток, Shelter' },
  { value: 'recovery', uk: 'Відновлення', en: 'Recovery', wp: 'Відновлення, Recovery' },
  { value: 'weekly', uk: 'Головне за тиждень', en: 'Highlights of the week', wp: 'Головне за тиждень, Highlights of the week' },
]

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const tableExists = async (name: string) =>
    ((await db.all(sql`SELECT name FROM sqlite_master WHERE type='table' AND name=${name}`)) as unknown[]).length > 0

  // 0) запам'ятати вже проставлені теми (стара таблиця зараз буде видалена)
  const oldTopics = (await tableExists('news_topics'))
    ? ((await db.all(sql`SELECT parent_id, value, "order" FROM news_topics ORDER BY parent_id, "order"`)) as { parent_id: number; value: string }[])
    : []

  // 1) структура
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`topics\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` numeric DEFAULT 10,
  	\`slug\` text,
  	\`wp_names\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`topics_slug_idx\` ON \`topics\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`topics_updated_at_idx\` ON \`topics\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`topics_created_at_idx\` ON \`topics\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`topics_locales\` (
  	\`name\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`topics\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`topics_locales_locale_parent_id_unique\` ON \`topics_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`news_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`topics_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`news\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`topics_id\`) REFERENCES \`topics\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`news_rels_order_idx\` ON \`news_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`news_rels_parent_idx\` ON \`news_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`news_rels_path_idx\` ON \`news_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`news_rels_topics_id_idx\` ON \`news_rels\` (\`topics_id\`);`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`_news_v_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`topics_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_news_v\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`topics_id\`) REFERENCES \`topics\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`_news_v_rels_order_idx\` ON \`_news_v_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`_news_v_rels_parent_idx\` ON \`_news_v_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`_news_v_rels_path_idx\` ON \`_news_v_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`_news_v_rels_topics_id_idx\` ON \`_news_v_rels\` (\`topics_id\`);`)
  const lockedCols = (await db.all(sql`PRAGMA table_info(\`payload_locked_documents_rels\`)`)) as { name: string }[]
  if (!lockedCols.some((c) => c.name === 'topics_id')) {
    await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`topics_id\` integer REFERENCES topics(id);`)
  }
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`payload_locked_documents_rels_topics_id_idx\` ON \`payload_locked_documents_rels\` (\`topics_id\`);`)

  // 2) перші категорії — з колишніх тем
  const ids: Record<string, number> = {}
  for (const [i, t] of START.entries()) {
    const found = (await db.all(sql`SELECT id FROM topics WHERE slug = ${t.value}`)) as { id: number }[]
    let id = found[0]?.id
    if (!id) {
      await db.run(sql`INSERT INTO topics (\`order\`, slug, wp_names) VALUES (${(i + 1) * 10}, ${t.value}, ${t.wp})`)
      id = ((await db.all(sql`SELECT id FROM topics WHERE slug = ${t.value}`)) as { id: number }[])[0].id
      await db.run(sql`INSERT INTO topics_locales (name, _locale, _parent_id) VALUES (${t.uk}, 'uk', ${id})`)
      await db.run(sql`INSERT INTO topics_locales (name, _locale, _parent_id) VALUES (${t.en}, 'en', ${id})`)
    }
    ids[t.value] = id
  }

  // 3) перенести теми новин: у саму новину й у її останню версію (її показує адмінка)
  let moved = 0
  const order: Record<number, number> = {}
  for (const r of oldTopics) {
    const topicId = ids[r.value]
    if (!topicId) continue
    const n = (order[r.parent_id] = (order[r.parent_id] || 0) + 1)
    const exists = (await db.all(sql`SELECT id FROM news_rels WHERE parent_id = ${r.parent_id} AND path = 'topics' AND topics_id = ${topicId}`)) as unknown[]
    if (exists.length) continue
    await db.run(sql`INSERT INTO news_rels ("order", parent_id, path, topics_id) VALUES (${n}, ${r.parent_id}, 'topics', ${topicId})`)
    const versions = (await db.all(sql`SELECT id FROM _news_v WHERE parent_id = ${r.parent_id} AND latest = 1`)) as { id: number }[]
    for (const v of versions) {
      await db.run(sql`INSERT INTO _news_v_rels ("order", parent_id, path, topics_id) VALUES (${n}, ${v.id}, 'version.topics', ${topicId})`)
    }
    moved++
  }

  // 4) старі таблиці тем більше не потрібні
  await db.run(sql`DROP TABLE IF EXISTS \`news_topics\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`_news_v_version_topics\`;`)
  payload.logger.info(`Категорії новин: створено ${START.length}, перенесено прив'язок ${moved}`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`news_topics\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`news\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`news_topics_order_idx\` ON \`news_topics\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`news_topics_parent_idx\` ON \`news_topics\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_news_v_version_topics\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_news_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_news_v_version_topics_order_idx\` ON \`_news_v_version_topics\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_version_topics_parent_idx\` ON \`_news_v_version_topics\` (\`parent_id\`);`)
  // повертаємо теми новин у старий вигляд (за адресою категорії)
  await db.run(
    sql`INSERT INTO news_topics ("order", parent_id, value) SELECT r."order", r.parent_id, t.slug FROM news_rels r JOIN topics t ON t.id = r.topics_id WHERE r.path = 'topics'`,
  )
  await db.run(sql`DROP TABLE \`news_rels\`;`)
  await db.run(sql`DROP TABLE \`_news_v_rels\`;`)
  await db.run(sql`DROP TABLE \`topics_locales\`;`)
  await db.run(sql`DROP TABLE \`topics\`;`)
}
