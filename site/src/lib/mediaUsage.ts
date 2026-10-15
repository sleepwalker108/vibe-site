import type { Payload } from 'payload'

// Де використовується файл медіатеки — щоб перед видаленням попередити, що зламається.
// Шукаємо в усій базі (крім історії версій):
//   • поля «файл» (обкладинка новини, відео, постер, логотип, PDF у кнопці тощо) — за зовнішнім ключем на media;
//   • файли, вставлені в текст сторінок і новин (вузол upload у редакторі);
//   • посилання на файл (/api/media/file/<назва>) — у текстах, кнопках, меню.
export type Usage = { label: string; title?: string; href: string }

type Row = Record<string, unknown>
const ROOTS: Record<string, { label: string; kind: 'collection' | 'global'; slug: string }> = {
  news: { label: 'Новина', kind: 'collection', slug: 'news' },
  pages: { label: 'Сторінка', kind: 'collection', slug: 'pages' },
  videos: { label: 'Відео', kind: 'collection', slug: 'videos' },
  home: { label: 'Головна сторінка', kind: 'global', slug: 'home' },
  navigation: { label: 'Меню сайту', kind: 'global', slug: 'navigation' },
  stats: { label: 'Статистика гарячих ліній', kind: 'global', slug: 'stats' },
  annual_report: { label: 'Річний звіт гарячих ліній', kind: 'global', slug: 'annual-report' },
  territories: { label: 'Мапа: статуси територій', kind: 'global', slug: 'territories' },
  resources: { label: 'Корисні ресурси', kind: 'global', slug: 'resources' },
  contacts: { label: 'Контакти й підвал сайту', kind: 'global', slug: 'contacts' },
  seo: { label: 'Пошук Google і соцмережі (SEO)', kind: 'global', slug: 'seo' },
}
const rootOf = (table: string) =>
  Object.keys(ROOTS)
    .filter((r) => table === r || table.startsWith(r + '_'))
    .sort((a, b) => b.length - a.length)[0]

const q = (s: string) => `"${s.replace(/"/g, '""')}"`

// Чи є у JSON (текст редактора) вузол-файл саме з цим id
const hasUploadNode = (json: unknown, id: number): boolean => {
  if (!json || typeof json !== 'object') return false
  if (Array.isArray(json)) return json.some((x) => hasUploadNode(x, id))
  const n = json as Record<string, unknown>
  if (n.type === 'upload' && n.relationTo === 'media') {
    const v = n.value as unknown
    if (v === id || String(v) === String(id) || (v && typeof v === 'object' && String((v as Row).id) === String(id))) return true
  }
  return Object.values(n).some((x) => hasUploadNode(x, id))
}

