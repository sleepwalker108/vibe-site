'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Dict, Locale } from '@/lib/dictionary'
import type { MenuItem } from './Header'
import { safeHref } from '@/lib/safeHref'

export type Social = { network?: string | null; label?: string | null; url?: string | null }
export type MenuContacts = {
  hotline?: string | null
  hotlineNote?: string | null
  phones: string[]
  email?: string | null
  socials: Social[]
}

const isExternal = (url: string) => /^https?:\/\//.test(url)
const decode = (s: string) => {
  try {
    return decodeURI(s)
  } catch {
    return s
  }
}

// «+38 (066) 813-62-39 — гаряча лінія …» → номер для дзвінка й підпис
const splitPhone = (text: string) => {
  const m = text.match(/^\s*(\+?[\d][\d\s()-]{2,}\d)\s*[—–-]?\s*(.*)$/)
  return m ? { number: m[1].trim(), note: m[2].trim(), tel: m[1].replace(/[^\d+]/g, '') } : { number: text, note: '', tel: '' }
}

const Chevron = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
)
const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z" />
  </svg>
)
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7.2L4 7.3V17h16V7.3z" />
  </svg>
)
const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  telegram: <path d="M21.9 4.3 18.6 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.2-8.3c.4-.4-.1-.6-.6-.2L6 13.6 1.1 12c-1.1-.3-1.1-1 .2-1.6L20.5 3c.9-.3 1.7.2 1.4 1.3z" />,
  facebook: <path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v9h4v-9h3l.5-4h-3.5V8.9c0-.6.3-.9.5-.9z" />,
  instagram: (
    <path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM12 3c-2.4 0-2.7 0-3.7.1-3.4.2-5 1.8-5.2 5.2C3 9.3 3 9.6 3 12s0 2.7.1 3.7c.2 3.4 1.8 5 5.2 5.2 1 .1 1.3.1 3.7.1s2.7 0 3.7-.1c3.4-.2 5-1.8 5.2-5.2.1-1 .1-1.3.1-3.7s0-2.7-.1-3.7c-.2-3.4-1.8-5-5.2-5.2C14.7 3 14.4 3 12 3z" />
  ),
  youtube: <path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.4-1.6.5-3.2.5-4.8s-.1-3.2-.5-4.8zM9.7 15V9l5.8 3z" />,
  viber: <path d="M12 2C6.5 2 3 4.7 3 10.3c0 3 .9 5.1 2.6 6.4V21l3.3-2.6c1 .2 2 .3 3.1.3 5.5 0 9-2.7 9-8.4S17.5 2 12 2zm4.6 12.1-.7.7c-.6.6-1.8.3-3.5-.9a12 12 0 0 1-3.2-3.5c-.8-1.5-.9-2.6-.3-3.1l.7-.7c.3-.3.7-.3 1 0l1.1 1.4c.2.3.2.7-.1 1l-.5.5c.4 1 1.2 1.8 2.2 2.3l.5-.5c.3-.3.7-.3 1-.1l1.4 1c.4.3.4.7.4.9z" />,
  x: <path d="M17.8 3h3.3l-7.2 8.2L22.3 21h-6.6l-5.2-6.8L4.6 21H1.3l7.7-8.8L1 3h6.8l4.7 6.2zm-1.2 16.1h1.8L7 4.8H5z" />,
  linkedin: <path d="M4.5 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3 8.5h3V21H3zM9 8.5h2.9v1.7c.4-.8 1.4-1.9 3.2-1.9 3.4 0 4 2.2 4 5.1V21h-3v-6.8c0-1.6 0-3.7-2.3-3.7S11 12.3 11 14.1V21H9z" />,
}
const SocialIcon = ({ network }: { network?: string | null }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    {SOCIAL_ICONS[network || ''] || <circle cx="12" cy="12" r="5" />}
  </svg>
)

type Props = {
  open: boolean
  onClose: () => void
  menu: MenuItem[]
  logoUrl?: string | null
  shortName?: string | null
  kicker?: string | null
  locale: Locale
  t: Dict
  contrast: boolean
  onContrast: () => void
  onFont: (dir: 1 | -1) => void
  onLang: (code: Locale) => void
  contacts: MenuContacts
  returnFocus: () => void
}

