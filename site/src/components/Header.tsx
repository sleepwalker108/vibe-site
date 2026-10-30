'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { IconTheme, useTheme } from './theme'
import { A11yPanel, IconGlasses, useA11y } from './A11yPanel'
import { A11Y_KEY, LOCALE_COOKIE, type Dict, type Locale } from '@/lib/dictionary'
import { LanguageSelect } from './LanguageSelect'
import { MobileMenu, type MenuContacts } from './MobileMenu'
import { safeHref } from '@/lib/safeHref'

export type MenuItem = {
  id?: string | null
  label: string
  url?: string | null
  children?: { id?: string | null; label: string; url?: string | null }[] | null
}

const isExternal = (url: string) => /^https?:\/\//.test(url)

// Посилання меню: зовнішні сайти відкриваються в новій вкладці
const MenuLink = ({ url, label, onClick, newTabLabel }: { url: string; label: string; onClick?: () => void; newTabLabel: string }) =>
  isExternal(url) ? (
    <a href={safeHref(url)} target="_blank" rel="noopener noreferrer" onClick={onClick}>
      {label}
      <span className="sr-only"> {newTabLabel}</span>
    </a>
  ) : (
    <Link href={safeHref(url)} onClick={onClick}>
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
  contacts: MenuContacts
}

// Анімовані іконки кнопок шапки (рух — лише при наведенні/натисканні; вимикається налаштуванням «менше руху»)
const IconFont = ({ dir }: { dir: 'up' | 'down' }) => (
  <span className={`ti ti-font ti-${dir}`} aria-hidden="true">
    <span className="ti-a">A</span>
    <span className="ti-sign">{dir === 'up' ? '+' : '−'}</span>
  </span>
)
// довгий пункт меню (3+ слова, напр. «Цифрові системи відновлення») — у два рядки, щоб меню вміщувалось
const twoLines = (label: string) => label.length >= 22 && label.trim().split(/\s+/).length >= 3

// ділить назву на два рядки приблизно порівну за словами («Цифрові системи» / «відновлення»)
const TwoLines = ({ label }: { label: string }) => {
  const words = label.trim().split(/\s+/)
  let best = 1
  for (let i = 1; i < words.length; i++) {
    const diff = (k: number) => Math.abs(words.slice(0, k).join(' ').length - words.slice(k).join(' ').length)
    if (diff(i) < diff(best)) best = i
  }
  return (
    <span className="nav-2l-text">
      <span>{words.slice(0, best).join(' ')}</span> <span>{words.slice(best).join(' ')}</span>
    </span>
  )
}

// Стрілочка підменю: повертається догори, коли підменю відкрите
const Caret = () => (
  <svg className="nav-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
)
const IconBurger = ({ open }: { open: boolean }) => (
  <span className={`ti ti-burger${open ? ' is-open' : ''}`} aria-hidden="true">
    <span />
    <span />
    <span />
  </span>
)

