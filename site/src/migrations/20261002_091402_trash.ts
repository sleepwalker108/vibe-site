import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`news\` ADD \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`news_deleted_at_idx\` ON \`news\` (\`deleted_at\`);`)
  await db.run(sql`ALTER TABLE \`_news_v\` ADD \`version_deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`_news_v_version_version_deleted_at_idx\` ON \`_news_v\` (\`version_deleted_at\`);`)
  await db.run(sql`ALTER TABLE \`pages\` ADD \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`pages_deleted_at_idx\` ON \`pages\` (\`deleted_at\`);`)
  await db.run(sql`ALTER TABLE \`_pages_v\` ADD \`version_deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_deleted_at_idx\` ON \`_pages_v\` (\`version_deleted_at\`);`)
  await db.run(sql`ALTER TABLE \`videos\` ADD \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`videos_deleted_at_idx\` ON \`videos\` (\`deleted_at\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`news_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`news\` DROP COLUMN \`deleted_at\`;`)
  await db.run(sql`DROP INDEX \`_news_v_version_version_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`_news_v\` DROP COLUMN \`version_deleted_at\`;`)
  await db.run(sql`DROP INDEX \`pages_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`pages\` DROP COLUMN \`deleted_at\`;`)
  await db.run(sql`DROP INDEX \`_pages_v_version_version_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`_pages_v\` DROP COLUMN \`version_deleted_at\`;`)
  await db.run(sql`DROP INDEX \`videos_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`videos\` DROP COLUMN \`deleted_at\`;`)
}