/**
 * Мобільне меню: виїжджає праворуч поверх сторінки.
 * Пункти з розділювачами, підменю — акордеоном (відкрите лише одне), поточна сторінка підсвічена;
 * унизу — розмір тексту й мова, соцмережі та контакти.
 */
export const MobileMenu = ({ open, onClose, menu, logoUrl, shortName, kicker, locale, t, contrast, onContrast, onFont, onLang, contacts, returnFocus }: Props) => {
  const pathname = decode(usePathname() || '/')
  const [mounted, setMounted] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  useEffect(() => setMounted(true), [])

  const isActive = (url?: string | null) => !!url && !isExternal(url) && (decode(url) === pathname || (url !== '/' && pathname.startsWith(decode(url) + '/')))

  // при відкритті — розгорнути розділ поточної сторінки й перевести фокус у меню
  useEffect(() => {
    if (!open) return
    const i = menu.findIndex((m) => m.children?.some((c) => isActive(c.url)))
    setExpanded(i >= 0 ? i : null)
    const id = setTimeout(() => closeBtn.current?.focus(), 60)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Tab не виходить за межі відкритого меню
  const trap = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !panel.current) return
    const items = panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const close = () => {
    onClose()
    returnFocus()
  }

  const link = (url: string, label: string, className?: string) =>
    isExternal(url) ? (
      <a href={safeHref(url)} target="_blank" rel="noopener noreferrer" className={className} onClick={close}>
        {label}
        <span className="sr-only"> {t.newTab}</span>
      </a>
    ) : (
      <Link href={safeHref(url)} className={className} aria-current={isActive(url) ? 'page' : undefined} onClick={close}>
        {label}
      </Link>
    )

  if (!mounted) return null
  const hasContacts = contacts.hotline || contacts.phones.length || contacts.email

  return createPortal(
    <div className={`mm${open ? ' is-open' : ''}`} aria-hidden={!open} inert={!open}>
      <div className="mm-overlay" onClick={close} />
      <div ref={panel} className="mm-panel" role="dialog" aria-modal="true" aria-label={t.mainMenu} onKeyDown={trap}>
        <div className="mm-head">
          <Link href="/" className="mm-brand" onClick={close} aria-label={t.home}>
            <img src={logoUrl || '/img/emblem.png'} alt="" />
            <span>
              <small>{kicker || t.kicker}</small>
              <strong>{(shortName || t.orgShort).replace(/\s*\n\s*/g, ' ')}</strong>
            </span>
          </Link>
          {/* кнопки стовпчиком: зверху «закрити», під нею — контраст */}
          <div className="mm-head-btns">
            <button ref={closeBtn} type="button" className="mm-icon-btn" aria-label={t.close} onClick={close}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
            <button type="button" className="mm-icon-btn" aria-label={t.contrast} aria-pressed={contrast} onClick={onContrast}>
              <svg className="ti ti-contrast" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>

        <form className="mm-search" action="/search" role="search" onSubmit={() => onClose()}>
          <input type="search" name="q" placeholder={t.searchPlaceholder} aria-label={t.search} />
          <button type="submit" aria-label={t.searchButton}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.5 4.5" />
            </svg>
          </button>
        </form>

        <nav className="mm-nav" aria-label={t.mainMenu}>
          <ul>
            <li className="mm-item">{link('/', t.breadcrumbHome, `mm-row${pathname === '/' ? ' is-active' : ''}`)}</li>
            {menu.map((m, i) => {
              const kids = m.children || []
              const open_ = expanded === i
              const activeHere = isActive(m.url) || kids.some((c) => isActive(c.url))
              if (!kids.length) return <li key={m.id || m.label} className="mm-item">{link(m.url || '#', m.label, `mm-row${activeHere ? ' is-active' : ''}`)}</li>
              const id = `mm-sub-${i}`
              return (
                <li key={m.id || m.label} className={`mm-item${open_ ? ' is-open' : ''}`}>
                  <div className={`mm-row-wrap${activeHere ? ' is-active' : ''}`}>
                    {m.url ? (
                      link(m.url, m.label, 'mm-row')
                    ) : (
                      <button type="button" className="mm-row" aria-expanded={open_} aria-controls={id} onClick={() => setExpanded(open_ ? null : i)}>
                        {m.label}
                      </button>
                    )}
                    <button
                      type="button"
                      className="mm-toggle"
                      aria-expanded={open_}
                      aria-controls={id}
                      aria-label={`${m.label}: ${open_ ? t.close : t.menu}`}
                      onClick={() => setExpanded(open_ ? null : i)}
                      tabIndex={m.url ? 0 : -1}
                    >
                      <Chevron />
                    </button>
                  </div>
                  <div className="mm-sub" id={id}>
                    <ul>
                      {kids.map((c) => (
                        <li key={c.id || c.label}>{link(c.url || '#', c.label, `mm-sub-link${isActive(c.url) ? ' is-active' : ''}`)}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="mm-tools">
          <div className="mm-seg" role="group" aria-label={t.fontBigger}>
            <button type="button" aria-label={t.fontSmaller} onClick={() => onFont(-1)}>
              A−
            </button>
            <button type="button" aria-label={t.fontBigger} onClick={() => onFont(1)}>
              A+
            </button>
          </div>
          <div className="mm-seg" role="group" aria-label={t.language}>
            {(['uk', 'en'] as const).map((code) => (
              <button key={code} type="button" lang={code} aria-pressed={code === locale} className={code === locale ? 'on' : undefined} onClick={() => onLang(code)}>
                {code === 'uk' ? 'UA' : 'EN'}
              </button>
            ))}
          </div>
        </div>

        {contacts.socials.length > 0 && (
          <div className="mm-socials">
            {contacts.socials.map((s, i) =>
              s.url ? (
                <a key={i} href={safeHref(s.url)} target="_blank" rel="noopener noreferrer" className="mm-social">
                  <span className="mm-c-ico mm-s-ico">
                    <SocialIcon network={s.network} />
                  </span>
                  <span className="mm-s-text">{s.label || s.network}</span>
                  <span className="sr-only"> {t.newTab}</span>
                </a>
              ) : null,
            )}
          </div>
        )}

        {hasContacts && (
          <div className="mm-contacts">
            {contacts.hotline && (
              <a className="mm-contact mm-hot" href={`tel:${contacts.hotline.replace(/[^\d+]/g, '')}`}>
                <span className="mm-c-ico">
                  <PhoneIcon />
                </span>
                <span className="mm-c-text">
                  <strong>{contacts.hotline}</strong>
                  {contacts.hotlineNote && <small>{contacts.hotlineNote}</small>}
                </span>
              </a>
            )}
            {/* друга гаряча лінія — така сама жовта кнопка */}
            <a className="mm-contact mm-hot" href="tel:1648">
              <span className="mm-c-ico">
                <PhoneIcon />
              </span>
              <span className="mm-c-text">
                <strong>1648</strong>
                <small>{t.mmHot2Note}</small>
              </span>
            </a>
            {contacts.phones.map((p, i) => {
              const ph = splitPhone(p)
              const body = (
                <>
                  <span className="mm-c-ico">
                    <PhoneIcon />
                  </span>
                  <span className="mm-c-text">
                    <strong>{ph.number}</strong>
                    {ph.note && <small>{ph.note}</small>}
                  </span>
                </>
              )
              return ph.tel ? (
                <a key={i} className="mm-contact" href={`tel:${ph.tel}`}>
                  {body}
                </a>
              ) : (
                <div key={i} className="mm-contact">
                  {body}
                </div>
              )
            })}
            {contacts.email && (
              <a className="mm-contact" href={`mailto:${contacts.email}`}>
                <span className="mm-c-ico">
                  <MailIcon />
                </span>
                <span className="mm-c-text">
                  <strong className="mm-email">
                    {contacts.email.split('@')[0]}@<wbr />
                    {contacts.email.split('@').slice(1).join('@').replace(/-/g, '‑') /* дефіс без розриву рядка */}
                  </strong>
                </span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
