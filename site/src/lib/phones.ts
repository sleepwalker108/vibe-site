// Пошук телефонних номерів у тексті сторінок і новин — щоб на них можна було натиснути й подзвонити.
// Розпізнаються українські номери в будь-якому звичному записі:
//   +38 (066) 813-62-39 · +380668136239 · 38 066 813 62 39 · (044) 248-15-48 · 066-813-62-39 · 0 800 501 482
// і короткі номери гарячих ліній 1548, 1648 (також «15-48», «16-48»).
const SEP = '[\\s\\u00a0‑–-]?'
const LONG = `(?:\\+?3${SEP}8${SEP})?\\(?0\\d{2}\\)?${SEP}\\d{3}${SEP}\\d{2}${SEP}\\d{2}`
const FREE = `0${SEP}800${SEP}\\d{3}${SEP}\\d{3}`
const SHORT = `1[56]${SEP}48`
// номер не повинен бути частиною довшого числа (дати, суми, коду) чи слова / назви файлу (Video-1548.mp4)
const RE = new RegExp(`(?<![\\p{L}\\d+_-])(?:${FREE}|${LONG}|${SHORT})(?![\\d%]|[._-]\\p{L})`, 'gu')

export type PhonePart = { text: string; tel?: string }

const toTel = (raw: string) => {
  const d = raw.replace(/\D/g, '')
  if (d.length <= 4) return d // 1548, 1648
  if (d.startsWith('380')) return `+${d}`
  if (d.startsWith('0')) return `+38${d}`
  return `+${d}`
}

// Розбиває текст на шматки: звичайний текст і телефонні номери (з адресою tel:)
export const splitPhones = (text: string): PhonePart[] => {
  const out: PhonePart[] = []
  let last = 0
  RE.lastIndex = 0 // регулярний вираз із «g» пам'ятає позицію попереднього пошуку — починаємо з початку
  for (const m of text.matchAll(RE)) {
    const i = m.index ?? 0
    if (i > last) out.push({ text: text.slice(last, i) })
    out.push({ text: m[0], tel: toTel(m[0]) })
    last = i + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}

export const hasPhone = (text: string) => {
  RE.lastIndex = 0
  const found = RE.test(text)
  RE.lastIndex = 0
  return found
}
