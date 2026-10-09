import { sql } from '@payloadcms/db-sqlite'
import type { Payload } from 'payload'

// Підрахунки для розділу «Статистика» (таблиця visits). Дні — за часом сервера (Київ).
type Row = Record<string, string | number | null>
const all = async (payload: Payload, query: ReturnType<typeof sql>) =>
  ((await (payload.db as any).drizzle.all(query)) as Row[]) || []

const num = (v: unknown) => Number(v) || 0
const iso = (d: Date) => d.toISOString()
const DAY = 86400000

export type Totals = { views: number; visitors: number }
export type Item = { label: string; views: number; visitors: number }
export type Day = { date: string; views: number; visitors: number }
// мова версії сайту: усі відвідування, лише українська або лише англійська
export type Lang = 'all' | 'uk' | 'en'
const langCond = (lang: Lang) => (lang === 'all' ? sql`` : sql` AND lang = ${lang}`)

const totals = async (payload: Payload, from: Date, to: Date, lang: Lang = 'all'): Promise<Totals> => {
  const [r] = await all(
    payload,
    sql`SELECT count(*) AS views, count(DISTINCT visitor) AS visitors FROM visits WHERE created_at >= ${iso(from)} AND created_at < ${iso(to)}${langCond(lang)}`,
  )
  return { views: num(r?.views), visitors: num(r?.visitors) }
}

const grouped = async (payload: Payload, column: 'path' | 'referrer' | 'device' | 'lang' | 'country', from: Date, limit: number, lang: Lang) => {
  // порожнє й «немає значення» (старі записи) — одна група
  const col = sql.raw(`coalesce(${column}, '')`)
  const rows = await all(
    payload,
    sql`SELECT ${col} AS label, count(*) AS views, count(DISTINCT visitor) AS visitors FROM visits
        WHERE created_at >= ${iso(from)}${langCond(lang)} GROUP BY ${col} ORDER BY views DESC LIMIT ${limit}`,
  )
  return rows.map((r) => ({ label: String(r.label ?? ''), views: num(r.views), visitors: num(r.visitors) }))
}

// Короткий підсумок для головної сторінки адмінки
export const getSummary = async (payload: Payload) => {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(0, 0, 0, 0)
  const [today, week, online] = await Promise.all([
    totals(payload, midnight, now),
    totals(payload, new Date(now.getTime() - 7 * DAY), now),
    totals(payload, new Date(now.getTime() - 5 * 60000), now),
  ])
  return { today, week, online: online.visitors }
}

// Повний звіт за останні `days` днів (і порівняння з попереднім таким самим періодом) — для всього сайту чи однієї мовної версії
export const getReport = async (payload: Payload, days: number, lang: Lang = 'all') => {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))
  const prevStart = new Date(start.getTime() - days * DAY)

  const [current, previous, perDayRows, pages, referrers, devices, langs, countries, online] = await Promise.all([
    totals(payload, start, now, lang),
    totals(payload, prevStart, start, lang),
    all(
      payload,
      sql`SELECT date(created_at, 'localtime') AS d, count(*) AS views, count(DISTINCT visitor) AS visitors FROM visits
          WHERE created_at >= ${iso(start)}${langCond(lang)} GROUP BY d`,
    ),
    grouped(payload, 'path', start, 15, lang),
    grouped(payload, 'referrer', start, 10, lang),
    grouped(payload, 'device', start, 5, lang),
    grouped(payload, 'lang', start, 5, 'all'), // частка кожної мови — завжди від усього сайту
    grouped(payload, 'country', start, 15, lang),
    totals(payload, new Date(now.getTime() - 5 * 60000), now, lang),
  ])

  // усі дні періоду, навіть без відвідувань
  const byDate = new Map(perDayRows.map((r) => [String(r.d), r]))
  const perDay: Day[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const r = byDate.get(key)
    return { date: key, views: num(r?.views), visitors: num(r?.visitors) }
  })

  return { days, lang, current, previous, perDay, pages, referrers, devices, langs, countries, online: online.visitors }
}

export type Report = Awaited<ReturnType<typeof getReport>>
