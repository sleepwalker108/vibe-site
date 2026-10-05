import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`seo\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`share_image_id\` integer,
  	\`google_verification\` text,
  	\`bing_verification\` text,
  	\`allow_indexing\` integer DEFAULT true,
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`share_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`seo_share_image_idx\` ON \`seo\` (\`share_image_id\`);`)
  await db.run(sql`CREATE TABLE \`seo_locales\` (
  	\`site_title\` text,
  	\`title_suffix\` text,
  	\`description\` text,
  	\`keywords\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`seo\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`seo_locales_locale_parent_id_unique\` ON \`seo_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`ALTER TABLE \`news\` ADD \`meta_image_id\` integer REFERENCES media(id);`)
  await db.run(sql`ALTER TABLE \`news\` ADD \`meta_noindex\` integer DEFAULT false;`)
  await db.run(sql`CREATE INDEX \`news_meta_meta_image_idx\` ON \`news\` (\`meta_image_id\`);`)
  await db.run(sql`ALTER TABLE \`news_locales\` ADD \`meta_title\` text;`)
  await db.run(sql`ALTER TABLE \`news_locales\` ADD \`meta_description\` text;`)
  await db.run(sql`ALTER TABLE \`_news_v\` ADD \`version_meta_image_id\` integer REFERENCES media(id);`)
  await db.run(sql`ALTER TABLE \`_news_v\` ADD \`version_meta_noindex\` integer DEFAULT false;`)
  await db.run(sql`CREATE INDEX \`_news_v_version_meta_version_meta_image_idx\` ON \`_news_v\` (\`version_meta_image_id\`);`)
  await db.run(sql`ALTER TABLE \`_news_v_locales\` ADD \`version_meta_title\` text;`)
  await db.run(sql`ALTER TABLE \`_news_v_locales\` ADD \`version_meta_description\` text;`)
  await db.run(sql`ALTER TABLE \`pages\` ADD \`meta_image_id\` integer REFERENCES media(id);`)
  await db.run(sql`ALTER TABLE \`pages\` ADD \`meta_noindex\` integer DEFAULT false;`)
  await db.run(sql`CREATE INDEX \`pages_meta_meta_image_idx\` ON \`pages\` (\`meta_image_id\`);`)
  await db.run(sql`ALTER TABLE \`pages_locales\` ADD \`meta_title\` text;`)
  await db.run(sql`ALTER TABLE \`pages_locales\` ADD \`meta_description\` text;`)
  await db.run(sql`ALTER TABLE \`_pages_v\` ADD \`version_meta_image_id\` integer REFERENCES media(id);`)
  await db.run(sql`ALTER TABLE \`_pages_v\` ADD \`version_meta_noindex\` integer DEFAULT false;`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_meta_version_meta_image_idx\` ON \`_pages_v\` (\`version_meta_image_id\`);`)
  await db.run(sql`ALTER TABLE \`_pages_v_locales\` ADD \`version_meta_title\` text;`)
  await db.run(sql`ALTER TABLE \`_pages_v_locales\` ADD \`version_meta_description\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`seo\`;`)
  await db.run(sql`DROP TABLE \`seo_locales\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_news\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`has_english\` integer DEFAULT false,
  	\`published_at\` text,
  	\`cover_id\` integer,
  	\`slug\` text,
  	\`legacy_url\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`deleted_at\` text,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_news\`("id", "has_english", "published_at", "cover_id", "slug", "legacy_url", "updated_at", "created_at", "deleted_at", "_status") SELECT "id", "has_english", "published_at", "cover_id", "slug", "legacy_url", "updated_at", "created_at", "deleted_at", "_status" FROM \`news\`;`)
  await db.run(sql`DROP TABLE \`news\`;`)
  await db.run(sql`ALTER TABLE \`__new_news\` RENAME TO \`news\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`news_cover_idx\` ON \`news\` (\`cover_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`news_slug_idx\` ON \`news\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`news_updated_at_idx\` ON \`news\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`news_created_at_idx\` ON \`news\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`news_deleted_at_idx\` ON \`news\` (\`deleted_at\`);`)
  await db.run(sql`CREATE INDEX \`news__status_idx\` ON \`news\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`__new__news_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_has_english\` integer DEFAULT false,
  	\`version_published_at\` text,
  	\`version_cover_id\` integer,
  	\`version_slug\` text,
  	\`version_legacy_url\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version_deleted_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`snapshot\` integer,
  	\`published_locale\` text,
  	\`latest\` integer,
  	\`autosave\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`news\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new__news_v\`("id", "parent_id", "version_has_english", "version_published_at", "version_cover_id", "version_slug", "version_legacy_url", "version_updated_at", "version_created_at", "version_deleted_at", "version__status", "created_at", "updated_at", "snapshot", "published_locale", "latest", "autosave") SELECT "id", "parent_id", "version_has_english", "version_published_at", "version_cover_id", "version_slug", "version_legacy_url", "version_updated_at", "version_created_at", "version_deleted_at", "version__status", "created_at", "updated_at", "snapshot", "published_locale", "latest", "autosave" FROM \`_news_v\`;`)
  await db.run(sql`DROP TABLE \`_news_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__news_v\` RENAME TO \`_news_v\`;`)
  await db.run(sql`CREATE INDEX \`_news_v_parent_idx\` ON \`_news_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_version_version_cover_idx\` ON \`_news_v\` (\`version_cover_id\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_version_version_slug_idx\` ON \`_news_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_version_version_updated_at_idx\` ON \`_news_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_version_version_created_at_idx\` ON \`_news_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_version_version_deleted_at_idx\` ON \`_news_v\` (\`version_deleted_at\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_version_version__status_idx\` ON \`_news_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_created_at_idx\` ON \`_news_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_updated_at_idx\` ON \`_news_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_snapshot_idx\` ON \`_news_v\` (\`snapshot\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_published_locale_idx\` ON \`_news_v\` (\`published_locale\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_latest_idx\` ON \`_news_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_autosave_idx\` ON \`_news_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`has_english\` integer DEFAULT false,
  	\`slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`deleted_at\` text,
  	\`_status\` text DEFAULT 'draft'
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages\`("id", "has_english", "slug", "updated_at", "created_at", "deleted_at", "_status") SELECT "id", "has_english", "slug", "updated_at", "created_at", "deleted_at", "_status" FROM \`pages\`;`)
  await db.run(sql`DROP TABLE \`pages\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages\` RENAME TO \`pages\`;`)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_slug_idx\` ON \`pages\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`pages_updated_at_idx\` ON \`pages\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`pages_created_at_idx\` ON \`pages\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`pages_deleted_at_idx\` ON \`pages\` (\`deleted_at\`);`)
  await db.run(sql`CREATE INDEX \`pages__status_idx\` ON \`pages\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_has_english\` integer DEFAULT false,
  	\`version_slug\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version_deleted_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`snapshot\` integer,
  	\`published_locale\` text,
  	\`latest\` integer,
  	\`autosave\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v\`("id", "parent_id", "version_has_english", "version_slug", "version_updated_at", "version_created_at", "version_deleted_at", "version__status", "created_at", "updated_at", "snapshot", "published_locale", "latest", "autosave") SELECT "id", "parent_id", "version_has_english", "version_slug", "version_updated_at", "version_created_at", "version_deleted_at", "version__status", "created_at", "updated_at", "snapshot", "published_locale", "latest", "autosave" FROM \`_pages_v\`;`)
  await db.run(sql`DROP TABLE \`_pages_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v\` RENAME TO \`_pages_v\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_parent_idx\` ON \`_pages_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_slug_idx\` ON \`_pages_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_updated_at_idx\` ON \`_pages_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_created_at_idx\` ON \`_pages_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_deleted_at_idx\` ON \`_pages_v\` (\`version_deleted_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version__status_idx\` ON \`_pages_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_created_at_idx\` ON \`_pages_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_updated_at_idx\` ON \`_pages_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_snapshot_idx\` ON \`_pages_v\` (\`snapshot\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_published_locale_idx\` ON \`_pages_v\` (\`published_locale\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_latest_idx\` ON \`_pages_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_autosave_idx\` ON \`_pages_v\` (\`autosave\`);`)
  await db.run(sql`ALTER TABLE \`news_locales\` DROP COLUMN \`meta_title\`;`)
  await db.run(sql`ALTER TABLE \`news_locales\` DROP COLUMN \`meta_description\`;`)
  await db.run(sql`ALTER TABLE \`_news_v_locales\` DROP COLUMN \`version_meta_title\`;`)
  await db.run(sql`ALTER TABLE \`_news_v_locales\` DROP COLUMN \`version_meta_description\`;`)
  await db.run(sql`ALTER TABLE \`pages_locales\` DROP COLUMN \`meta_title\`;`)
  await db.run(sql`ALTER TABLE \`pages_locales\` DROP COLUMN \`meta_description\`;`)
  await db.run(sql`ALTER TABLE \`_pages_v_locales\` DROP COLUMN \`version_meta_title\`;`)
  await db.run(sql`ALTER TABLE \`_pages_v_locales\` DROP COLUMN \`version_meta_description\`;`)
}
