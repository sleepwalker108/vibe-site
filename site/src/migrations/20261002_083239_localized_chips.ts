import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`home_cards_chips_locales\` (
  	\`text\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`home_cards_chips\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`home_cards_chips_locales_locale_parent_id_unique\` ON \`home_cards_chips_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_home_v_version_cards_chips_locales\` (
  	\`text\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_home_v_version_cards_chips\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_home_v_version_cards_chips_locales_locale_parent_id_unique\` ON \`_home_v_version_cards_chips_locales\` (\`_locale\`,\`_parent_id\`);`)
  // Переносимо наявні тексти плашок як українські, щоб нічого не загубилось
  await db.run(sql`INSERT INTO \`home_cards_chips_locales\` (\`text\`, \`_locale\`, \`_parent_id\`) SELECT \`text\`, 'uk', \`id\` FROM \`home_cards_chips\`;`)
  await db.run(sql`INSERT INTO \`_home_v_version_cards_chips_locales\` (\`text\`, \`_locale\`, \`_parent_id\`) SELECT \`text\`, 'uk', \`id\` FROM \`_home_v_version_cards_chips\`;`)
  await db.run(sql`ALTER TABLE \`home_cards_chips\` DROP COLUMN \`text\`;`)
  await db.run(sql`ALTER TABLE \`_home_v_version_cards_chips\` DROP COLUMN \`text\`;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`home_cards_chips_locales\`;`)
  await db.run(sql`DROP TABLE \`_home_v_version_cards_chips_locales\`;`)
  await db.run(sql`ALTER TABLE \`home_cards_chips\` ADD \`text\` text;`)
  await db.run(sql`ALTER TABLE \`_home_v_version_cards_chips\` ADD \`text\` text;`)
}
