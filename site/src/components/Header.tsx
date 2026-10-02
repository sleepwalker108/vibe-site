'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { A11Y_KEY, LOCALE_COOKIE, type Dict, type Locale } from '@/lib/dictionary'
import { LanguageSelect } from './LanguageSelect'

export type MenuItem = {
  id?: string | null
  label: string
  url?: string | null
  children?: { id?: string | null; label: string; url?: string | null }[] | null
}

const isExternal = (url: string) => /^https?:\/\//.test(url)

// Посилання меню: зовнішні сайти відкриваються в новій вкладці
const MenuLink = ({ url, label, onClick }: { url: string; label: string; onClick?: () => void }) =>
  isExternal(url) ? (
    <a href={url} target="_blank" rel="noopener noreferrer" onClick={onClick}>
      {label}
    </a>
  ) : (
    <Link href={url} onClick={onClick}>
      {label}
    </Link>
  )

type HeaderProps = {
  shortName?: string | null
  kicker?: string | null
  logoUrl?: string | null
  menu: MenuItem[]
  locale: Locale
  t: Dict
}

export const Header = ({ shortName, kicker, logoUrl, menu, locale, t }: HeaderProps) => {
  const [open, setOpen] = useState(false)
  // null — ще не прочитали збережені налаштування (щоб не скинути їх при першому рендері)
  const [fs, setFs] = useState<number | null>(null)
  const [contrast, setContrast] = useState<boolean | null>(null)
  const [scrolled, setScrolled] = useState(false)
  // compact — назва біля логотипа сховалась (бракує місця); stacked — меню перенеслось на другий рядок
  const [fit, setFit] = useState<{ compact: boolean; stacked: boolean }>({ compact: false, stacked: false })
  const headerRef = useRef<HTMLElement>(null)
  const router = useRouter()
  const setLang = (code: Locale) => {
    if (code === locale) return
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [])

  // Відкрите мобільне меню: сторінка під ним не прокручується, Esc закриває
  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open)
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Налаштування доступності зберігаються в браузері й діють на всіх сторінках
  useEffect(() => {
    let saved: { fs?: number; c?: boolean } = {}
    try {
      saved = JSON.parse(localStorage.getItem(A11Y_KEY) || '{}')
    } catch {}
    setFs(saved.fs || 16)
    setContrast(!!saved.c)
  }, [])
  useEffect(() => {
    if (fs === null || contrast === null) return
    const html = document.documentElement
    html.style.setProperty('--fs', fs + 'px')
    html.style.setProperty('--fs-scale', String(fs / 16)) // множник для тексту в шапці
    html.classList.toggle('contrast', contrast)
    try {
      localStorage.setItem(A11Y_KEY, JSON.stringify({ fs, c: contrast }))
    } catch {}
  }, [fs, contrast])

  // Чи вміщується шапка в один рядок за поточного розміру шрифту.
  // Рахуємо «природні» ширини частин, тож результат не залежить від того, що зараз сховано.
  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return
    const measure = () => {
      const wrap = header.querySelector<HTMLElement>('.wrap')
      const navEl = header.querySelector<HTMLElement>('.nav')
      const img = header.querySelector<HTMLElement>('.brand img')
      const text = header.querySelector<HTMLElement>('.brand-text')
      const tools = header.querySelector<HTMLElement>('.tools')
      if (!wrap || !navEl || !img || !text || !tools) return
      // вузький екран: меню під ☰ — у рядку лише логотип, назва й кнопки
      const burgerMode = getComputedStyle(navEl).display === 'none' || navEl.classList.contains('open')
      const navW = burgerMode
        ? 0
        : Array.from(navEl.children).reduce((sum, li) => sum + (li as HTMLElement).offsetWidth, 0)
      const gaps = 2 * parseFloat(getComputedStyle(wrap).columnGap || '0') + 8
      const full = img.offsetWidth + 12 + text.scrollWidth + 14 + navW + tools.offsetWidth + gaps
      const compact = img.offsetWidth + navW + tools.offsetWidth + gaps
      const room = wrap.clientWidth
      setFit({ compact: full > room, stacked: !burgerMode && compact > room })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(header)
    return () => ro.disconnect()
  }, [fs, menu, locale])

  // Реальна висота шапки → змінна --bar-h (на неї спирається відступ сторінки під шапкою)
  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const set = () => document.documentElement.style.setProperty('--bar-h', header.offsetHeight + 'px')
    set()
    const ro = new ResizeObserver(set)
    ro.observe(header)
    return () => ro.disconnect()
  }, [])

  const nav = (
    <ul className={`nav${open ? ' open' : ''}`}>
      {/* На телефоні кнопки шрифту, контрасту й мови живуть тут, у відкритому меню */}
      <li className="nav-tools">
        <div className="nt-group" role="group" aria-label={t.fontBigger}>
          <button type="button" className="nt-btn" aria-label={t.fontSmaller} onClick={() => setFs((v) => Math.max(14, (v || 16) - 2))}>
            A−
          </button>
          <button type="button" className="nt-btn" aria-label={t.fontBigger} onClick={() => setFs((v) => Math.min(24, (v || 16) + 2))}>
            A+
          </button>
          <button type="button" className="nt-btn" aria-label={t.contrast} aria-pressed={!!contrast} onClick={() => setContrast((v) => !v)}>
            ◐
          </button>
        </div>
        <div className="nt-group" role="group" aria-label={t.language}>
          {(['uk', 'en'] as const).map((code) => (
            <button
              key={code}
              type="button"
              lang={code}
              className={`nt-btn${code === locale ? ' active' : ''}`}
              aria-pressed={code === locale}
              onClick={() => setLang(code)}
            >
              {code === 'uk' ? 'UA' : 'EN'}
            </button>
          ))}
        </div>
      </li>
      {menu.map((m) => {
        const hasSub = !!m.children?.length
        return (
          <li key={m.id || m.label} className={hasSub ? 'has-sub' : undefined}>
            {m.url ? (
              <MenuLink url={m.url} label={m.label} onClick={() => !hasSub && setOpen(false)} />
            ) : (
              // пункт без посилання лише відкриває підменю (у т. ч. з клавіатури — Tab)
              <button type="button" className="nav-parent" aria-haspopup="true">
                {m.label}
              </button>
            )}
            {hasSub && (
              <div className="sub">
                {m.children!.map((c) => (
                  <MenuLink key={c.id || c.label} url={c.url || '#'} label={c.label} onClick={() => setOpen(false)} />
                ))}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )

  return (
    <header
      ref={headerRef}
      className={`topbar${scrolled ? ' scrolled' : ''}${fit.compact ? ' compact' : ''}${fit.stacked ? ' stacked' : ''}`}
    >
      <div className="wrap">
        <Link className="brand" href="/" aria-label={t.home}>
          <img src={logoUrl || '/img/emblem.png'} alt={t.logoAlt} />
          <span className="brand-text">
            <span className="brand-kicker">{kicker || t.kicker}</span>
            <span className="brand-name">{shortName || t.orgShort}</span>
          </span>
        </Link>
        <nav className="main-nav" aria-label={t.mainMenu}>
          {nav}
        </nav>
        <div className="tools">
          <button className="tool hide-sm" aria-label={t.fontSmaller} onClick={() => setFs((v) => Math.max(14, (v || 16) - 2))}>
            A−
          </button>
          <button className="tool hide-sm" aria-label={t.fontBigger} onClick={() => setFs((v) => Math.min(24, (v || 16) + 2))}>
            A+
          </button>
          <button className="tool hide-sm" aria-label={t.contrast} aria-pressed={!!contrast} onClick={() => setContrast((v) => !v)}>
            ◐
          </button>
          <div className="hide-sm">
            <LanguageSelect locale={locale} label={t.language} />
          </div>
          <button className="tool burger" aria-label={open ? t.close : t.menu} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>
    </header>
  )
}
