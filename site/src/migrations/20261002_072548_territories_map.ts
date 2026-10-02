import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`territories_regions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`region\` text,
  	\`possible\` numeric DEFAULT 0,
  	\`eres\` numeric DEFAULT 0,
  	\`active\` numeric DEFAULT 0,
  	\`occupied\` numeric DEFAULT 0,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`territories\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`territories_regions_order_idx\` ON \`territories_regions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`territories_regions_parent_id_idx\` ON \`territories_regions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`territories\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`show\` integer DEFAULT true,
  	\`communities_possible\` numeric DEFAULT 0,
  	\`communities_eres\` numeric DEFAULT 0,
  	\`communities_active\` numeric DEFAULT 0,
  	\`communities_occupied\` numeric DEFAULT 0,
  	\`_status\` text DEFAULT 'draft',
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`territories__status_idx\` ON \`territories\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`territories_locales\` (
  	\`title\` text,
  	\`subtitle\` text,
  	\`source\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`territories\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`territories_locales_locale_parent_id_unique\` ON \`territories_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_territories_v_version_regions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`region\` text,
  	\`possible\` numeric DEFAULT 0,
  	\`eres\` numeric DEFAULT 0,
  	\`active\` numeric DEFAULT 0,
  	\`occupied\` numeric DEFAULT 0,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_territories_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_territories_v_version_regions_order_idx\` ON \`_territories_v_version_regions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_territories_v_version_regions_parent_id_idx\` ON \`_territories_v_version_regions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_territories_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`version_show\` integer DEFAULT true,
  	\`version_communities_possible\` numeric DEFAULT 0,
  	\`version_communities_eres\` numeric DEFAULT 0,
  	\`version_communities_active\` numeric DEFAULT 0,
  	\`version_communities_occupied\` numeric DEFAULT 0,
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
  await db.run(sql`CREATE INDEX \`_territories_v_version_version__status_idx\` ON \`_territories_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_territories_v_created_at_idx\` ON \`_territories_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_territories_v_updated_at_idx\` ON \`_territories_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_territories_v_snapshot_idx\` ON \`_territories_v\` (\`snapshot\`);`)
  await db.run(sql`CREATE INDEX \`_territories_v_published_locale_idx\` ON \`_territories_v\` (\`published_locale\`);`)
  await db.run(sql`CREATE INDEX \`_territories_v_latest_idx\` ON \`_territories_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_territories_v_autosave_idx\` ON \`_territories_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`_territories_v_locales\` (
  	\`version_title\` text,
  	\`version_subtitle\` text,
  	\`version_source\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_territories_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_territories_v_locales_locale_parent_id_unique\` ON \`_territories_v_locales\` (\`_locale\`,\`_parent_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`territories_regions\`;`)
  await db.run(sql`DROP TABLE \`territories\`;`)
  await db.run(sql`DROP TABLE \`territories_locales\`;`)
  await db.run(sql`DROP TABLE \`_territories_v_version_regions\`;`)
  await db.run(sql`DROP TABLE \`_territories_v\`;`)
  await db.run(sql`DROP TABLE \`_territories_v_locales\`;`)
}
