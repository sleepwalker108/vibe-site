import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`home_resources\`;`)
  await db.run(sql`DROP TABLE \`home_resources_locales\`;`)
  await db.run(sql`DROP TABLE \`_home_v_version_resources\`;`)
  await db.run(sql`DROP TABLE \`_home_v_version_resources_locales\`;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`home_resources\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`url\` text,
  	\`icon\` text DEFAULT 'globe',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`home\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`home_resources_order_idx\` ON \`home_resources\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`home_resources_parent_id_idx\` ON \`home_resources\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`home_resources_locales\` (
  	\`label\` text,
  	\`description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`home_resources\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`home_resources_locales_locale_parent_id_unique\` ON \`home_resources_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_home_v_version_resources\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`url\` text,
  	\`icon\` text DEFAULT 'globe',
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_home_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_home_v_version_resources_order_idx\` ON \`_home_v_version_resources\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_home_v_version_resources_parent_id_idx\` ON \`_home_v_version_resources\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_home_v_version_resources_locales\` (
  	\`label\` text,
  	\`description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_home_v_version_resources\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_home_v_version_resources_locales_locale_parent_id_unique\` ON \`_home_v_version_resources_locales\` (\`_locale\`,\`_parent_id\`);`)
}
