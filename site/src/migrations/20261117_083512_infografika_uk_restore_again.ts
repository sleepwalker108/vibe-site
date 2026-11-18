import fs from 'fs'
import path from 'path'
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'
import { buildSearchText } from '../lib/searchText'

// «Гаряча лінія → Корисна інформація» (/infografika): українська версія знову опинилась з англійським текстом
// (після 20261116_122142_infografika_uk_restore). Причину виправлено (hooks/requireUkrainianTitle.ts), тут —
// повертаємо український оригінал ще раз.
// Лише українську версію і лише там, де вона англійська: в опублікованій версії та в незавершеній чернетці
// (якщо є) — окремо. Не через «Опублікувати»: воно опублікувало б і чужі незавершені правки (напр. англійської
// версії). Нічого не робить, якщо українська версія вже українською — можна запускати повторно.
const FILE = path.resolve(process.cwd(), 'src/migrations/files/infografika-uk.json')

type Row = Record<string, unknown>
// англійська, якщо назва як в англійській / «Useful information» / порожня, або в тексті немає жодної української літери
const english = (title: unknown, content: unknown, enTitle: unknown) => {
  const t = String(title || '').trim()
  return !t || t === 'Useful information' || (!!enTitle && t === String(enTitle).trim()) || !/[а-яіїєґ]/i.test(String(content || ''))
}

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const [page] = (await db.all(sql`SELECT id FROM pages WHERE slug = 'infografika' LIMIT 1`)) as Row[]
  if (!page) return
  const id = Number(page.id)
  const uk = JSON.parse(fs.readFileSync(FILE, 'utf8')) as { title: string; content: unknown }
  const content = JSON.stringify(uk.content)
  const search = buildSearchText(uk.title, uk.content)
  let fixed = 0

  // 1) опублікована версія (основна таблиця) і запис останньої опублікованої версії в історії
  const loc = (await db.all(sql`SELECT _locale, title, content FROM pages_locales WHERE _parent_id = ${id}`)) as Row[]
  const pub = loc.find((r) => r._locale === 'uk')
  const pubEn = loc.find((r) => r._locale === 'en')
  if (pub && english(pub.title, pub.content, pubEn?.title)) {
    await db.run(sql`UPDATE pages_locales SET title = ${uk.title}, content = ${content}, search_text = ${search} WHERE _parent_id = ${id} AND _locale = 'uk'`)
    const [v] = (await db.all(
      sql`SELECT id FROM _pages_v WHERE parent_id = ${id} AND version__status = 'published' ORDER BY updated_at DESC LIMIT 1`,
    )) as Row[]
    if (v)
      await db.run(
        sql`UPDATE _pages_v_locales SET version_title = ${uk.title}, version_content = ${content}, version_search_text = ${search} WHERE _parent_id = ${Number(v.id)} AND _locale = 'uk'`,
      )
    fixed++
  }

  // 2) незавершена чернетка (те, що відкривається в адмінці), якщо вона новіша за опубліковане
  const [draft] = (await db.all(sql`SELECT id FROM _pages_v WHERE parent_id = ${id} AND latest = 1 AND version__status = 'draft' LIMIT 1`)) as Row[]
  if (draft) {
    const vloc = (await db.all(sql`SELECT _locale, version_title AS title, version_content AS content FROM _pages_v_locales WHERE _parent_id = ${Number(draft.id)}`)) as Row[]
    const d = vloc.find((r) => r._locale === 'uk')
    const dEn = vloc.find((r) => r._locale === 'en')
    if (d && english(d.title, d.content, dEn?.title)) {
      await db.run(
        sql`UPDATE _pages_v_locales SET version_title = ${uk.title}, version_content = ${content}, version_search_text = ${search} WHERE _parent_id = ${Number(draft.id)} AND _locale = 'uk'`,
      )
      fixed++
    }
  }

  payload.logger.info(fixed ? 'Корисна інформація: українську версію повернуто' : 'Корисна інформація: українська версія вже українською — не змінюю')
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // повертати англійський текст в українську версію не потрібно
}
