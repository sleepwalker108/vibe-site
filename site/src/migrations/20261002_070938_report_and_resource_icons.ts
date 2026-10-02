import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`annual_report_channels\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` numeric,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`annual_report\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`annual_report_channels_order_idx\` ON \`annual_report_channels\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`annual_report_channels_parent_id_idx\` ON \`annual_report_channels\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`annual_report_channels_locales\` (
  	\`name\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`annual_report_channels\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`annual_report_channels_locales_locale_parent_id_unique\` ON \`annual_report_channels_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`annual_report_top_questions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` numeric,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`annual_report\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`annual_report_top_questions_order_idx\` ON \`annual_report_top_questions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`annual_report_top_questions_parent_id_idx\` ON \`annual_report_top_questions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`annual_report_top_questions_locales\` (
  	\`name\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`annual_report_top_questions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`annual_report_top_questions_locales_locale_parent_id_unique\` ON \`annual_report_top_questions_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`annual_report_outgoing\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` numeric,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`annual_report\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`annual_report_outgoing_order_idx\` ON \`annual_report_outgoing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`annual_report_outgoing_parent_id_idx\` ON \`annual_report_outgoing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`annual_report_outgoing_locales\` (
  	\`name\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`annual_report_outgoing\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`annual_report_outgoing_locales_locale_parent_id_unique\` ON \`annual_report_outgoing_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`annual_report\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`show\` integer DEFAULT true,
  	\`period_from\` text,
  	\`period_to\` text,
  	\`line1648\` numeric,
  	\`sms\` numeric,
  	\`_status\` text DEFAULT 'draft',
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`annual_report__status_idx\` ON \`annual_report\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`annual_report_locales\` (
  	\`title\` text,
  	\`subtitle\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`annual_report\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`annual_report_locales_locale_parent_id_unique\` ON \`annual_report_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_annual_report_v_version_channels\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`value\` numeric,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_annual_report_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_annual_report_v_version_channels_order_idx\` ON \`_annual_report_v_version_channels\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_annual_report_v_version_channels_parent_id_idx\` ON \`_annual_report_v_version_channels\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_annual_report_v_version_channels_locales\` (
  	\`name\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_annual_report_v_version_channels\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_annual_report_v_version_channels_locales_locale_parent_id_u\` ON \`_annual_report_v_version_channels_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_annual_report_v_version_top_questions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`value\` numeric,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_annual_report_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_annual_report_v_version_top_questions_order_idx\` ON \`_annual_report_v_version_top_questions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_annual_report_v_version_top_questions_parent_id_idx\` ON \`_annual_report_v_version_top_questions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_annual_report_v_version_top_questions_locales\` (
  	\`name\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_annual_report_v_version_top_questions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_annual_report_v_version_top_questions_locales_locale_parent\` ON \`_annual_report_v_version_top_questions_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_annual_report_v_version_outgoing\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`value\` numeric,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_annual_report_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_annual_report_v_version_outgoing_order_idx\` ON \`_annual_report_v_version_outgoing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_annual_report_v_version_outgoing_parent_id_idx\` ON \`_annual_report_v_version_outgoing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_annual_report_v_version_outgoing_locales\` (
  	\`name\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_annual_report_v_version_outgoing\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_annual_report_v_version_outgoing_locales_locale_parent_id_u\` ON \`_annual_report_v_version_outgoing_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_annual_report_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`version_show\` integer DEFAULT true,
  	\`version_period_from\` text,
  	\`version_period_to\` text,
  	\`version_line1648\` numeric,
  	\`version_sms\` numeric,
  	\`version__status\` text DEFAULT 'draft',
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`snapshot\` integer,
  	\`published_locale\` text,
  	\`latest\` integer,
  	\`autosave\` integer
  );
  `)
  await db.run(sql`CREATE INDEX \`_annual_report_v_version_version__status_idx\` ON \`_annual_report_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_annual_report_v_created_at_idx\` ON \`_annual_report_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_annual_report_v_updated_at_idx\` ON \`_annual_report_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_annual_report_v_snapshot_idx\` ON \`_annual_report_v\` (\`snapshot\`);`)
  await db.run(sql`CREATE INDEX \`_annual_report_v_published_locale_idx\` ON \`_annual_report_v\` (\`published_locale\`);`)
  await db.run(sql`CREATE INDEX \`_annual_report_v_latest_idx\` ON \`_annual_report_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_annual_report_v_autosave_idx\` ON \`_annual_report_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`_annual_report_v_locales\` (
  	\`version_title\` text,
  	\`version_subtitle\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_annual_report_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_annual_report_v_locales_locale_parent_id_unique\` ON \`_annual_report_v_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`ALTER TABLE \`home_resources\` ADD \`icon\` text DEFAULT 'globe';`)
  await db.run(sql`ALTER TABLE \`home_resources_locales\` ADD \`description\` text;`)
  await db.run(sql`ALTER TABLE \`_home_v_version_resources\` ADD \`icon\` text DEFAULT 'globe';`)
  await db.run(sql`ALTER TABLE \`_home_v_version_resources_locales\` ADD \`description\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`annual_report_channels\`;`)
  await db.run(sql`DROP TABLE \`annual_report_channels_locales\`;`)
  await db.run(sql`DROP TABLE \`annual_report_top_questions\`;`)
  await db.run(sql`DROP TABLE \`annual_report_top_questions_locales\`;`)
  await db.run(sql`DROP TABLE \`annual_report_outgoing\`;`)
  await db.run(sql`DROP TABLE \`annual_report_outgoing_locales\`;`)
  await db.run(sql`DROP TABLE \`annual_report\`;`)
  await db.run(sql`DROP TABLE \`annual_report_locales\`;`)
  await db.run(sql`DROP TABLE \`_annual_report_v_version_channels\`;`)
  await db.run(sql`DROP TABLE \`_annual_report_v_version_channels_locales\`;`)
  await db.run(sql`DROP TABLE \`_annual_report_v_version_top_questions\`;`)
  await db.run(sql`DROP TABLE \`_annual_report_v_version_top_questions_locales\`;`)
  await db.run(sql`DROP TABLE \`_annual_report_v_version_outgoing\`;`)
  await db.run(sql`DROP TABLE \`_annual_report_v_version_outgoing_locales\`;`)
  await db.run(sql`DROP TABLE \`_annual_report_v\`;`)
  await db.run(sql`DROP TABLE \`_annual_report_v_locales\`;`)
  await db.run(sql`ALTER TABLE \`home_resources\` DROP COLUMN \`icon\`;`)
  await db.run(sql`ALTER TABLE \`home_resources_locales\` DROP COLUMN \`description\`;`)
  await db.run(sql`ALTER TABLE \`_home_v_version_resources\` DROP COLUMN \`icon\`;`)
  await db.run(sql`ALTER TABLE \`_home_v_version_resources_locales\` DROP COLUMN \`description\`;`)
}
