import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`resources_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`url\` text,
  	\`icon\` text DEFAULT 'globe',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`resources\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`resources_items_order_idx\` ON \`resources_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`resources_items_parent_id_idx\` ON \`resources_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`resources_items_locales\` (
  	\`label\` text,
  	\`description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`resources_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`resources_items_locales_locale_parent_id_unique\` ON \`resources_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`resources\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`show\` integer DEFAULT true,
  	\`_status\` text DEFAULT 'draft',
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`resources__status_idx\` ON \`resources\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`resources_locales\` (
  	\`title\` text,
  	\`subtitle\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`resources\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`resources_locales_locale_parent_id_unique\` ON \`resources_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_resources_v_version_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`url\` text,
  	\`icon\` text DEFAULT 'globe',
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_resources_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_resources_v_version_items_order_idx\` ON \`_resources_v_version_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_resources_v_version_items_parent_id_idx\` ON \`_resources_v_version_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_resources_v_version_items_locales\` (
  	\`label\` text,
  	\`description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_resources_v_version_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_resources_v_version_items_locales_locale_parent_id_unique\` ON \`_resources_v_version_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_resources_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`version_show\` integer DEFAULT true,
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
  await db.run(sql`CREATE INDEX \`_resources_v_version_version__status_idx\` ON \`_resources_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_resources_v_created_at_idx\` ON \`_resources_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_resources_v_updated_at_idx\` ON \`_resources_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_resources_v_snapshot_idx\` ON \`_resources_v\` (\`snapshot\`);`)
  await db.run(sql`CREATE INDEX \`_resources_v_published_locale_idx\` ON \`_resources_v\` (\`published_locale\`);`)
  await db.run(sql`CREATE INDEX \`_resources_v_latest_idx\` ON \`_resources_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_resources_v_autosave_idx\` ON \`_resources_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`_resources_v_locales\` (
  	\`version_title\` text,
  	\`version_subtitle\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_resources_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_resources_v_locales_locale_parent_id_unique\` ON \`_resources_v_locales\` (\`_locale\`,\`_parent_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`resources_items\`;`)
  await db.run(sql`DROP TABLE \`resources_items_locales\`;`)
  await db.run(sql`DROP TABLE \`resources\`;`)
  await db.run(sql`DROP TABLE \`resources_locales\`;`)
  await db.run(sql`DROP TABLE \`_resources_v_version_items\`;`)
  await db.run(sql`DROP TABLE \`_resources_v_version_items_locales\`;`)
  await db.run(sql`DROP TABLE \`_resources_v\`;`)
  await db.run(sql`DROP TABLE \`_resources_v_locales\`;`)
}
