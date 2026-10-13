'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { A11Y_KEY, type Dict } from '@/lib/dictionary'

// Версія для людей з порушенням зору: кнопка з окулярами в шапці (і в мобільному меню) відкриває панель
// налаштувань — розмір тексту, колірна схема, інтервали, зображення. Налаштування зберігаються в браузері
// й діють на всіх сторінках; ще до показу сторінки їх застосовує скрипт у <head> (layout.tsx).
export type Scheme = '' | 'dark' | 'light' | 'blue'
export type A11y = { fs: number; scheme: Scheme; spacing: boolean; img: '' | 'gray' | 'hide' }
const DEFAULTS: A11y = { fs: 16, scheme: '', spacing: false, img: '' }

// Класи на <html>: contrast (+ hc-light / hc-blue), a11y-spacing, a11y-img-gray / a11y-img-hide — див. styles.css
export const applyA11y = (a: A11y) => {
  const html = document.documentElement
  html.style.setProperty('--fs', a.fs + 'px')
  html.style.setProperty('--fs-scale', String(a.fs / 16)) // множник для тексту в шапці
  html.classList.toggle('contrast', !!a.scheme)
  html.classList.toggle('hc-light', a.scheme === 'light')
  html.classList.toggle('hc-blue', a.scheme === 'blue')
  html.classList.toggle('a11y-spacing', a.spacing)
  html.classList.toggle('a11y-img-gray', a.img === 'gray')
  html.classList.toggle('a11y-img-hide', a.img === 'hide')
}

export const useA11y = () => {
  // null — ще не прочитали збережене (щоб не перезаписати його значеннями за замовчуванням)
  const [a, setA] = useState<A11y | null>(null)
  useEffect(() => {
    let saved: { fs?: number; c?: boolean | Scheme; sp?: boolean; img?: A11y['img'] } = {}
    try {
      saved = JSON.parse(localStorage.getItem(A11Y_KEY) || '{}')
    } catch {}
    // c: раніше true/false (лише «біле на чорному»), тепер — назва схеми
    const scheme: Scheme =
      saved.c === true
        ? 'dark'
        : saved.c === 'light' || saved.c === 'blue' || saved.c === 'dark'
          ? saved.c
          : ''
    setA({
      fs: saved.fs || 16,
      scheme,
      spacing: !!saved.sp,
      img: saved.img === 'gray' || saved.img === 'hide' ? saved.img : '',
    })
  }, [])
  useEffect(() => {
    if (!a) return
    applyA11y(a)
    try {
      localStorage.setItem(
        A11Y_KEY,
        JSON.stringify({ fs: a.fs, c: a.scheme, sp: a.spacing, img: a.img }),
      )
    } catch {}
  }, [a])
  const set = (patch: Partial<A11y>) => setA((cur) => ({ ...(cur || DEFAULTS), ...patch }))
  const font = (dir: 1 | -1) =>
    setA((cur) => ({
      ...(cur || DEFAULTS),
      fs: Math.min(24, Math.max(14, (cur?.fs || 16) + dir * 2)),
    }))
  const active = !!a && (a.fs !== 16 || !!a.scheme || a.spacing || !!a.img)
  return { a: a || DEFAULTS, set, font, reset: () => setA(DEFAULTS), active }
}

// Окуляри — загальновживаний знак версії для людей з порушенням зору
export const IconGlasses = ({ size = 20 }: { size?: number }) => (
  <svg
    className="ti ti-glasses"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="6.5" cy="14.5" r="3.5" />
    <circle cx="17.5" cy="14.5" r="3.5" />
    <path d="M10 14.5c.6-.7 1.2-1 2-1s1.4.3 2 1M3 14V9.5L5 6M21 14V9.5L19 6" />
  </svg>
)

type Props = {
  open: boolean
  onClose: () => void
  t: Dict
  state: ReturnType<typeof useA11y>
  returnFocus?: () => void
}

export const A11yPanel = ({ open, onClose, t, state, returnFocus }: Props) => {
  const { a, set, font, reset } = state
  const panel = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Панель без затемнення: сайт видно поруч, і кожну зміну одразу видно на сторінці.
  // Esc або клік будь-де поза панеллю закривають її; фокус — у панель, після закриття — назад на кнопку.
  useEffect(() => {
    if (!open) return
    panel.current?.querySelector<HTMLElement>('button')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        returnFocus?.()
      }
    }
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element | null
      // кнопки, що відкривають панель, самі її перемикають
      if (panel.current?.contains(el) || el?.closest('[data-a11y-toggle]')) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open, onClose, returnFocus])

  if (!mounted || !open) return null

  const opt = <K extends keyof A11y>(k: K, v: A11y[K], label: string, className?: string) => (
    <button
      type="button"
      className={`a11y-opt${className ? ` ${className}` : ''}`}
      aria-pressed={a[k] === v}
      onClick={() => set({ [k]: v } as Partial<A11y>)}
    >
      {label}
    </button>
  )

  return createPortal(
    <div
      ref={panel}
      className="a11y-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="a11y-title"
    >
      <div className="a11y-head">
        <h2 id="a11y-title">
          <IconGlasses size={22} /> {t.a11yTitle}
        </h2>
        <button
          type="button"
          className="a11y-close"
          aria-label={t.close}
          onClick={() => {
            onClose()
            returnFocus?.()
          }}
        >
          ×
        </button>
      </div>

      <fieldset className="a11y-group">
        <legend>{t.a11yFont}</legend>
        <div className="a11y-row">
          <button
            type="button"
            className="a11y-opt"
            aria-label={t.fontSmaller}
            disabled={a.fs <= 14}
            onClick={() => font(-1)}
          >
            A−
          </button>
          <span className="a11y-val" aria-live="polite">
            {Math.round((a.fs / 16) * 100)}%
          </span>
          <button
            type="button"
            className="a11y-opt"
            aria-label={t.fontBigger}
            disabled={a.fs >= 24}
            onClick={() => font(1)}
          >
            A+
          </button>
        </div>
      </fieldset>

      <fieldset className="a11y-group">
        <legend>{t.a11yScheme}</legend>
        <div className="a11y-row a11y-schemes">
          {opt('scheme', '', t.schemeNormal, 'sc-normal')}
          {opt('scheme', 'dark', t.schemeDark, 'sc-dark')}
          {opt('scheme', 'light', t.schemeLight, 'sc-light')}
          {opt('scheme', 'blue', t.schemeBlue, 'sc-blue')}
        </div>
      </fieldset>

      <fieldset className="a11y-group">
        <legend>{t.a11ySpacing}</legend>
        <div className="a11y-row">
          {opt('spacing', false, t.spacingNormal)}
          {opt('spacing', true, t.spacingWide)}
        </div>
      </fieldset>

      <fieldset className="a11y-group">
        <legend>{t.a11yImages}</legend>
        <div className="a11y-row">
          {opt('img', '', t.imgShow)}
          {opt('img', 'gray', t.imgGray)}
          {opt('img', 'hide', t.imgHide)}
        </div>
      </fieldset>

      <button type="button" className="a11y-reset" onClick={reset}>
        ↺ {t.a11yReset}
      </button>
    </div>,
    document.body,
  )
}
