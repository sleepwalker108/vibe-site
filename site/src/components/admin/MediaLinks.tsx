'use client'
import { useDocumentInfo } from '@payloadcms/ui'
import { useEffect, useState } from 'react'
import { absoluteUrl, copyText } from './copyText'

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

// Блок «Посилання на файл» у правій колонці сторінки файлу медіатеки
export const MediaLinks = () => {
  const { id, initialData, savedDocumentData } = useDocumentInfo()
  const doc = (savedDocumentData || initialData || {}) as MediaDoc
  const [usage, setUsage] = useState<Usage[] | null>(null)

  // Де використовується файл: обкладинки новин, відео (файл або обкладинка)
  useEffect(() => {
    if (!id) return
    const q = (path: string) => fetch(path, { credentials: 'include' }).then((r) => (r.ok ? r.json() : { docs: [] }))
    Promise.all([
      q(`/api/news?where[cover][equals]=${id}&depth=0&limit=50&select[title]=true&trash=false`),
      q(`/api/videos?where[or][0][file][equals]=${id}&where[or][1][poster][equals]=${id}&depth=0&limit=50&select[title]=true`),
    ])
      .then(([news, videos]) => {
        setUsage([
          ...news.docs.map((d: any) => ({ label: `Новина: ${d.title || '(без назви)'}`, href: `/admin/collections/news/${d.id}` })),
          ...videos.docs.map((d: any) => ({ label: `Відео: ${d.title || '(без назви)'}`, href: `/admin/collections/videos/${d.id}` })),
        ])
      })
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

  const full = absoluteUrl(doc.url)
  const isImage = doc.mimeType?.startsWith('image/')
  const sizes = Object.entries(doc.sizes || {}).filter(([, s]) => s?.url)
  const snippet = isImage
    ? `<img src="${full}" alt="${(doc.alt || '').replace(/"/g, '&quot;')}">`
    : `<a href="${full}">${doc.filename || 'Завантажити файл'}</a>`

  return (
    <div className="media-links">
      <style>{CSS}</style>
      <div className="ml-title">Посилання на файл</div>

      <CopyRow label="Повна адреса" value={full} />
      <div className="ml-actions">
        <a className="ml-btn" href={full} target="_blank" rel="noopener noreferrer">
          Відкрити ↗
        </a>
        <a className="ml-btn" href={full} download={doc.filename || true}>
          Завантажити ↓
        </a>
      </div>

      {isImage &&
        sizes.map(([name, s]) => (
          <CopyRow key={name} label={`${SIZE_NAMES[name] || name}${s?.width ? ` · ${s.width}×${s.height}` : ''}`} value={absoluteUrl(s!.url)} />
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
        <p className="ml-note">Не знайдено серед обкладинок новин і відео. Файл може бути вставлено посиланням у текст сторінки.</p>
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
