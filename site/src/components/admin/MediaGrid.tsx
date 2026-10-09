'use client'
import { useCallback, useEffect, useState } from 'react'

// Медіатека «плитками», як у WordPress: перемикач «Плитки / Список» над таблицею,
// фільтр за типом файлу, сортування й пошук за назвою. Вибір вигляду запам’ятовується в браузері.
type Doc = {
  id: number
  filename?: string | null
  alt?: string | null
  mimeType?: string | null
  filesize?: number | null
  url?: string | null
  width?: number | null
  height?: number | null
  createdAt?: string
  sizes?: { card?: { url?: string | null } | null } | null
}

const TYPES: { value: string; label: string; mimes?: string[] }[] = [
  { value: 'all', label: 'Усі файли' },
  { value: 'image', label: 'Зображення', mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'] },
  { value: 'pdf', label: 'PDF', mimes: ['application/pdf'] },
  {
    value: 'doc',
    label: 'Word і Excel',
    mimes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
  { value: 'video', label: 'Відео', mimes: ['video/mp4', 'video/webm'] },
]

const SORTS = [
  { value: '-createdAt', label: 'Спершу нові' },
  { value: 'createdAt', label: 'Спершу старі' },
  { value: 'mimeType', label: 'За типом файлу' },
  { value: 'filename', label: 'За назвою (А–Я)' },
  { value: '-filesize', label: 'Спершу великі' },
]

const PAGE = 60
const KEY = 'nartu-media-view'

const size = (b?: number | null) =>
  !b ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} КБ` : `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`

const kind = (m?: string | null) =>
  !m ? 'file' : m.startsWith('image/') ? 'image' : m === 'application/pdf' ? 'pdf' : m.startsWith('video/') ? 'video' : /sheet|excel/.test(m) ? 'xls' : /word/.test(m) ? 'doc' : 'file'

const ext = (name?: string | null) => (name?.split('.').pop() || '').toUpperCase().slice(0, 4)

export const MediaGrid = () => {
  const [view, setView] = useState<'grid' | 'list'>('list')
  const [type, setType] = useState('all')
  const [sort, setSort] = useState('-createdAt')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [docs, setDocs] = useState<Doc[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // вигляд, вибраний минулого разу
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === 'grid') setView('grid')
    } catch {}
  }, [])
  const choose = (v: 'grid' | 'list') => {
    setView(v)
    try {
      localStorage.setItem(KEY, v)
    } catch {}
  }

  // пошук — через пів секунди після останньої набраної літери
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 400)
    return () => clearTimeout(t)
  }, [q])

  const load = useCallback(
    async (p: number) => {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({ limit: String(PAGE), page: String(p), sort, depth: '0' })
      const mimes = TYPES.find((t) => t.value === type)?.mimes
      if (mimes) params.set('where[and][0][mimeType][in]', mimes.join(','))
      if (query) params.set('where[and][1][filename][like]', query)
      try {
        const r = await fetch(`/api/media?${params}`, { credentials: 'include' })
        if (!r.ok) throw new Error(`Помилка ${r.status}`)
        const data = (await r.json()) as { docs: Doc[]; totalDocs: number; hasNextPage: boolean }
        setDocs((prev) => (p === 1 ? data.docs : [...prev, ...data.docs]))
        setTotal(data.totalDocs)
        setHasMore(data.hasNextPage)
        setPage(p)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [sort, type, query],
  )

  useEffect(() => {
    if (view === 'grid') load(1)
  }, [view, load])

  return (
    <div className="mg">
      <style>{CSS}</style>
      {/* у режимі плиток стандартна таблиця, її пошук і сторінки ховаються */}
      {view === 'grid' && (
        <style>{`.collection-list__tables, .collection-list .page-controls, .collection-list .list-controls { display: none !important; }`}</style>
      )}
      <div className="mg-bar">
        <div className="mg-toggle" role="group" aria-label="Вигляд медіатеки">
          <button type="button" className={view === 'grid' ? 'on' : ''} aria-pressed={view === 'grid'} onClick={() => choose('grid')}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="1" y="1" width="6" height="6" rx="1" />
              <rect x="9" y="1" width="6" height="6" rx="1" />
              <rect x="1" y="9" width="6" height="6" rx="1" />
              <rect x="9" y="9" width="6" height="6" rx="1" />
            </svg>
            Плитки
          </button>
          <button type="button" className={view === 'list' ? 'on' : ''} aria-pressed={view === 'list'} onClick={() => choose('list')}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="1" y="2" width="14" height="2.4" rx="1" />
              <rect x="1" y="6.8" width="14" height="2.4" rx="1" />
              <rect x="1" y="11.6" width="14" height="2.4" rx="1" />
            </svg>
            Список
          </button>
        </div>
        {view === 'grid' && (
          <>
            <div className="mg-types" role="group" aria-label="Тип файлу">
              {TYPES.map((t) => (
                <button key={t.value} type="button" className={type === t.value ? 'on' : ''} aria-pressed={type === t.value} onClick={() => setType(t.value)}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mg-tools">
              <input type="search" placeholder="Пошук за назвою файлу…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Пошук за назвою файлу" />
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Сортування">
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {view === 'grid' && (
        <>
          <p className="mg-count">{loading && !docs.length ? 'Завантаження…' : `Файлів: ${total}`}</p>
          {error && <p className="mg-error">{error}</p>}
          {!loading && !docs.length && !error && <p className="mg-empty">Нічого не знайдено.</p>}
          <ul className="mg-grid">
            {docs.map((d) => {
              const k = kind(d.mimeType)
              const thumb = k === 'image' ? d.sizes?.card?.url || d.url : null
              return (
                <li key={d.id}>
                  <a href={`/admin/collections/media/${d.id}`} className="mg-tile" title={d.filename || ''}>
                    <span className={`mg-thumb mg-${k}`}>
                      {thumb ? (
                        <img src={thumb} alt={d.alt || ''} loading="lazy" />
                      ) : (
                        <span className="mg-icon">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            {k === 'video' ? (
                              <path d="M8 5.5v13l10.5-6.5z" />
                            ) : (
                              <path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1.5V8h4.5" />
                            )}
                          </svg>
                          <b>{ext(d.filename) || 'ФАЙЛ'}</b>
                        </span>
                      )}
                    </span>
                    <span className="mg-name">{d.filename}</span>
                    <span className="mg-meta">
                      {size(d.filesize)}
                      {d.width && d.height ? ` · ${d.width}×${d.height}` : ''}
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
          {hasMore && (
            <button type="button" className="mg-more" disabled={loading} onClick={() => load(page + 1)}>
              {loading ? 'Завантаження…' : `Показати ще (${total - docs.length})`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

const CSS = `
.mg { margin: 0 0 16px; }
.mg-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; }
.mg-toggle, .mg-types { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--theme-elevation-150); border-radius: 999px; padding: 3px; gap: 2px; }
.mg-toggle button, .mg-types button { display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent; color: inherit; font: inherit; font-size: 13px; font-weight: 600; padding: 6px 13px; border-radius: 999px; cursor: pointer; }
.mg-toggle button:hover, .mg-types button:hover { background: var(--theme-elevation-50); }
.mg-toggle button.on, .mg-types button.on { background: var(--theme-elevation-1000); color: var(--theme-elevation-0); }
.mg-toggle svg { width: 14px; height: 14px; fill: currentColor; }
.mg-tools { display: inline-flex; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.mg-tools input, .mg-tools select { font: inherit; font-size: 13px; padding: 7px 12px; border-radius: 8px; border: 1px solid var(--theme-elevation-150); background: var(--theme-input-bg, var(--theme-elevation-0)); color: inherit; }
.mg-tools input { min-width: 220px; }
.mg-count, .mg-empty, .mg-error { font-size: 13px; color: var(--theme-elevation-600); margin: 0 0 10px; }
.mg-error { color: var(--theme-error-500, #c2410c); }
.mg-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
.mg-tile { display: flex; flex-direction: column; gap: 4px; text-decoration: none; color: inherit; border: 1px solid var(--theme-elevation-150); border-radius: 10px; padding: 6px 6px 8px; background: var(--theme-elevation-0); transition: border-color .15s, box-shadow .15s; }
.mg-tile:hover, .mg-tile:focus-visible { border-color: var(--theme-elevation-400); box-shadow: 0 4px 14px rgba(0,0,0,.1); outline: none; }
.mg-thumb { display: grid; place-items: center; aspect-ratio: 1; border-radius: 6px; overflow: hidden; background: var(--theme-elevation-50); }
.mg-thumb img { width: 100%; height: 100%; object-fit: cover; }
.mg-icon { display: grid; justify-items: center; gap: 4px; }
.mg-icon svg { width: 44px; height: 44px; fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linejoin: round; }
.mg-video .mg-icon svg { fill: currentColor; stroke: none; }
.mg-icon b { font-size: 12px; letter-spacing: .05em; }
.mg-pdf .mg-icon { color: #c62828; } .mg-doc .mg-icon { color: #1e5bb8; } .mg-xls .mg-icon { color: #1d7a45; } .mg-video .mg-icon { color: #7b3fbf; }
html[data-theme='dark'] .mg-pdf .mg-icon { color: #ff8a80; } html[data-theme='dark'] .mg-doc .mg-icon { color: #8ab4ff; }
html[data-theme='dark'] .mg-xls .mg-icon { color: #6fd39b; } html[data-theme='dark'] .mg-video .mg-icon { color: #c9a3ff; }
.mg-name { font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 2px; }
.mg-meta { font-size: 11px; color: var(--theme-elevation-500); padding: 0 2px; }
.mg-more { display: block; margin: 18px auto 0; font: inherit; font-size: 13px; font-weight: 600; padding: 9px 20px; border-radius: 999px; border: 1px solid var(--theme-elevation-250); background: transparent; color: inherit; cursor: pointer; }
.mg-more:hover { background: var(--theme-elevation-50); }
@media (max-width: 700px) { .mg-tools { margin-left: 0; width: 100%; } .mg-tools input { min-width: 0; flex: 1; } .mg-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); } }
`
