import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`home_evacuation_steps\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`home\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`home_evacuation_steps_order_idx\` ON \`home_evacuation_steps\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`home_evacuation_steps_parent_id_idx\` ON \`home_evacuation_steps\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`home_evacuation_steps_locales\` (
  	\`title\` text,
  	\`text\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`home_evacuation_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`home_evacuation_steps_locales_locale_parent_id_unique\` ON \`home_evacuation_steps_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_home_v_version_evacuation_steps\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_home_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_home_v_version_evacuation_steps_order_idx\` ON \`_home_v_version_evacuation_steps\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_home_v_version_evacuation_steps_parent_id_idx\` ON \`_home_v_version_evacuation_steps\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_home_v_version_evacuation_steps_locales\` (
  	\`title\` text,
  	\`text\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_home_v_version_evacuation_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_home_v_version_evacuation_steps_locales_locale_parent_id_un\` ON \`_home_v_version_evacuation_steps_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`ALTER TABLE \`home_cards\` ADD \`icon\` text;`)
  await db.run(sql`ALTER TABLE \`home\` ADD \`evacuation_show\` integer DEFAULT true;`)
  await db.run(sql`ALTER TABLE \`home_locales\` ADD \`evacuation_highlight\` text;`)
  await db.run(sql`ALTER TABLE \`home_locales\` ADD \`evacuation_title\` text;`)
  await db.run(sql`ALTER TABLE \`home_locales\` ADD \`evacuation_footer\` text;`)
  await db.run(sql`ALTER TABLE \`home_locales\` ADD \`evacuation_footer_highlight\` text;`)
  await db.run(sql`ALTER TABLE \`_home_v_version_cards\` ADD \`icon\` text;`)
  await db.run(sql`ALTER TABLE \`_home_v\` ADD \`version_evacuation_show\` integer DEFAULT true;`)
  await db.run(sql`ALTER TABLE \`_home_v_locales\` ADD \`version_evacuation_highlight\` text;`)
  await db.run(sql`ALTER TABLE \`_home_v_locales\` ADD \`version_evacuation_title\` text;`)
  await db.run(sql`ALTER TABLE \`_home_v_locales\` ADD \`version_evacuation_footer\` text;`)
  await db.run(sql`ALTER TABLE \`_home_v_locales\` ADD \`version_evacuation_footer_highlight\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`home_evacuation_steps\`;`)
  await db.run(sql`DROP TABLE \`home_evacuation_steps_locales\`;`)
  await db.run(sql`DROP TABLE \`_home_v_version_evacuation_steps\`;`)
  await db.run(sql`DROP TABLE \`_home_v_version_evacuation_steps_locales\`;`)
  await db.run(sql`ALTER TABLE \`home_cards\` DROP COLUMN \`icon\`;`)
  await db.run(sql`ALTER TABLE \`home\` DROP COLUMN \`evacuation_show\`;`)
  await db.run(sql`ALTER TABLE \`home_locales\` DROP COLUMN \`evacuation_highlight\`;`)
  await db.run(sql`ALTER TABLE \`home_locales\` DROP COLUMN \`evacuation_title\`;`)
  await db.run(sql`ALTER TABLE \`home_locales\` DROP COLUMN \`evacuation_footer\`;`)
  await db.run(sql`ALTER TABLE \`home_locales\` DROP COLUMN \`evacuation_footer_highlight\`;`)
  await db.run(sql`ALTER TABLE \`_home_v_version_cards\` DROP COLUMN \`icon\`;`)
  await db.run(sql`ALTER TABLE \`_home_v\` DROP COLUMN \`version_evacuation_show\`;`)
  await db.run(sql`ALTER TABLE \`_home_v_locales\` DROP COLUMN \`version_evacuation_highlight\`;`)
  await db.run(sql`ALTER TABLE \`_home_v_locales\` DROP COLUMN \`version_evacuation_title\`;`)
  await db.run(sql`ALTER TABLE \`_home_v_locales\` DROP COLUMN \`version_evacuation_footer\`;`)
  await db.run(sql`ALTER TABLE \`_home_v_locales\` DROP COLUMN \`version_evacuation_footer_highlight\`;`)
}
