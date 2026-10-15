// Сторінки-розділи на кшталт «Фінансова звітність», «Закупівлі», «Звіти діяльності»: їхній текст — це просто
// рядки-посилання на сторінки за роками. Такі рядки (2 і більше поспіль) показуємо картками років
// (див. Prose → linkcards): великий рік, назва, скільки документів на сторінці року й коли її оновлено.
type Node = { type?: string; text?: string; children?: Node[]; fields?: { url?: string; linkType?: string; doc?: { value?: unknown } } }

const FILE = /\.(pdf|docx?|xlsx?|pptx?|odt|ods|zip|rar)([?#]|$)/i
export const DOC = /\.(pdf|docx?|xlsx?|pptx?|odt|ods)([?#]|$)/i

const text = (n: Node): string => (n.text || '') + (n.children || []).map(text).join('')
const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

export type LinkItem = { href: string; slug: string; text: string }

// Абзац, що складається лише з одного посилання на сторінку цього сайту (не файл і не інший сайт)
export const pageLinkOf = (node: Node): LinkItem | null => {
  if (node.type !== 'paragraph') return null
  const kids = (node.children || []).filter((k) => !(k.type === 'text' && !(k.text || '').trim()) && k.type !== 'linebreak')
  if (kids.length !== 1 || (kids[0].type !== 'link' && kids[0].type !== 'autolink')) return null
  const link = kids[0]
  let url = (link.fields?.url || '').trim().replace(/^https?:\/\/(www\.)?dp-reintegration\.gov\.ua/i, '')
  const docRef = link.fields?.doc?.value as { slug?: string } | undefined
  if (link.fields?.linkType === 'internal' && docRef?.slug) url = `/${docRef.slug}`
  if (!url.startsWith('/') || url.startsWith('//') || FILE.test(url) || url.startsWith('/api/') || url.startsWith('/wp-content/')) return null
  const slug = decode(url.split(/[?#]/)[0]).replace(/^\/+|\/+$/g, '')
  if (!slug || slug.includes('/')) return null
  const label = text(link).trim()
  return label ? { href: url, slug, text: label } : null
}

const isBlank = (n: Node) => n.type === 'paragraph' && !text(n).trim()

// Групи по 2+ таких абзаців поспіль (порожні рядки між ними не рахуються)
export const findLinkGroups = (children: Node[]) => {
  const groups: { start: number; end: number; items: LinkItem[] }[] = []
  let cur: { start: number; end: number; items: LinkItem[] } | null = null
  children.forEach((n, i) => {
    const item = pageLinkOf(n)
    if (item) {
      if (!cur) cur = { start: i, end: i, items: [] }
      cur.items.push(item)
      cur.end = i
    } else if (cur && isBlank(n)) {
      // порожній рядок — не розриває групу
    } else {
      if (cur && cur.items.length >= 2) groups.push(cur)
      cur = null
    }
  })
  if (cur && (cur as { items: LinkItem[] }).items.length >= 2) groups.push(cur)
  return groups
}

// Скільки документів на сторінці (посилання на PDF/Word/Excel і файли, вставлені з медіатеки)
export const countDocs = (content: unknown): number => {
  let n = 0
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach(walk)
    const x = node as Record<string, unknown> & { fields?: { url?: string }; value?: { filename?: string } }
    if ((x.type === 'link' || x.type === 'autolink') && DOC.test(x.fields?.url || '')) n++
    else if (x.type === 'upload' && DOC.test(String(x.value?.filename || ''))) n++
    Object.values(x).forEach(walk)
  }
  walk(content)
  return n
}

export type LinkInfo = Record<string, { title?: string; docs: number; updatedAt?: string }>

// Чи є на сторінці взагалі щось, крім порожніх рядків
export const isEmptyContent = (content: unknown) => {
  const root = (content as { root?: Node } | null)?.root
  if (!root?.children?.length) return true
  return root.children.every((n) => isBlank(n))
}
