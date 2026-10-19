import type { FieldHook } from 'payload'

// Посилання на файли нашої медіатеки зберігаються короткими (/api/media/file/назва.pdf), без домену.
// Кнопка «Копіювати» в медіатеці дає повну адресу з тим доменом, з якого відкрита адмінка
// (IP сервера, localhost, http://…) — така адреса у відвідувачів не відкривалась би.
// Тут її приводимо до вигляду, що працює на будь-якому домені:
//   https://будь-що/api/media/file/Перелік №1984.pdf  →  /api/media/file/%D0%9F…%E2%84%961984.pdf
//   …/admin/collections/media/21  (адреса сторінки файлу в адмінці)  →  /api/media/file/…
const MEDIA_FILE = /^(?:https?:\/\/[^/]+)?\/api\/media\/file\/([^?#]+)/i
const MEDIA_ADMIN = /^(?:https?:\/\/[^/]+)?\/admin\/collections\/media\/(\d+)(?:[/?#]|$)/i

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

export const mediaFileUrl = (filename: string) => `/api/media/file/${encodeURIComponent(filename)}`

// Без звернення до бази (для перевірки й виводу)
export const normalizeMediaLink = (raw: string) => {
  const url = raw.trim()
  const m = url.match(MEDIA_FILE)
  return m ? mediaFileUrl(decode(m[1])) : url
}

export const normalizeLinkUrl: FieldHook = async ({ value, req }) => {
  if (typeof value !== 'string' || !value.trim()) return value
  const url = value.trim()
  const admin = url.match(MEDIA_ADMIN)
  if (admin) {
    try {
      const doc = await req.payload.findByID({ collection: 'media', id: Number(admin[1]), depth: 0, req })
      if (doc?.filename) return mediaFileUrl(doc.filename)
    } catch {
      // файлу з таким номером немає — лишаємо як є, перевірка посилань у «Стані сервера» це покаже
    }
    return url
  }
  return normalizeMediaLink(url)
}

export const linkUrlHooks = { beforeValidate: [normalizeLinkUrl] }
