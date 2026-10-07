// Пошук по сайту: «текст для пошуку» новин і сторінок (заголовок + опис + весь текст) малими літерами.
// Зберігається в прихованому полі searchText і оновлюється автоматично під час кожного збереження.
// Малі літери — тому що база розрізняє великі й малі кириличні літери; так пошук не залежить від регістру.

// Звичайний текст із вмісту редактора (Lexical): текст абзаців, заголовків, списків, таблиць, а також блоків
// («Запитання — відповіді», картки тощо) — без адрес, ідентифікаторів і службових полів
const SKIP_KEYS = new Set(['id', 'type', 'format', 'mode', 'style', 'direction', 'version', 'url', 'blockType', 'blockName', 'relationTo', 'linkType', 'icon', 'tag', 'listType', 'rel', 'target', 'textStyle', 'backgroundColor'])
export const plainText = (node: unknown): string => {
  const out: string[] = []
  const walk = (n: unknown, key?: string) => {
    if (typeof n === 'string') {
      if (key && !SKIP_KEYS.has(key) && n.trim()) out.push(n)
      return
    }
    if (!n || typeof n !== 'object') return
    if (Array.isArray(n)) return n.forEach((x) => walk(x, key))
    const o = n as Record<string, unknown>
    // абзаци, заголовки, пункти списку — окремими рядками, щоб слова не зливалися
    const block = typeof o.type === 'string' && ['paragraph', 'heading', 'listitem', 'quote', 'tablecell', 'block'].includes(o.type)
    for (const [k, v] of Object.entries(o)) {
      if (k === 'value' && o.type === 'upload') continue // вкладені дані файлу з медіатеки
      walk(v, k)
    }
    if (block) out.push('\n')
  }
  walk(node)
  return out
    .join(' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

// Однакове написання для бази й запиту: малі літери, один вид апострофа, без зайвих пробілів
export const normalize = (s: string) =>
  s
    .toLocaleLowerCase('uk')
    .replace(/[’ʼ‘`´]/g, "'")
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()

export const buildSearchText = (...parts: unknown[]) =>
  normalize(parts.map((p) => (typeof p === 'string' ? p : p ? plainText(p) : '')).join(' ')).slice(0, 200_000)

// Українські слова змінюються (евакуація → евакуації, Безгін → Безгіна), тож шукаємо за основою:
// у довгих словах відкидаємо закінчення (останні 1–2 літери)
export const stem = (w: string) => (w.length >= 7 ? w.slice(0, -2) : w.length >= 5 ? w.slice(0, -1) : w)

// Слова запиту: нормалізовані, від 2 літер, не більше 6
export const queryWords = (q: string) =>
  normalize(q)
    .split(/[\s,.;:!?«»"()]+/)
    .filter((w) => w.length >= 2)
    .slice(0, 6)

// Уривок тексту довкола знайдених слів (для результатів пошуку): береться місце, де слова запиту
// стоять найближче одне до одного; усі знайдені слова в уривку підсвічуються
export type SnipPart = { text: string; mark?: boolean }
export const snippet = (text: string, words: string[], radius = 90): SnipPart[] | null => {
  // так само, як normalize() (апострофи, ё), але без зміни довжини — щоб позиції збігалися з оригіналом
  const low = text.toLocaleLowerCase('uk').replace(/[’ʼ‘`´]/g, "'").replace(/ё/g, 'е')
  const stems = [...new Set(words.map(stem))]
  const hits: { at: number; s: string }[] = []
  for (const s of stems) {
    for (let i = low.indexOf(s), n = 0; i >= 0 && n < 50; i = low.indexOf(s, i + 1), n++) hits.push({ at: i, s })
  }
  if (!hits.length) return null
  let best = hits[0]
  let bestScore = -1
  for (const h of hits) {
    const near = new Set(hits.filter((o) => Math.abs(o.at - h.at) <= radius).map((o) => o.s)).size
    if (near > bestScore || (near === bestScore && h.at < best.at)) [best, bestScore] = [h, near]
  }
  const start = Math.max(0, text.lastIndexOf(' ', Math.max(0, best.at - radius)) + 1)
  const endSpace = text.indexOf(' ', Math.min(text.length, best.at + radius * 1.5))
  const end = endSpace < 0 ? text.length : endSpace
  // підсвічуємо кожне знайдене слово до кінця (разом із закінченням)
  const marks = hits
    .filter((h) => h.at >= start && h.at < end)
    .map((h) => ({ at: h.at, len: low.slice(h.at).match(/^[\p{L}\p{N}'-]+/u)?.[0].length || h.s.length }))
    .sort((a, b) => a.at - b.at)
  const parts: SnipPart[] = []
  let pos = start
  for (const m of marks) {
    if (m.at < pos) continue
    parts.push({ text: text.slice(pos, m.at) }, { text: text.slice(m.at, m.at + m.len), mark: true })
    pos = m.at + m.len
  }
  parts.push({ text: text.slice(pos, Math.max(pos, end)) })
  if (start > 0) parts[0].text = '…' + parts[0].text
  if (end < text.length) parts[parts.length - 1].text += '…'
  return parts.map((p) => ({ ...p, text: p.text.replace(/\n/g, ' ') }))
}

// Умова для бази: кожне слово запиту (за основою) є в «тексті для пошуку»
export const searchWhere = (words: string[]) => ({ and: words.map((w) => ({ searchText: { like: stem(w) } })) })