export const Header = ({ shortName, kicker, logoUrl, menu, locale, t, contacts }: HeaderProps) => {
  const burgerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  // null — ще не прочитали збережені налаштування (щоб не скинути їх при першому рендері)
  // версія для людей з порушенням зору: розмір тексту, колірна схема, інтервали, зображення (див. A11yPanel)
  const a11y = useA11y()
  const fs = a11y.a.fs
  const [a11yOpen, setA11yOpen] = useState(false)
  const a11yBtn = useRef<HTMLButtonElement>(null)
  const theme = useTheme()
  const [scrolled, setScrolled] = useState(false)
  // compact — назва біля логотипа сховалась (бракує місця); stacked — меню перенеслось на другий рядок
  const [fit, setFit] = useState<{ compact: boolean; stacked: boolean }>({ compact: false, stacked: false })
  const headerRef = useRef<HTMLElement>(null)
  // Підменю: відкрите лише одне. Мишкою — наведенням (із затримкою на закриття), кліком — перемикається,
  // з клавіатури — фокусом; Esc або клік поза меню закривають.
  const [sub, setSub] = useState<number | null>(null)
  const subTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const subOpenedAt = useRef(0) // щоб клік одразу після наведення не закривав щойно відкрите підменю
  const pathname = usePathname()
  const canHover = () => matchMedia('(hover: hover) and (pointer: fine)').matches
  const clearSubTimer = () => {
    if (subTimer.current) clearTimeout(subTimer.current)
    subTimer.current = null
  }
  useEffect(() => {
    setSub(null)
    setOpen(false) // мобільне меню закривається при переході на іншу сторінку (і кнопкою «Назад»)
  }, [pathname])
  useEffect(() => {
    if (sub === null) return
    const down = (e: MouseEvent) => !headerRef.current?.querySelector('.nav')?.contains(e.target as Node) && setSub(null)
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const li = headerRef.current?.querySelectorAll<HTMLElement>('.nav > li')[sub]
      setSub(null)
      li?.querySelector<HTMLElement>('a, button')?.focus()
    }
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', esc)
    }
  }, [sub])
  useEffect(() => clearSubTimer, [])
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      burgerRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])


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
      // проміжки рядка: логотип | меню | кнопки; коли меню сховане під ☰ — лише один проміжок
      const gaps = (burgerMode ? 1 : 2) * parseFloat(getComputedStyle(wrap).columnGap || '0') + 4
      // ширина самого тексту назви (без відступу, який змінюється під час анімації) + відступ 12 і риска 2
      const textW = Math.max(...Array.from(text.children, (c) => (c as HTMLElement).scrollWidth)) + 14
      const full = img.offsetWidth + 12 + textW + navW + tools.offsetWidth + gaps
      const compact = img.offsetWidth + navW + tools.offsetWidth + gaps
      const room = wrap.clientWidth
      setFit({ compact: full > room, stacked: !burgerMode && compact > room })
    }
    measure()
    // до завантаження шрифту назва ширша — після завантаження міряємо ще раз
    document.fonts?.ready.then(measure)
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
    <ul className="nav">
      {menu.map((m, i) => {
        const hasSub = !!m.children?.length
        const isOpen = sub === i
        return (
          <li
            key={m.id || m.label}
            className={[hasSub && 'has-sub', isOpen && 'sub-open', twoLines(m.label) && 'nav-2l'].filter(Boolean).join(' ') || undefined}
            onMouseEnter={
              hasSub
                ? () => {
                    if (!canHover()) return
                    clearSubTimer()
                    setSub((v) => {
                      if (v !== i) subOpenedAt.current = Date.now()
                      return i
                    })
                  }
                : undefined
            }
            onMouseLeave={
              hasSub
                ? () => {
                    if (!canHover()) return
                    clearSubTimer()
                    subTimer.current = setTimeout(() => setSub((v) => (v === i ? null : v)), 220)
                  }
                : undefined
            }
            onFocus={
              hasSub && m.url
                ? (e) => {
                    // пункт-посилання з підменю: з клавіатури (Tab) підменю відкривається фокусом
                    if (e.target === e.currentTarget.firstElementChild && e.target.matches(':focus-visible')) setSub(i)
                  }
                : undefined
            }
            onBlur={
              hasSub
                ? (e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setSub((v) => (v === i ? null : v))
                  }
                : undefined
            }
          >
            {m.url ? (
              <MenuLink newTabLabel={t.newTab} url={m.url} label={m.label} onClick={() => !hasSub && setOpen(false)} />
            ) : (
              // пункт без посилання лише відкриває/закриває підменю (мишкою, Enter чи пробілом)
              <button
                type="button"
                className="nav-parent"
                aria-haspopup="true"
                aria-expanded={isOpen}
                onClick={() =>
                  setSub((v) => {
                    if (v === i && Date.now() - subOpenedAt.current > 400) return null
                    if (v !== i) subOpenedAt.current = Date.now()
                    return i
                  })
                }
              >
                {twoLines(m.label) ? <TwoLines label={m.label} /> : m.label}
                <Caret />
              </button>
            )}
            {hasSub && m.url && <Caret />}
            {hasSub && (
              <div className="sub">
                {m.children!.map((c) => (
                  <MenuLink newTabLabel={t.newTab} key={c.id || c.label} url={c.url || '#'} label={c.label} onClick={() => setOpen(false)} />
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
          <Link className="tool tool-search" href="/search" aria-label={t.search} title={t.search}>
            <svg className="ti ti-search" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.5 4.5" />
            </svg>
          </Link>
          <button className="tool hide-sm" aria-label={t.fontSmaller} onClick={() => a11y.font(-1)}>
            <IconFont dir="down" />
          </button>
          <button className="tool hide-sm" aria-label={t.fontBigger} onClick={() => a11y.font(1)}>
            <IconFont dir="up" />
          </button>
          <button className="tool hide-sm theme-toggle" aria-label={t.darkTheme} title={t.darkTheme} aria-pressed={theme.dark} onClick={theme.toggle}>
            <IconTheme />
          </button>
          <button
            ref={a11yBtn}
            className="tool hide-sm tool-a11y"
            aria-label={t.a11yTitle}
            title={t.a11yTitle}
            aria-haspopup="dialog"
            aria-expanded={a11yOpen}
            data-a11y-toggle
            data-active={a11y.active || undefined}
            onClick={() => setA11yOpen((v) => !v)}
          >
            <IconGlasses />
          </button>
          <div className="hide-sm">
            <LanguageSelect locale={locale} label={t.language} />
          </div>
          <button ref={burgerRef} className="tool burger" aria-label={open ? t.close : t.menu} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <IconBurger open={open} />
          </button>
        </div>
      </div>
      <MobileMenu
        open={open}
        onClose={() => setOpen(false)}
        returnFocus={() => burgerRef.current?.focus()}
        menu={menu}
        logoUrl={logoUrl}
        shortName={shortName}
        kicker={kicker}
        locale={locale}
        t={t}
        a11yActive={a11y.active}
        onA11y={() => {
          setOpen(false)
          setA11yOpen(true)
        }}
        dark={theme.dark}
        onTheme={theme.toggle}
        onFont={a11y.font}
        onLang={setLang}
        contacts={contacts}
      />
      <A11yPanel open={a11yOpen} onClose={() => setA11yOpen(false)} t={t} state={a11y} returnFocus={() => a11yBtn.current?.focus()} />
    </header>
  )
}
