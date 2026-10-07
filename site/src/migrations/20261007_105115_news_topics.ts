import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// Теми новин (фільтр на сайті). Можна безпечно запускати повторно.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`news_topics\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`news\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`news_topics_order_idx\` ON \`news_topics\` (\`order\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`news_topics_parent_idx\` ON \`news_topics\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`_news_v_version_topics\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_news_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`_news_v_version_topics_order_idx\` ON \`_news_v_version_topics\` (\`order\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`_news_v_version_topics_parent_idx\` ON \`_news_v_version_topics\` (\`parent_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`news_topics\`;`)
  await db.run(sql`DROP TABLE \`_news_v_version_topics\`;`)
}