export const findMediaUsage = async (payload: Payload, ids: number[]): Promise<Record<number, Usage[]>> => {
  const db = (payload.db as unknown as { drizzle: { all: (sql: string) => Promise<Row[]> } }).drizzle
  const all = (sql: string) => db.all(sql)
  const result: Record<number, Usage[]> = Object.fromEntries(ids.map((id) => [id, []]))
  if (!ids.length) return result

  const media = await payload.find({ collection: 'media', where: { id: { in: ids } }, limit: ids.length, depth: 0, overrideAccess: true, trash: true })
  const files = new Map(media.docs.map((d) => [Number(d.id), d.filename || '']))

  // таблиці сайту без історії версій і службових
  const tables = ((await all(`SELECT name FROM sqlite_master WHERE type='table'`)) as { name: string }[])
    .map((t) => t.name)
    .filter((t) => !t.startsWith('_') && !t.startsWith('payload_') && !t.startsWith('sqlite_') && rootOf(t))
  const tableSet = new Set(tables)

  // від рядка вкладеної таблиці (блоки, списки, переклади) — до запису верхнього рівня
  const climb = async (table: string, row: Row): Promise<{ root: string; id: unknown } | null> => {
    let t = table
    let r: Row | undefined = row
    for (let depth = 0; depth < 6 && r; depth++) {
      const root = rootOf(t)!
      if (t === root) return { root, id: r.id }
      if (r._parent_id === undefined) return { root, id: undefined }
      // батьківська таблиця: без «_locales» або без останніх частин назви
      let parent = t.endsWith('_locales') ? t.slice(0, -'_locales'.length) : t
      if (parent === t) {
        const parts = t.split('_')
        parent = ''
        for (let k = parts.length - 1; k > 0; k--) {
          const cand = parts.slice(0, k).join('_')
          if (tableSet.has(cand)) {
            parent = cand
            break
          }
        }
      }
      if (!parent) return { root, id: undefined }
      const [p] = await all(`SELECT * FROM ${q(parent)} WHERE id = ${typeof r._parent_id === 'number' ? r._parent_id : `'${String(r._parent_id).replace(/'/g, "''")}'`} LIMIT 1`)
      t = parent
      r = p
    }
    return null
  }

  const found: Record<number, Map<string, { root: string; id: unknown }>> = Object.fromEntries(ids.map((id) => [id, new Map()]))
  const add = async (mediaId: number, table: string, row: Row) => {
    const at = await climb(table, row)
    if (at) found[mediaId].set(`${at.root}:${String(at.id ?? '')}`, at)
  }

  for (const t of tables) {
    // 1) поля-файли: зовнішній ключ на media
    const fks = ((await all(`PRAGMA foreign_key_list(${q(t)})`)) as { table: string; from: string }[]).filter((f) => f.table === 'media')
    for (const fk of fks) {
      const rows = await all(`SELECT * FROM ${q(t)} WHERE ${q(fk.from)} IN (${ids.join(',')})`)
      for (const row of rows) await add(Number(row[fk.from]), t, row)
    }
    // 2) текстові стовпці: вставлені в текст файли й посилання на файл
    const textCols = ((await all(`PRAGMA table_info(${q(t)})`)) as { name: string; type: string }[]).filter((c) => /text|json/i.test(c.type))
    if (!textCols.length) continue
    for (const id of ids) {
      const name = files.get(id)
      const patterns = ['%"relationTo":"media"%']
      if (name) patterns.push(`%/api/media/file/${name}%`, `%/api/media/file/${encodeURIComponent(name)}%`)
      const where = textCols.flatMap((c) => patterns.map((p) => `${q(c.name)} LIKE '${p.replace(/'/g, "''")}'`)).join(' OR ')
      const rows = await all(`SELECT * FROM ${q(t)} WHERE ${where} LIMIT 200`)
      for (const row of rows) {
        const hit = textCols.some((c) => {
          const v = row[c.name]
          if (typeof v !== 'string') return false
          if (name && (v.includes(`/api/media/file/${name}`) || v.includes(`/api/media/file/${encodeURIComponent(name)}`))) return true
          if (!v.includes('"relationTo":"media"')) return false
          try {
            return hasUploadNode(JSON.parse(v), id)
          } catch {
            return false
          }
        })
        if (hit) await add(id, t, row)
      }
    }
  }

  // назви й посилання в адмінці
  for (const id of ids) {
    for (const at of found[id].values()) {
      const meta = ROOTS[at.root]
      if (meta.kind === 'global') {
        result[id].push({ label: meta.label, href: `/admin/globals/${meta.slug}` })
        continue
      }
      let title: string | undefined
      try {
        const doc = (await payload.findByID({ collection: meta.slug as 'news', id: at.id as number, depth: 0, overrideAccess: true, locale: 'uk', trash: true })) as { title?: string }
        title = doc.title
      } catch {}
      result[id].push({ label: meta.label, title, href: at.id !== undefined ? `/admin/collections/${meta.slug}/${at.id}` : `/admin/collections/${meta.slug}` })
    }
  }
  return result
}
