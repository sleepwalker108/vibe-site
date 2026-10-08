import Link from 'next/link'
import type { Dict, Locale } from '@/lib/dictionary'
import { getClient } from '@/lib/payload'
import { localeQuery } from '@/lib/i18n'
import { safeHref } from '@/lib/safeHref'

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

type Props = { path: string; locale: Locale; t: Dict; draft?: boolean; children?: React.ReactNode }

// Бічна колонка підсторінки: меню поточного розділу (з «Меню сайту» в адмінці) + картка гарячої лінії
export const PageSidebar = async ({ path, locale, t, draft = false, children }: Props) => {
  const payload = await getClient()
  const nav = await payload.findGlobal({ slug: 'navigation', depth: 0, draft, ...localeQuery(locale) })
  const current = decode(path)
  const has = (url: string | null | undefined, exact: boolean) =>
    !!url && url !== '/' && (exact ? decode(url) === current : current.startsWith(decode(url) + '-'))
  // Розділ меню, де є ця сторінка; для підсторінок на кшталт «finansova-zvitnist-2025» — розділ «finansova-zvitnist»
  const findSection = (exact: boolean) =>
    nav.items?.find((i) => has(i.url, exact) || i.children?.some((c) => has(c.url, exact)))
  const section = findSection(true) || findSection(false)
  const links = section?.children?.length ? section.children : null

  return (
    <aside className="page-side">
      {links && (
        <nav className="side-nav" aria-label={section!.label}>
          <div className="side-title">{section!.label}</div>
          <ul>
            {links.map((l) => {
              const active = has(l.url, true) || has(l.url, false)
              return (
                <li key={l.id || l.label}>
                  <Link href={safeHref(l.url)} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>
                    {l.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
      {children}
      <a className="side-hot" href="tel:1548">
        <span className="side-hot-label">{t.hotline}</span>
        <b>1548</b>
        <span>{t.sideHotText}</span>
      </a>
      <a className="side-hot side-hot-2" href="tel:1648">
        <span className="side-hot-label">{t.hotline}</span>
        <b>1648</b>
        <span>{t.sideHot2Text}</span>
      </a>
    </aside>
  )
}
