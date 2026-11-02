'use client'
import { DefaultCell, Link, useConfig, useListDrawerContext } from '@payloadcms/ui'
import type { DefaultCellComponentProps } from 'payload'

// Колонка «Назва файлу» у вигляді «Список» медіатеки: для відео замість значка — кадр із відео
// (браузер вантажить лише початок файлу), як у вигляді «Плитки». Решта файлів — стандартна комірка Payload.
// Клік, як і в стандартній комірці: відкриває картку файлу, а у вікні «Обрати з існуючих» — вибирає файл.
type Row = { id?: number | string; url?: string | null; mimeType?: string | null }

export const MediaFilenameCell = (rawProps: DefaultCellComponentProps) => {
  const { drawerSlug, onSelect } = useListDrawerContext()
  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig()

  // у вікні «Обрати з існуючих» клік по назві вибирає файл, а не відкриває його (як у стандартній комірці Payload)
  const inDrawer = Boolean(drawerSlug) && (rawProps as { link?: boolean }).link !== false
  const props = (
    inDrawer
      ? {
          ...rawProps,
          className: 'default-cell__first-cell',
          link: false,
          onClick: ({ rowData: r }: { rowData: Record<string, unknown> }) =>
            typeof onSelect === 'function' && onSelect({ collectionSlug: 'media', doc: r as never, docID: r.id as never }),
        }
      : rawProps
  ) as DefaultCellComponentProps & { link?: boolean; linkURL?: string; viewType?: string }
  const { cellData, rowData, link, linkURL, onClick, viewType } = props
  const row = (rowData || {}) as Row

  if (!row.mimeType?.startsWith('video/') || !row.url) return <DefaultCell {...props} />

  const content = (
    <div className="file">
      <span className="file__thumbnail thumbnail thumbnail--size-small mfc-video">
        <video src={`${row.url}#t=0.5`} preload="metadata" muted playsInline tabIndex={-1} />
        <span className="mfc-play" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M8 5.5v13l10.5-6.5z" />
          </svg>
        </span>
      </span>
      <span className="file__filename">{String(cellData ?? '')}</span>
      <style>{CSS}</style>
    </div>
  )

  if (typeof onClick === 'function') {
    return (
      <button type="button" className="mfc-btn" onClick={() => onClick({ cellData, collectionSlug: 'media', rowData })}>
        {content}
      </button>
    )
  }
  if (link) {
    const href = linkURL || `${adminRoute}/collections/media${viewType === 'trash' ? '/trash' : ''}/${encodeURIComponent(String(row.id))}`
    return (
      <Link href={href} prefetch={false}>
        {content}
      </Link>
    )
  }
  return content
}

const CSS = `
.mfc-video { position: relative; width: calc(var(--base) * 2); background: #000; }
.mfc-video video { width: 100%; height: 100%; object-fit: cover; pointer-events: none; display: block; }
.mfc-play { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; }
.mfc-play svg { width: 16px; height: 16px; fill: #fff; filter: drop-shadow(0 1px 2px rgba(0,0,0,.6)); }
.mfc-btn { all: unset; cursor: pointer; }
`
