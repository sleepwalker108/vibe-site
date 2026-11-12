import type { CollectionBeforeOperationHook, Where } from 'payload'
import { normalize } from '../lib/searchText'

// Пошук в адмінці без різниці великих і малих літер. База (SQLite) порівнює без урахування регістру лише
// латиницю, тож «впо» не знаходило «ВПО». Рядок пошуку над списком (і у вікнах вибору, напр. «Обрати з
// існуючих») Payload перетворює на { or: [{ поле: { like: текст } }, …] } — до кожної такої умови додаємо
// варіанти написання: малими, великими, з великої літери. Якщо в колекції є searchText (новини, сторінки:
// заголовок + текст малими літерами), шукаємо й у ньому — так знаходиться й слово з тексту.

const variants = (s: string) => {
  const lower = s.toLocaleLowerCase('uk')
  const upper = s.toLocaleUpperCase('uk')
  const cap = lower.charAt(0).toLocaleUpperCase('uk') + lower.slice(1)
  return [...new Set([s, lower, upper, cap])]
}

const isLike = (w: unknown): w is Record<string, { like: string }> => {
  if (!w || typeof w !== 'object' || Array.isArray(w)) return false
  const keys = Object.keys(w)
  if (keys.length !== 1 || keys[0] === 'and' || keys[0] === 'or') return false
  const c = (w as Record<string, unknown>)[keys[0]]
  return !!c && typeof c === 'object' && typeof (c as { like?: unknown }).like === 'string' && Object.keys(c).length === 1
}

const expand = (where: Where, withSearchText: boolean): Where => {
  const out: Where = {}
  for (const [key, value] of Object.entries(where)) {
    if ((key === 'or' || key === 'and') && Array.isArray(value)) {
      const list = (value as Where[]).map((w) => expand(w, withSearchText))
      if (key === 'or' && list.some(isLike)) {
        const extra: Where[] = []
        for (const w of list.filter(isLike)) {
          const [field] = Object.keys(w)
          const text = (w as Record<string, { like: string }>)[field].like
          for (const v of variants(text)) if (v !== text) extra.push({ [field]: { like: v } })
          if (withSearchText && field !== 'searchText') extra.push({ searchText: { like: normalize(text) } })
        }
        out.or = [...list, ...extra]
      } else out[key] = list
    } else out[key] = value as never
  }
  return out
}

export const caseInsensitiveSearch =
  (withSearchText = false): CollectionBeforeOperationHook =>
  ({ args, operation }) => {
    const where = (args as { where?: Where } | undefined)?.where
    if ((operation === 'read' || operation === 'count') && where) {
      return { ...args, where: expand(where, withSearchText) }
    }
    return args
  }
