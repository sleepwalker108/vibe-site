import { NextResponse, type NextRequest } from 'next/server'

// Мова з адреси: ?lang=en відкриває англійську версію сторінки (так її бачить Google, який не має cookie),
// а ?lang=uk — українську. Вибір запам’ятовується в cookie «lang», як і перемикач у шапці.
export function proxy(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang')
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
  matcher: ['/((?!admin|api|_next|visit|sitemap.xml|robots.txt|img/|video/|favicon).*)'],
}
