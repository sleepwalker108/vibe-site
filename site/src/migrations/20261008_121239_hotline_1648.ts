import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// Гаряча лінія 1648:
//  • друга кнопка дзвінка на першому екрані головної («Подзвонити 1648»);
//  • блок про 1648 на сторінці «Діяльність» — одразу після блоку про 1548 (українською й англійською).
// Тексти потім можна змінювати в адмінці. Можна безпечно запускати повторно.

const TEXT = {
  uk: {
    button: 'Подзвонити 1648',
    heading: 'Гаряча лінія 1648',
    text: 'Цілодобова гаряча лінія з питань військовополонених, примусово депортованих та зниклих осіб. Сюди можна повідомити про полон, зникнення, депортацію чи примусове переміщення, примусову мобілізацію на тимчасово окупованій території, загибель.',
    label: 'цілодобова гаряча лінія',
    note: 'Дзвінки з-за кордону: +38 (044) 287-81-65',
  },
  en: {
    button: 'Call 1648',
    heading: 'Hotline 1648',
    text: 'A 24/7 hotline on prisoners of war, forcibly deported and missing persons. Here you can report captivity, disappearance, deportation or forced displacement, forced mobilisation in the temporarily occupied territory, or death.',
    label: '24/7 hotline',
    note: 'Calls from abroad: +38 (044) 287-81-65',
  },
}

const textNode = (text: string, format = 0) => ({ type: 'text', version: 1, text, format, detail: 0, mode: 'normal', style: '' })
const blocks = (t: (typeof TEXT)['uk'], suffix: string) => [
  { type: 'heading', tag: 'h2', version: 1, format: '', indent: 0, direction: 'ltr', children: [textNode(t.heading)] },
  { type: 'paragraph', version: 1, format: '', indent: 0, direction: 'ltr', textFormat: 0, textStyle: '', children: [textNode(t.text)] },
  {
    type: 'block',
    version: 2,
    format: '',
    fields: { id: `blk1648${suffix}`, blockName: '', blockType: 'stat', number: '1648', label: t.label, note: t.note },
  },
]

// Вставляє блок 1648 після «виділеної цифри» розділу 1548 (якщо його ще немає)
const insert1648 = (json: string | null, t: (typeof TEXT)['uk'], suffix: string): string | null => {
  if (!json) return null
  let doc: any
  try {
    doc = JSON.parse(json)
  } catch {
    return null
  }
  const ch: any[] = doc?.root?.children
  if (!Array.isArray(ch) || JSON.stringify(ch).includes('"number":"1648"')) return null
  const plain = (n: any): string => (n?.text || '') + (n?.children || []).map(plain).join('')
  const h = ch.findIndex((n) => n.type === 'heading' && plain(n).includes('1548'))
  if (h < 0) return null
  // кінець розділу 1548 — до наступного заголовка
  let end = ch.findIndex((n, i) => i > h && n.type === 'heading')
  if (end < 0) end = ch.length
  ch.splice(end, 0, ...blocks(t, suffix))
  return JSON.stringify(doc)
}

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const addColumn = async (table: string, column: string) => {
    const cols = (await db.all(sql.raw(`PRAGMA table_info(\`${table}\`)`))) as { name: string }[]
    if (!cols.some((c) => c.name === column)) await db.run(sql.raw(`ALTER TABLE \`${table}\` ADD \`${column}\` text;`))
  }
  await addColumn('home', 'hero_call2_url')
  await addColumn('home_locales', 'hero_call2_label')
  await addColumn('_home_v', 'version_hero_call2_url')
  await addColumn('_home_v_locales', 'version_hero_call2_label')

  // кнопка на першому екрані — у поточній версії головної й в останній версії (її показує адмінка)
  await db.run(sql`UPDATE home SET hero_call2_url = 'tel:1648' WHERE hero_call2_url IS NULL`)
  await db.run(sql`UPDATE _home_v SET version_hero_call2_url = 'tel:1648' WHERE latest = 1 AND version_hero_call2_url IS NULL`)
  for (const locale of ['uk', 'en'] as const) {
    const label = TEXT[locale].button
    await db.run(sql`UPDATE home_locales SET hero_call2_label = ${label} WHERE _locale = ${locale} AND hero_call2_label IS NULL`)
    await db.run(
      sql`UPDATE _home_v_locales SET version_hero_call2_label = ${label} WHERE _locale = ${locale} AND version_hero_call2_label IS NULL AND _parent_id IN (SELECT id FROM _home_v WHERE latest = 1)`,
    )
  }

  // блок про 1648 на сторінці «Діяльність»
  let pages = 0
  const page = ((await db.all(sql`SELECT id FROM pages WHERE slug = 'diyalnist'`)) as { id: number }[])[0]
  if (page) {
    for (const locale of ['uk', 'en'] as const) {
      const row = ((await db.all(sql`SELECT id, content FROM pages_locales WHERE _parent_id = ${page.id} AND _locale = ${locale}`)) as any[])[0]
      const next = row && insert1648(row.content, TEXT[locale], locale)
      if (next) {
        await db.run(sql`UPDATE pages_locales SET content = ${next} WHERE id = ${row.id}`)
        pages++
      }
      const ver = ((await db.all(
        sql`SELECT l.id, l.version_content AS content FROM _pages_v_locales l JOIN _pages_v v ON v.id = l._parent_id WHERE v.parent_id = ${page.id} AND v.latest = 1 AND l._locale = ${locale}`,
      )) as any[])[0]
      const nextVer = ver && insert1648(ver.content, TEXT[locale], locale)
      if (nextVer) await db.run(sql`UPDATE _pages_v_locales SET version_content = ${nextVer} WHERE id = ${ver.id}`)
    }
  }
  payload.logger.info(`Гаряча лінія 1648: кнопка на головній, блок на «Діяльності» (мов: ${pages})`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`home\` DROP COLUMN \`hero_call2_url\`;`)
  await db.run(sql`ALTER TABLE \`home_locales\` DROP COLUMN \`hero_call2_label\`;`)
  await db.run(sql`ALTER TABLE \`_home_v\` DROP COLUMN \`version_hero_call2_url\`;`)
  await db.run(sql`ALTER TABLE \`_home_v_locales\` DROP COLUMN \`version_hero_call2_label\`;`)
}
