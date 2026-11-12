import { NextResponse, type NextRequest } from 'next/server'

// Сторінка створення в адмінці (новина, сторінка, відео, категорія) — завжди українською.
// Адмінка запам’ятовує останню вибрану мову: хто раз відкрив англійську версію, той потім, натиснувши
// «Створити», заповнював би англійську, а українська лишалась порожньою, без адреси сторінки, — і опублікована
// новина не з’являлась на сайті. Тому /admin/collections/…/create без ?locale=uk переводимо на ?locale=uk
// (і для звичайного відкриття, і для переходу всередині адмінки). Див. також hooks/requireUkrainianTitle.ts.
const ADMIN_CREATE = /^\/admin\/collections\/[^/]+\/create\/?$/

// Мова з адреси: ?lang=en відкриває англійську версію сторінки (так її бачить Google, який не має cookie),
// а ?lang=uk — українську. Вибір запам’ятовується в cookie «lang», як і перемикач у шапці.
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  if (ADMIN_CREATE.test(pathname)) {
    if (searchParams.get('locale') === 'uk') return NextResponse.next()
    const url = request.nextUrl.clone()
    url.searchParams.set('locale', 'uk')
    return NextResponse.redirect(url)
  }

  const lang = searchParams.get('lang')
  if (lang !== 'en' && lang !== 'uk') return NextResponse.next()

  const headers = new Headers(request.headers)
  const others = (request.headers.get('cookie') || '')
    .split(';')
    .map((c) => c.trim())
    .filter((c) => c && !c.startsWith('lang='))
  headers.set('cookie', [...others, `lang=${lang}`].join('; '))

  const res = NextResponse.next({ request: { headers } })
  res.cookies.set('lang', lang, { path: '/', maxAge: 31536000, sameSite: 'lax' })
  return res
}

export const config = {
  matcher: ['/((?!admin|api|_next|visit|sitemap.xml|robots.txt|img/|video/|favicon).*)', '/admin/collections/:collection/create'],
}
