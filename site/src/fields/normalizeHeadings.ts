import type { CollectionBeforeValidateHook } from 'payload'

// Редактор дозволяє заголовки лише h2–h4 (h1 — це назва сторінки). Тексти, перенесені зі старого сайту,
// подекуди мають h1, h5, h6 — і тоді сторінку неможливо зберегти («Heading tag must be one of h2, h3, h4»).
// Перед перевіркою приводимо такі заголовки до найближчого дозволеного: h1 → h2, h5/h6 → h4.
const fix = (node: unknown) => {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) return node.forEach(fix)
  const n = node as { type?: string; tag?: string; children?: unknown }
  if (n.type === 'heading' && typeof n.tag === 'string') {
    if (n.tag === 'h1') n.tag = 'h2'
    else if (n.tag === 'h5' || n.tag === 'h6') n.tag = 'h4'
  }
  for (const v of Object.values(n)) if (v && typeof v === 'object') fix(v)
}

export const normalizeHeadings =
  (fields: string[]): CollectionBeforeValidateHook =>
  ({ data }) => {
    for (const f of fields) if (data?.[f]) fix(data[f])
    return data
  }
