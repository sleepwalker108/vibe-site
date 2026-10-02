import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`news\` ADD \`has_english\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`_news_v\` ADD \`version_has_english\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`pages\` ADD \`has_english\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`_pages_v\` ADD \`version_has_english\` integer DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`news\` DROP COLUMN \`has_english\`;`)
  await db.run(sql`ALTER TABLE \`_news_v\` DROP COLUMN \`version_has_english\`;`)
  await db.run(sql`ALTER TABLE \`pages\` DROP COLUMN \`has_english\`;`)
  await db.run(sql`ALTER TABLE \`_pages_v\` DROP COLUMN \`version_has_english\`;`)
}
