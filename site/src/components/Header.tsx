'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { A11Y_KEY, LOCALE_COOKIE, type Dict, type Locale } from '@/lib/dictionary'
import { LanguageSelect } from './LanguageSelect'
import { MobileMenu, type MenuContacts } from './MobileMenu'

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
    <a href={url} target="_blank" rel="noopener noreferrer" onClick={onClick}>
      {label}
      <span className="sr-only"> {newTabLabel}</span>
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
  contacts: MenuContacts
}

// Анімовані іконки кнопок шапки (рух — лише при наведенні/натисканні; вимикається налаштуванням «менше руху»)
const IconFont = ({ dir }: { dir: 'up' | 'down' }) => (
  <span className={`ti ti-font ti-${dir}`} aria-hidden="true">
    <span className="ti-a">A</span>
    <span className="ti-sign">{dir === 'up' ? '+' : '−'}</span>
  </span>
)
const IconContrast = () => (
  <svg className="ti ti-contrast" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
    <path className="ti-half" d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
  </svg>
)
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
  const [fs, setFs] = useState<number | null>(null)
  const [contrast, setContrast] = useState<boolean | null>(null)
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
    <ul className="nav">
      {menu.map((m, i) => {
        const hasSub = !!m.children?.length
        const isOpen = sub === i
        return (
          <li
            key={m.id || m.label}
            className={hasSub ? `has-sub${isOpen ? ' sub-open' : ''}` : undefined}
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
                {m.label}
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
          <button className="tool hide-sm" aria-label={t.fontSmaller} onClick={() => setFs((v) => Math.max(14, (v || 16) - 2))}>
            <IconFont dir="down" />
          </button>
          <button className="tool hide-sm" aria-label={t.fontBigger} onClick={() => setFs((v) => Math.min(24, (v || 16) + 2))}>
            <IconFont dir="up" />
          </button>
          <button className="tool hide-sm" aria-label={t.contrast} aria-pressed={!!contrast} onClick={() => setContrast((v) => !v)}>
            <IconContrast />
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
        contrast={!!contrast}
        onContrast={() => setContrast((v) => !v)}
        onFont={(d) => setFs((v) => Math.min(24, Math.max(14, (v || 16) + d * 2)))}
        onLang={setLang}
        contacts={contacts}
      />
    </header>
  )
}
