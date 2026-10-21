// Картинка з іншого сайту → медіатека (для редактора тексту: скопійована з сайту картинка вставляється сама).
//   POST /api/media-import { url } → { id, filename, url }
// Лише для тих, хто увійшов в адмінку. Захист: лише http(s), лише публічні адреси (не внутрішня мережа й не сам
// сервер — і для кожного переадресування), лише картинки, не більше 15 МБ, 20 секунд на завантаження.
import dns from 'dns/promises'
import net from 'net'
import type { Endpoint } from 'payload'

const MAX = 15 * 1024 * 1024
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' }

// Внутрішні й службові адреси (IPv4, IPv6 і IPv4 в IPv6)
const isPrivate = (ip: string) => {
  const v4 = ip.replace(/^::ffff:/i, '')
  if (net.isIPv4(v4)) {
    const [a, b] = v4.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
  }
  const s = ip.toLowerCase()
  return s === '::' || s === '::1' || /^f[cd]/.test(s) || /^fe[89ab]/.test(s)
}

const publicUrl = async (raw: string): Promise<URL> => {
  const u = new URL(raw)
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Підтримуються лише адреси http(s)')
  if (u.username || u.password) throw new Error('Адреса з логіном не підтримується')
  const host = u.hostname.replace(/^\[|\]$/g, '')
  const ips = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map((r) => r.address)
  if (!ips.length || ips.some(isPrivate)) throw new Error('Ця адреса недоступна')
  return u
}

const safeName = (u: URL, ext: string) => {
  let base = ''
  try {
    base = decodeURIComponent(u.pathname.split('/').pop() || '')
  } catch {}
  base = base.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  return `${base || `image-${Date.now()}`}.${ext}`
}

export const mediaImportEndpoints: Endpoint[] = [
  {
    path: '/media-import',
    method: 'post',
    handler: async (req) => {
      if (!req.user) return Response.json({ error: 'Потрібно увійти в адмінку' }, { status: 401 })
      let body: { url?: string } = {}
      try {
        body = (await req.json?.()) || {}
      } catch {}
      const raw = String(body.url || '').trim()
      if (!raw || raw.length > 4000) return Response.json({ error: 'Немає адреси картинки' }, { status: 400 })
      try {
        // переадресування — вручну, щоб перевірити кожну адресу
        let url = await publicUrl(raw)
        let res: Response | null = null
        for (let hop = 0; hop < 4; hop++) {
          res = await fetch(url, {
            redirect: 'manual',
            signal: AbortSignal.timeout(20000),
            // як звичайний браузер — частина сайтів інакше не віддає картинки
            headers: {
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
              accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
              referer: `${url.origin}/`,
            },
          })
          if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
            url = await publicUrl(new URL(res.headers.get('location')!, url).toString())
            continue
          }
          break
        }
        if (!res || !res.ok) return Response.json({ error: `Сайт не віддав картинку (код ${res?.status ?? '—'})` }, { status: 400 })
        const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
        const ext = TYPES[type]
        if (!ext) return Response.json({ error: 'За цією адресою не картинка (або формат не підтримується)' }, { status: 400 })
        if (Number(res.headers.get('content-length') || 0) > MAX) return Response.json({ error: 'Картинка завелика (понад 15 МБ)' }, { status: 400 })
        // читаємо з обмеженням розміру
        const chunks: Uint8Array[] = []
        let size = 0
        const reader = res.body!.getReader()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          size += value.length
          if (size > MAX) {
            await reader.cancel()
            return Response.json({ error: 'Картинка завелика (понад 15 МБ)' }, { status: 400 })
          }
          chunks.push(value)
        }
        const data = Buffer.concat(chunks)
        const doc = await req.payload.create({
          collection: 'media',
          data: { alt: '' },
          file: { data, mimetype: type, name: safeName(url, ext), size: data.length },
          req,
          overrideAccess: false,
        })
        return Response.json({ id: doc.id, filename: doc.filename, url: doc.url })
      } catch (e) {
        return Response.json({ error: (e as Error).message || 'Не вдалося завантажити картинку' }, { status: 400 })
      }
    },
  },
]
