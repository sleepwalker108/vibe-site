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

const fix = (node: unknown) => {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) return node.forEach(fix)
  const n = node as Node
  if (n.type === 'heading' && typeof n.tag === 'string') {
    if (n.tag === 'h1') n.tag = 'h2'
    else if (n.tag === 'h5' || n.tag === 'h6') n.tag = 'h4'
  }
  if (Array.isArray(n.children) && n.children.some(isLink)) n.children = mergeLinks(n.children)
  for (const v of Object.values(n)) if (v && typeof v === 'object') fix(v)
}

export const normalizeHeadings =
  (fields: string[]): CollectionBeforeValidateHook =>
  ({ data }) => {
    for (const f of fields) if (data?.[f]) fix(data[f])
    return data
  }
