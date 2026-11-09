'use client'
import { useDocumentInfo } from '@payloadcms/ui'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { absoluteUrl, copyText, useOrigin } from './copyText'

type MediaDoc = {
  url?: string | null
  filename?: string | null
  mimeType?: string | null
  filesize?: number | null
  width?: number | null
  height?: number | null
  alt?: string | null
  sizes?: Record<string, { url?: string | null; width?: number | null; height?: number | null } | undefined>
}
type Usage = { label: string; href: string }

const SIZE_NAMES: Record<string, string> = { card: 'Для карток (800 px)', wide: 'На всю ширину (1600 px)' }

const fmtSize = (b?: number | null) =>
  !b ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} МБ` : `${Math.max(1, Math.round(b / 1024))} КБ`

// Рядок «адреса + кнопка Копіювати»
const CopyRow = ({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) => {
  const [done, setDone] = useState(false)
  return (
    <div className="ml-row">
      <div className="ml-label">{label}</div>
      <div className="ml-field">
        <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className={mono ? 'mono' : undefined} />
        <button
          type="button"
          className={`ml-copy${done ? ' done' : ''}`}
          onClick={async () => {
            if (await copyText(value)) {
              setDone(true)
              setTimeout(() => setDone(false), 1600)
            }
          }}
        >
          {done ? '✓' : 'Копіювати'}
        </button>
      </div>
    </div>
  )
}

// Відео: у верхньому блоці файлу Payload показує лише значок — ставимо туди плеєр, щоб відео можна було
// запустити прямо на сторінці (без нової вкладки). Блок належить Payload, тому вставляємо плеєр порталом.
const TopVideoPreview = ({ src }: { src: string }) => {
  const [box, setBox] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const find = () => {
      const el = document.querySelector<HTMLElement>('.file-details .file-details__thumbnail')
      if (el) setBox(el)
      return Boolean(el)
    }
    if (find()) return
    const obs = new MutationObserver(() => find() && obs.disconnect())
    obs.observe(document.body, { childList: true, subtree: true })
    return () => obs.disconnect()
  }, [])
  useEffect(() => {
    if (!box) return
    box.classList.add('has-video')
    return () => box.classList.remove('has-video')
  }, [box])
  if (!box) return null
  return createPortal(
    <>
      <style>{TOP_VIDEO_CSS}</style>
      <video className="top-video" src={src} controls playsInline preload="metadata" />
    </>,
    box,
  )
}

const TOP_VIDEO_CSS = `
.file-details__thumbnail.has-video { position: relative; width: min(560px, 100%); max-width: none; height: auto; min-height: 0; max-height: none; align-self: flex-start; aspect-ratio: 16 / 9; padding: 0; background: #000; }
.file-details__thumbnail.has-video > :not(video):not(style) { display: none; }
.file-details__thumbnail.has-video .top-video { position: static; display: block; width: 100%; height: 100%; object-fit: contain; background: #000; }
`

// PDF: перегляд документа прямо на сторінці файлу — великим вікном одразу під верхнім блоком файлу
// (вбудований переглядач браузера: гортання, масштаб, пошук). Блок належить Payload, тому вставляємо порталом.
const PdfPreview = ({ src, name }: { src: string; name: string }) => {
  const [box, setBox] = useState<HTMLElement | null>(null)
  useEffect(() => {
    let holder: HTMLElement | null = null
    const find = () => {
      const top = document.querySelector<HTMLElement>('.file-details')
      if (!top) return false
      holder = document.createElement('div')
      holder.className = 'pdf-preview-holder'
      top.insertAdjacentElement('afterend', holder)
      setBox(holder)
      return true
    }
    if (find()) return () => holder?.remove()
    const obs = new MutationObserver(() => find() && obs.disconnect())
    obs.observe(document.body, { childList: true, subtree: true })
    return () => {
      obs.disconnect()
      holder?.remove()
    }
  }, [])
  // згорнуто чи ні — запам'ятовується в браузері для всіх PDF; згорнутий перегляд файл не вантажить
  const [open, setOpen] = useState(true)
  useEffect(() => {
    try {
      if (localStorage.getItem('pdf-preview-collapsed') === '1') setOpen(false)
    } catch {}
  }, [])
  const toggle = () =>
    setOpen((v) => {
      try {
        localStorage.setItem('pdf-preview-collapsed', v ? '1' : '0')
      } catch {}
      return !v
    })
  if (!box) return null
  return createPortal(
    <div className={`pdf-preview${open ? '' : ' is-collapsed'}`}>
      <style>{PDF_CSS}</style>
      <div className="pdf-preview__bar">
        <button type="button" className="pdf-preview__toggle" onClick={toggle} aria-expanded={open}>
          <span className="pdf-preview__caret" aria-hidden="true">▾</span>
          Перегляд документа
        </button>
        <span className="pdf-preview__actions">
          <button type="button" onClick={toggle}>
            {open ? 'Згорнути' : 'Розгорнути'}
          </button>
          <a href={src} target="_blank" rel="noopener noreferrer">
            Відкрити в новій вкладці ↗
          </a>
        </span>
      </div>
      {open && <iframe src={src} title={`Перегляд: ${name}`} />}
    </div>,
    box,
  )
}

const PDF_CSS = `
.pdf-preview { margin: 16px 0 24px; border: 1px solid var(--theme-elevation-150); border-radius: 10px; overflow: hidden; background: var(--theme-elevation-50); }
.pdf-preview__bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; font-size: 13px; font-weight: 600; border-bottom: 1px solid var(--theme-elevation-150); }
.pdf-preview.is-collapsed .pdf-preview__bar { border-bottom: 0; }
.pdf-preview__toggle { display: inline-flex; align-items: center; gap: 6px; padding: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; }
.pdf-preview__caret { display: inline-block; font-size: 11px; transition: transform .2s; }
.pdf-preview.is-collapsed .pdf-preview__caret { transform: rotate(-90deg); }
.pdf-preview__actions { display: flex; gap: 6px; }
.pdf-preview__actions a, .pdf-preview__actions button { font: inherit; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--theme-elevation-250); background: none; text-decoration: none; color: inherit; cursor: pointer; }
.pdf-preview__actions a:hover, .pdf-preview__actions button:hover { border-color: var(--theme-elevation-500); }
.pdf-preview iframe { display: block; width: 100%; height: min(78vh, 900px); border: 0; background: #525659; }
`

// Блок «Посилання на файл» у правій колонці сторінки файлу медіатеки
export const MediaLinks = () => {
  const { id, initialData, savedDocumentData } = useDocumentInfo()
  const doc = (savedDocumentData || initialData || {}) as MediaDoc
  const [usage, setUsage] = useState<Usage[] | null>(null)
  const origin = useOrigin()

  // Де використовується файл — уся база: поля-файли, файли й посилання в текстах, головна, меню (lib/mediaUsage.ts)
  useEffect(() => {
    if (!id) return
    fetch(`/api/media-usage?ids=${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((res: Record<string, { label: string; title?: string; href: string }[]>) =>
        setUsage((res[String(id)] || []).map((u) => ({ label: u.title ? `${u.label}: ${u.title}` : u.label, href: u.href }))),
      )
      .catch(() => setUsage([]))
  }, [id])

  if (!id || !doc.url) {
    return (
      <div className="media-links">
        <style>{CSS}</style>
        <div className="ml-title">Посилання на файл</div>
        <p className="ml-note">З’явиться після завантаження й збереження файлу.</p>
      </div>
    )
  }

  const full = absoluteUrl(doc.url, origin)
  const isImage = doc.mimeType?.startsWith('image/')
  const sizes = Object.entries(doc.sizes || {}).filter(([, s]) => s?.url)
  const snippet = isImage
    ? `<img src="${full}" alt="${(doc.alt || '').replace(/"/g, '&quot;')}">`
    : `<a href="${full}">${doc.filename || 'Завантажити файл'}</a>`

  return (
    <div className="media-links">
      <style>{CSS}</style>
      {/* відео: плеєр у верхньому блоці файлу (замість значка Payload) */}
      {doc.mimeType?.startsWith('video/') && <TopVideoPreview src={doc.url} />}
      {/* PDF: перегляд документа під верхнім блоком файлу */}
      {doc.mimeType === 'application/pdf' && <PdfPreview src={doc.url} name={doc.filename || 'PDF'} />}
      <div className="ml-title">Посилання на файл</div>

      <CopyRow label="Повна адреса" value={full} />
      <div className="ml-actions">
        <a className="ml-btn" href={full} target="_blank" rel="noopener noreferrer">
          Відкрити в новій вкладці ↗
        </a>
        <a className="ml-btn" href={full} download={doc.filename || true}>
          Завантажити ↓
        </a>
      </div>

      {isImage &&
        sizes.map(([name, s]) => (
          <CopyRow key={name} label={`${SIZE_NAMES[name] || name}${s?.width ? ` · ${s.width}×${s.height}` : ''}`} value={absoluteUrl(s!.url, origin)} />
        ))}

      <CopyRow label={isImage ? 'Код для вставки (HTML)' : 'Посилання для вставки (HTML)'} value={snippet} />

      <dl className="ml-info">
        {doc.mimeType && (
          <>
            <dt>Тип</dt>
            <dd>{doc.mimeType}</dd>
          </>
        )}
        {doc.filesize ? (
          <>
            <dt>Розмір</dt>
            <dd>{fmtSize(doc.filesize)}</dd>
          </>
        ) : null}
        {doc.width && doc.height ? (
          <>
            <dt>Розміри</dt>
            <dd>
              {doc.width}×{doc.height} px
            </dd>
          </>
        ) : null}
      </dl>

      <div className="ml-sub">Де використовується</div>
      {usage === null ? (
        <p className="ml-note">Перевіряю…</p>
      ) : usage.length ? (
        <ul className="ml-usage">
          {usage.map((u) => (
            <li key={u.href}>
              <a href={u.href}>{u.label}</a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ml-note">Ніде на сайті не використовується — його можна безпечно видалити.</p>
      )}
    </div>
  )
}

const CSS = `
.media-links { margin: 0 0 24px; padding: 14px; border: 1px solid var(--theme-elevation-150); border-radius: 10px; }
.ml-title { font-weight: 600; margin-bottom: 10px; }
.ml-sub { font-weight: 600; margin: 14px 0 6px; font-size: 13px; }
.ml-row { margin-bottom: 10px; }
.ml-label { font-size: 12px; color: var(--theme-elevation-600); margin-bottom: 4px; }
.ml-field { display: flex; gap: 6px; }
.ml-field input { flex: 1; min-width: 0; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--theme-elevation-200); background: var(--theme-elevation-50); color: inherit; font-size: 12px; }
.ml-field input.mono { font-family: ui-monospace, Consolas, monospace; }
.ml-copy { flex: none; padding: 6px 10px; border-radius: 6px; border: 0; background: #ffd500; color: #0a2440; font-weight: 600; font-size: 12px; cursor: pointer; min-width: 84px; }
.ml-copy.done { background: #2f9e5f; color: #fff; }
.ml-actions { display: flex; gap: 6px; margin: -2px 0 12px; }
.ml-btn { font-size: 12px; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--theme-elevation-250); text-decoration: none; color: inherit; }
.ml-btn:hover { border-color: var(--theme-elevation-500); }
.ml-info { display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; margin: 4px 0 0; font-size: 12px; }
.ml-info dt { color: var(--theme-elevation-500); }
.ml-info dd { margin: 0; word-break: break-all; }
.ml-usage { margin: 0; padding-left: 16px; font-size: 12px; display: grid; gap: 3px; }
.ml-note { margin: 0; font-size: 12px; color: var(--theme-elevation-600); line-height: 1.45; }
`
