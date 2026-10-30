import Link from 'next/link'
import type { Dict, Locale } from '@/lib/dictionary'
import { getClient } from '@/lib/payload'
import { localeQuery } from '@/lib/i18n'
import { safeHref } from '@/lib/safeHref'
import { SideStick } from './SideStick'

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

// Державні цифрові системи, роботу яких забезпечує Товариство — дві окремі картки
const SYSTEMS = [
  { key: 'gis', title: 'ГІС РР', domain: 'gisrr.gov.ua', icon: 'M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4zM9 4v13.5M15 6.5V20', text: 'sideGisText', url: { uk: 'https://gisrr.gov.ua/', en: 'https://gisrr.gov.ua/' } },
  { key: 'dream', title: 'DREAM', domain: 'dream.gov.ua', icon: 'M4 20h16M7 16v-5M12 16V6M17 16v-8', text: 'sideDreamText', url: { uk: 'https://dream.gov.ua/', en: 'https://dream.gov.ua/en' } },
] as const

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
      <SideStick />
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
      {SYSTEMS.map((s) => (
        <a key={s.key} className={`side-sys side-sys-${s.key}`} href={s.url[locale]} target="_blank" rel="noopener noreferrer">
          <span className="side-sys-top">
            <span className="side-sys-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={s.icon} />
              </svg>
            </span>
          </span>
          <b>{s.title}</b>
          <span className="side-sys-text">{t[s.text]}</span>
          <span className="side-sys-domain">
            {s.domain}
            <span className="sr-only"> {t.newTab}</span>
          </span>
        </a>
      ))}
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
