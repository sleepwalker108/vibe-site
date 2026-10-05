import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`contacts_socials\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`network\` text DEFAULT 'telegram',
  	\`url\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`contacts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`contacts_socials_order_idx\` ON \`contacts_socials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`contacts_socials_parent_id_idx\` ON \`contacts_socials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`contacts_socials_locales\` (
  	\`label\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`contacts_socials\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`contacts_socials_locales_locale_parent_id_unique\` ON \`contacts_socials_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_contacts_v_version_socials\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`network\` text DEFAULT 'telegram',
  	\`url\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_contacts_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_contacts_v_version_socials_order_idx\` ON \`_contacts_v_version_socials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_contacts_v_version_socials_parent_id_idx\` ON \`_contacts_v_version_socials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_contacts_v_version_socials_locales\` (
  	\`label\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_contacts_v_version_socials\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_contacts_v_version_socials_locales_locale_parent_id_unique\` ON \`_contacts_v_version_socials_locales\` (\`_locale\`,\`_parent_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`contacts_socials\`;`)
  await db.run(sql`DROP TABLE \`contacts_socials_locales\`;`)
  await db.run(sql`DROP TABLE \`_contacts_v_version_socials\`;`)
  await db.run(sql`DROP TABLE \`_contacts_v_version_socials_locales\`;`)
}
