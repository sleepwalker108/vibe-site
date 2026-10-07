import { createHash } from 'crypto'
import { getClient } from '@/lib/payload'

// Сюди сайт надсилає «перегляд сторінки» (компонент VisitTracker).
// Не зберігаємо ні IP, ні cookie: лише сторінку, домен звідки прийшли, тип пристрою, мову
// і анонімний відбиток відвідувача, який щодня змінюється (порахувати унікальних, але не стежити).
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|monitor/i

// Захист від засмічення бази: з однієї адреси — не більше 60 переглядів за хвилину
// (людина стільки сторінок не відкриває; надлишок просто не записується)
const LIMIT = 60
const hits = new Map<string, { n: number; reset: number }>()
const tooMany = (key: string) => {
  const now = Date.now()
  const h = hits.get(key)
  if (!h || h.reset < now) {
    if (hits.size > 50_000) hits.clear() // не даємо самій таблиці лічильників розростись
    hits.set(key, { n: 1, reset: now + 60_000 })
    return false
  }
  return ++h.n > LIMIT
}

// Статистика старша за 13 місяців видаляється (раз на добу) — таблиця не росте безкінечно
let lastCleanup = 0
const cleanup = async (payload: Awaited<ReturnType<typeof getClient>>) => {
  if (Date.now() - lastCleanup < 864e5) return
  lastCleanup = Date.now()
  const before = new Date(Date.now() - 400 * 864e5).toISOString()
  await payload.delete({ collection: 'visits', where: { createdAt: { less_than: before } }, overrideAccess: true }).catch(() => {})
}

export async function POST(req: Request) {
  const ua = req.headers.get('user-agent') || ''
  const cookie = req.headers.get('cookie') || ''
  // боти та працівники, які увійшли в адмінку, не рахуються
  if (!ua || BOT.test(ua) || cookie.includes('payload-token=')) return new Response(null, { status: 204 })

  let body: { path?: string; ref?: string } = {}
  try {
    body = JSON.parse(await req.text())
  } catch {
    return new Response(null, { status: 400 })
  }
  const path = String(body.path || '').slice(0, 300)
  // лише адреси цього сайту: «//інший-сайт» і «/\інший-сайт» браузер відкрив би як чужий сайт
  if (!path.startsWith('/') || /^\/[/\\]/.test(path) || /[\u0000-\u001f]/.test(path) || path.startsWith('/admin') || path.startsWith('/api'))
    return new Response(null, { status: 204 })

  let referrer = ''
  try {
    const host = new URL(String(body.ref || '')).hostname.replace(/^www\./, '')
    if (host && host !== new URL(req.url).hostname) referrer = host
  } catch {}

  // справжня адреса відвідувача — від nginx (X-Real-IP); X-Forwarded-For може підробити сам відвідувач
  const ip = req.headers.get('x-real-ip') || (req.headers.get('x-forwarded-for') || '').split(',').pop()?.trim() || ''
  if (tooMany(ip || ua)) return new Response(null, { status: 204 })
  const day = new Date().toISOString().slice(0, 10)
  const visitor = createHash('sha256')
    .update(`${process.env.PAYLOAD_SECRET}|${day}|${ip}|${ua}`)
    .digest('hex')
    .slice(0, 16)
  const device = /tablet|ipad/i.test(ua) ? 'tablet' : /mobi|android|iphone/i.test(ua) ? 'mobile' : 'desktop'
  const lang = /(?:^|;\s*)lang=en/.test(cookie) ? 'en' : 'uk'

  const payload = await getClient()
  await payload.create({ collection: 'visits', data: { path, visitor, referrer, device, lang }, overrideAccess: true })
  cleanup(payload)
  return new Response(null, { status: 204 })
}
