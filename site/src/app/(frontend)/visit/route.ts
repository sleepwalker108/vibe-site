import { createHash } from 'crypto'
import { getClient } from '@/lib/payload'

// Сюди сайт надсилає «перегляд сторінки» (компонент VisitTracker).
// Не зберігаємо ні IP, ні cookie: лише сторінку, домен звідки прийшли, тип пристрою, мову
// і анонімний відбиток відвідувача, який щодня змінюється (порахувати унікальних, але не стежити).
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|monitor/i

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
  if (!path.startsWith('/') || path.startsWith('/admin') || path.startsWith('/api')) return new Response(null, { status: 204 })

  let referrer = ''
  try {
    const host = new URL(String(body.ref || '')).hostname.replace(/^www\./, '')
    if (host && host !== new URL(req.url).hostname) referrer = host
  } catch {}

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || ''
  const day = new Date().toISOString().slice(0, 10)
  const visitor = createHash('sha256')
    .update(`${process.env.PAYLOAD_SECRET}|${day}|${ip}|${ua}`)
    .digest('hex')
    .slice(0, 16)
  const device = /tablet|ipad/i.test(ua) ? 'tablet' : /mobi|android|iphone/i.test(ua) ? 'mobile' : 'desktop'
  const lang = /(?:^|;\s*)lang=en/.test(cookie) ? 'en' : 'uk'

  const payload = await getClient()
  await payload.create({ collection: 'visits', data: { path, visitor, referrer, device, lang }, overrideAccess: true })
  return new Response(null, { status: 204 })
}
