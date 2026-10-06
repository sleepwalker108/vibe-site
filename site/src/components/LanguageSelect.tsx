'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LOCALE_COOKIE, type Locale } from '@/lib/dictionary'

// Мови сайту: код у шапці, повна назва в списку (кожна — своєю мовою, щоб її впізнав носій)
const LANGS: { code: Locale; short: string; name: string }[] = [
  { code: 'uk', short: 'UA', name: 'Українська' },
  { code: 'en', short: 'EN', name: 'English' },
]

// Випадаючий список мов у шапці. Вибір зберігається в cookie на рік.
export const LanguageSelect = ({ locale, label }: { locale: Locale; label: string }) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [spin, setSpin] = useState(false) // глобус робить один оберт, коли мову змінено
  const box = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Наведення мишкою відкриває список (лише там, де є мишка — на телефонах працює натискання).
  // Закриваємо із затримкою, щоб список не зникав, поки мишка переходить від кнопки до пунктів.
  const canHover = () => typeof window !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }
  const onEnter = () => {
    if (!canHover()) return
    cancelClose()
    setOpen(true)
  }
  const onLeave = () => {
    if (!canHover()) return
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), 250)
  }
  useEffect(() => cancelClose, [])
  const current = LANGS.find((l) => l.code === locale) || LANGS[0]

  // Закриваємо кліком поза списком або клавішею Esc
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        box.current?.querySelector<HTMLButtonElement>('.lang-btn')?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (code: Locale) => {
    setOpen(false)
    if (code === locale) return
    setSpin(true)
    setTimeout(() => setSpin(false), 1200) // рівно один оберт
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`
    // відкрито за посиланням з ?lang=… (напр. з Google) — прибираємо його, щоб не перемикало мову назад
    const url = new URL(location.href)
    if (url.searchParams.has('lang')) {
      url.searchParams.delete('lang')
      router.replace(url.pathname + url.search + url.hash)
    } else router.refresh() // сторінка перезавантажує дані вже вибраною мовою
  }

  return (
    <div className="lang" ref={box} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        type="button"
        className="tool lang-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label}: ${current.name}`}
        onClick={() => setOpen((v) => (canHover() && v ? true : !v))}
      >
        {/* Глобус як Земля: меридіани «пропливають» зліва направо, поки куля обертається */}
        <svg className={`ti ti-globe${spin ? ' spin' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <g>
            <circle cx="12" cy="12" r="9" />
            <path d="M3.6 9.2h16.8M3.6 14.8h16.8" />
            {/* у спокої — один меридіан по центру */}
            <ellipse className="globe-still" cx="12" cy="12" rx="4" ry="9" />
            {/* під час обертання — чотири меридіани через кожні 90° */}
            {[0, 1, 2, 3].map((i) => (
              <path key={i} className="globe-mer" style={{ animationDelay: `${-i * 0.3}s` }} d="M12 3a9 9 0 0 1 0 18" />
            ))}
          </g>
        </svg>
        {current.short}
        <span className="lang-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {/* Список завжди в розмітці — так можна плавно показати й сховати його (див. .lang-menu у styles.css) */}
      <ul className={`lang-menu${open ? ' open' : ''}`} role="menu" aria-label={label} aria-hidden={!open}>
          {LANGS.map((l) => (
            <li key={l.code} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={l.code === locale}
                lang={l.code}
                className={l.code === locale ? 'active' : undefined}
                onClick={() => choose(l.code)}
                tabIndex={open ? 0 : -1}
              >
                <span className="lang-code">{l.short}</span>
                {l.name}
                {l.code === locale && (
                  <span className="lang-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
    </div>
  )
}
