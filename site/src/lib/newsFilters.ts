// Фільтри новин (тема, рік, місяць, порядок) — спільні для сторінки «Новини» і пошуку по сайту.
// Усі фільтри — у звичайних параметрах адреси (?topic=…&year=…), тож посиланням можна поділитися.
import type { Payload, Where } from 'payload'
import { isTopic, TOPICS, type Topic } from './topics'

export type NewsFilter = { topic?: Topic; year?: number; month?: number; sort: 'new' | 'old' }
type SP = Record<string, string | string[] | undefined>

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export const parseNewsFilter = (sp: SP): NewsFilter => {
  const topic = one(sp.topic)
  const year = Number(one(sp.year))
  const month = Number(one(sp.month))
  const validYear = Number.isInteger(year) && year >= 2000 && year <= 2100
  return {
    topic: isTopic(topic) ? topic : undefined,
    year: validYear ? year : undefined,
    month: validYear && Number.isInteger(month) && month >= 1 && month <= 12 ? month : undefined,
    sort: one(sp.sort) === 'old' ? 'old' : 'new',
  }
}

export const hasNewsFilter = (f: NewsFilter) => !!(f.topic || f.year)

// Умови для бази (без теми — щоб окремо порахувати кількість новин у кожній темі)
export const periodWhere = (f: NewsFilter): Where[] => {
  if (!f.year) return []
  // початок місяця за київським часом (+02:00; година різниці влітку на межі місяця неістотна)
  const start = (y: number, m: number) => new Date(`${y}-${String(m).padStart(2, '0')}-01T00:00:00+02:00`).toISOString()
  const from = start(f.year, f.month || 1)
  const to = !f.month || f.month === 12 ? start(f.year + 1, 1) : start(f.year, f.month + 1)
  return [{ publishedAt: { greater_than_equal: from } }, { publishedAt: { less_than: to } }]
}
export const topicWhere = (topic?: Topic): Where[] => (topic ? [{ topics: { in: [topic] } }] : [])

export const newsSort = (f: NewsFilter) => (f.sort === 'old' ? 'publishedAt' : '-publishedAt')

// Роки, за які є новини (найновіші першими)
export const newsYears = async (payload: Payload, base: Where[]): Promise<number[]> => {
  const edge = (sort: string) =>
    payload
      .find({ collection: 'news', where: { and: base }, sort, limit: 1, depth: 0, select: { publishedAt: true } })
      .then((r) => (r.docs[0]?.publishedAt ? new Date(r.docs[0].publishedAt).getFullYear() : null))
  const [first, last] = await Promise.all([edge('publishedAt'), edge('-publishedAt')])
  if (!first || !last) return []
  return Array.from({ length: last - first + 1 }, (_, i) => last - i)
}

// Скільки новин у кожній темі (з урахуванням інших фільтрів) — для підписів на кнопках тем
export const topicCounts = async (payload: Payload, base: Where[]) => {
  const count = (extra: Where[]) => payload.count({ collection: 'news', where: { and: [...base, ...extra] } }).then((r) => r.totalDocs)
  const [all, ...each] = await Promise.all([count([]), ...TOPICS.map((t) => count(topicWhere(t.value)))])
  return { all, byTopic: Object.fromEntries(TOPICS.map((t, i) => [t.value, each[i]])) as Record<Topic, number> }
}

// Адреса з тими самими параметрами, але зі зміною одного-двох (undefined — прибрати параметр)
export const withParams = (path: string, sp: SP, changes: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    const val = one(v)
    if (val && k !== 'page' && !(k in changes)) p.set(k, val)
  }
  for (const [k, v] of Object.entries(changes)) if (v !== undefined && v !== '') p.set(k, String(v))
  const qs = p.toString()
  return qs ? `${path}?${qs}` : path
}
