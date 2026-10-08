import type { CollectionBeforeValidateHook } from 'payload'

// Приведення тексту, перенесеного зі старого сайту, до вигляду, який приймає редактор:
//  • заголовки: редактор дозволяє лише h2–h4 (h1 — це назва сторінки). Тексти зі старого сайту подекуди мають
//    h1, h5, h6 — і тоді сторінку неможливо зберегти («Heading tag must be one of h2, h3, h4»).
//    Такі заголовки стають найближчими дозволеними: h1 → h2, h5/h6 → h4;
//  • посилання: назва документа буває розбита на кілька посилань поспіль з однаковою адресою
//    («SS100310 Ф3. Звіт» + «про» + «рух грошових коштів») — зливаємо їх в одне.
type Node = { type?: string; tag?: string; text?: string; fields?: { url?: string; linkType?: string; newTab?: boolean }; children?: Node[] }

const isLink = (n: Node) => n.type === 'link' || n.type === 'autolink'
const sameLink = (a: Node, b: Node) =>
  (a.fields?.url || '').trim() === (b.fields?.url || '').trim() && a.fields?.linkType === b.fields?.linkType && !!a.fields?.newTab === !!b.fields?.newTab
const isSpace = (n: Node) => n.type === 'text' && !(n.text || '').trim()

const mergeLinks = (children: Node[]): Node[] => {
  const out: Node[] = []
  for (let i = 0; i < children.length; i++) {
    const cur = children[i]
    const prev = out[out.length - 1]
    // посилання, що йде одразу після такого самого (можливо, через пробіл), — дописуємо до попереднього
    if (prev && isLink(prev) && isLink(cur) && sameLink(prev, cur)) {
      prev.children = [...(prev.children || []), ...(cur.children || [])]
      continue
    }
    if (prev && isLink(prev) && isSpace(cur) && children[i + 1] && isLink(children[i + 1]) && sameLink(prev, children[i + 1])) {
      prev.children = [...(prev.children || []), cur]
      continue
    }
    out.push(cur)
  }
  return out
}

// Посилання tel:, що охоплює лише шматок номера (зі старого сайту: посилання на «+38 (0», а далі «44) 248-15-45»),
// розгортаємо в звичайний текст і зливаємо сусідні шматки тексту з однаковим оформленням —
// тоді номер стає цілим і сам стає клікабельним (на той номер, який бачить людина).
const textOf = (n: Node): string => (n.text || '') + (n.children || []).map(textOf).join('')
const looksLikeWholePhone = (s: string) => (s.replace(/\D/g, '').length >= 10 || /^\s*1[56]-?48\s*$/.test(s))
const sameStyle = (a: any, b: any) => a.type === 'text' && b.type === 'text' && (a.format || 0) === (b.format || 0) && (a.style || '') === (b.style || '') && (a.mode || 'normal') === (b.mode || 'normal')
export const fixTelLinks = (children: Node[]): Node[] => {
  let changed = false
  const flat: Node[] = []
  for (const k of children) {
    if (isLink(k) && /^tel:/i.test(k.fields?.url || '') && !looksLikeWholePhone(textOf(k))) {
      flat.push(...(k.children || []))
      changed = true
    } else flat.push(k)
  }
  if (!changed) return children
  const out: any[] = []
  for (const k of flat) {
    const prev = out[out.length - 1]
    if (prev && sameStyle(prev, k)) out[out.length - 1] = { ...prev, text: (prev.text || '') + ((k as any).text || '') }
    else out.push({ ...k })
  }
  return out
}

const fix = (node: unknown) => {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) return node.forEach(fix)
  const n = node as Node
  if (n.type === 'heading' && typeof n.tag === 'string') {
    if (n.tag === 'h1') n.tag = 'h2'
    else if (n.tag === 'h5' || n.tag === 'h6') n.tag = 'h4'
  }
  if (Array.isArray(n.children) && n.children.some(isLink)) n.children = mergeLinks(fixTelLinks(n.children))
  for (const v of Object.values(n)) if (v && typeof v === 'object') fix(v)
}

export const normalizeHeadings =
  (fields: string[]): CollectionBeforeValidateHook =>
  ({ data }) => {
    for (const f of fields) if (data?.[f]) fix(data[f])
    return data
  }

// Ті самі виправлення — для показу на сайті (на копії: збережені дані не змінюються, доки сторінку не збережуть в адмінці)
export const normalizeContent = <T>(data: T): T => {
  const copy = structuredClone(data)
  fix(copy)
  return copy
}
