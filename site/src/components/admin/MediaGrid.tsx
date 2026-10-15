'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MediaDrop } from './MediaDrop'

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

type Usage = { label: string; title?: string; href: string }

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
  // видалення: вибрані плитки, вікно підтвердження (з переліком, де файли використовуються), повідомлення
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirm, setConfirm] = useState<{ ids: number[]; usage: Record<string, Usage[]> | null; busy: boolean; error: string } | null>(null)
  const [notice, setNotice] = useState('')

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

  // після завантаження нових файлів — оновити і плитки, і стандартну таблицю
  const router = useRouter()

  const toggle = (id: number) =>
    setSelected((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  // спершу дізнаємось, де файли використовуються, — і показуємо це в підтвердженні
  const askDelete = async (ids: number[]) => {
    setNotice('')
    setConfirm({ ids, usage: null, busy: false, error: '' })
    try {
      const r = await fetch(`/api/media-usage?ids=${ids.join(',')}`, { credentials: 'include' })
      const usage = r.ok ? ((await r.json()) as Record<string, Usage[]>) : {}
      setConfirm((c) => (c ? { ...c, usage } : c))
    } catch {
      setConfirm((c) => (c ? { ...c, usage: {} } : c))
    }
  }
  // у кошик (як кнопка «Видалити» в Payload): файл зникає з сайту, але його можна відновити
  const doDelete = async () => {
    if (!confirm) return
    setConfirm({ ...confirm, busy: true, error: '' })
    const where = confirm.ids.map((id, i) => `where[id][in][${i}]=${id}`).join('&')
    try {
      const r = await fetch(`/api/media?${where}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ deletedAt: new Date().toISOString() }),
      })
      if (!r.ok) throw new Error(`Помилка ${r.status}`)
      const gone = new Set(confirm.ids)
      setDocs((list) => list.filter((d) => !gone.has(d.id)))
      setTotal((n) => Math.max(0, n - gone.size))
      setSelected(new Set())
      setConfirm(null)
      setNotice(`Переміщено в кошик: ${gone.size}.`)
      router.refresh()
    } catch (e) {
      setConfirm((c) => (c ? { ...c, busy: false, error: (e as Error).message } : c))
    }
  }
  const onUploaded = useCallback(() => {
    if (view === 'grid') load(1)
    router.refresh()
  }, [view, load, router])

  return (
    <div className="mg">
      <style>{CSS}</style>
      {/* у режимі плиток стандартна таблиця, її пошук і сторінки ховаються */}
      {view === 'grid' && (
        <style>{`.collection-list__tables, .collection-list .page-controls, .collection-list .list-controls { display: none !important; }`}</style>
      )}
      <MediaDrop onUploaded={onUploaded} />
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
          {notice && (
            <p className="mg-notice">
              {notice} Відновити можна в <a href="/admin/collections/media/trash">кошику медіатеки</a>.
            </p>
          )}
          {!!selected.size && (
            <div className="mg-selbar">
              <b>Вибрано: {selected.size}</b>
              <button type="button" className="mg-danger" onClick={() => askDelete([...selected])}>
                Видалити вибрані
              </button>
              <button type="button" className="mg-plain" onClick={() => setSelected(new Set(docs.map((d) => d.id)))}>
                Вибрати всі показані
              </button>
              <button type="button" className="mg-plain" onClick={() => setSelected(new Set())}>
                Скасувати вибір
              </button>
            </div>
          )}
          {error && <p className="mg-error">{error}</p>}
          {!loading && !docs.length && !error && <p className="mg-empty">Нічого не знайдено.</p>}
          <ul className="mg-grid">
            {docs.map((d) => {
              const k = kind(d.mimeType)
              const thumb = k === 'image' ? d.sizes?.card?.url || d.url : null
              return (
                <li key={d.id} className={`mg-item${selected.has(d.id) ? ' is-selected' : ''}${selected.size ? ' selecting' : ''}`}>
                  <button
                    type="button"
                    className="mg-check"
                    aria-label={`Вибрати ${d.filename}`}
                    aria-pressed={selected.has(d.id)}
                    onClick={() => toggle(d.id)}
                  >
                    {selected.has(d.id) ? '✓' : ''}
                  </button>
                  <button type="button" className="mg-del" aria-label={`Видалити ${d.filename}`} title="Видалити" onClick={() => askDelete([d.id])}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
                    </svg>
                  </button>
                  <a
                    href={`/admin/collections/media/${d.id}`}
                    className="mg-tile"
                    title={d.filename || ''}
                    onClick={(e) => {
                      // у режимі вибору клік по плитці вибирає її, а не відкриває
                      if (selected.size) {
                        e.preventDefault()
                        toggle(d.id)
                      }
                    }}
                  >
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
          {confirm && (
            <div className="mg-modal" role="dialog" aria-modal="true" aria-labelledby="mg-del-title">
              <div className="mg-modal-box">
                <h3 id="mg-del-title">
                  {confirm.ids.length === 1
                    ? `Видалити «${docs.find((d) => d.id === confirm.ids[0])?.filename || 'файл'}»?`
                    : `Видалити вибрані файли (${confirm.ids.length})?`}
                </h3>
                {confirm.usage === null ? (
                  <p className="mg-muted">Перевіряю, де використовуються файли…</p>
                ) : confirm.ids.some((id) => confirm.usage?.[String(id)]?.length) ? (
                  <div className="mg-warn">
                    <b>⚠ {confirm.ids.length === 1 ? 'Цей файл використовується' : 'Ці файли використовуються'} на сайті — після видалення там зникне картинка, відео чи документ:</b>
                    <ul>
                      {confirm.ids
                        .filter((id) => confirm.usage?.[String(id)]?.length)
                        .map((id) => (
                          <li key={id}>
                            <span className="mg-wname">{docs.find((d) => d.id === id)?.filename || `#${id}`}</span>
                            {' — '}
                            {confirm.usage![String(id)].map((u, i) => (
                              <span key={u.href + i}>
                                {i > 0 && ', '}
                                <a href={u.href} target="_blank" rel="noopener noreferrer">
                                  {u.title ? `${u.label} «${u.title}»` : u.label}
                                </a>
                              </span>
                            ))}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mg-muted">{confirm.ids.length === 1 ? 'Файл ніде на сайті не використовується.' : 'Жоден із файлів на сайті не використовується.'}</p>
                )}
                <p className="mg-muted">{confirm.ids.length === 1 ? 'Файл потрапить' : 'Файли потраплять'} у кошик медіатеки — звідти їх можна відновити.</p>
                {confirm.error && <p className="mg-error">{confirm.error}</p>}
                <div className="mg-modal-btns">
                  <button type="button" className="mg-danger" disabled={confirm.busy || confirm.usage === null} onClick={doDelete}>
                    {confirm.busy ? 'Видаляю…' : 'Перемістити в кошик'}
                  </button>
                  <button type="button" className="mg-plain" disabled={confirm.busy} onClick={() => setConfirm(null)}>
                    Скасувати
                  </button>
                </div>
              </div>
            </div>
          )}
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
.mg-item { position: relative; }
.mg-check, .mg-del { position: absolute; z-index: 2; top: 12px; width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; cursor: pointer; opacity: 0; transition: opacity .15s; font: inherit; font-weight: 800; font-size: 14px; }
.mg-check { left: 12px; border: 2px solid #fff; background: rgba(0,0,0,.35); color: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.4); }
.mg-del { right: 12px; border: 0; background: rgba(0,0,0,.55); color: #fff; }
.mg-del svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.mg-del:hover { background: #c62828; }
.mg-item:hover .mg-check, .mg-item:hover .mg-del, .mg-item:focus-within .mg-check, .mg-item:focus-within .mg-del, .mg-item.selecting .mg-check { opacity: 1; }
.mg-item.is-selected .mg-check { background: #0057b8; border-color: #0057b8; opacity: 1; }
.mg-item.is-selected .mg-tile { border-color: #0057b8; box-shadow: 0 0 0 2px #0057b8; }
@media (hover: none) { .mg-check, .mg-del { opacity: 1; } }
.mg-selbar { position: sticky; top: 60px; z-index: 5; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 0 0 12px; padding: 10px 14px; border-radius: 12px; background: var(--theme-elevation-50); border: 1px solid var(--theme-elevation-150); font-size: 13px; }
.mg-selbar b { margin-right: auto; }
.mg-danger, .mg-plain { font: inherit; font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 999px; cursor: pointer; }
.mg-danger { border: 0; background: #c62828; color: #fff; }
.mg-danger:disabled { opacity: .6; cursor: progress; }
.mg-plain { border: 1px solid var(--theme-elevation-250); background: transparent; color: inherit; }
.mg-notice { margin: 0 0 12px; padding: 10px 14px; border-radius: 10px; background: var(--theme-elevation-50); border-left: 3px solid #2f9e5f; font-size: 13px; }
.mg-modal { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 16px; background: rgba(0,0,0,.45); }
.mg-modal-box { width: min(560px, 100%); max-height: 85vh; overflow-y: auto; background: var(--theme-elevation-0); color: var(--theme-elevation-1000); border: 1px solid var(--theme-elevation-150); border-radius: 16px; padding: 20px 22px; box-shadow: 0 20px 60px rgba(0,0,0,.35); display: grid; gap: 12px; }
.mg-modal-box h3 { margin: 0; font-size: 17px; overflow-wrap: anywhere; }
.mg-muted { margin: 0; font-size: 13px; color: var(--theme-elevation-600); }
.mg-warn { padding: 12px 14px; border-radius: 10px; background: rgba(224, 168, 0, .12); border-left: 3px solid #e0a800; font-size: 13px; }
.mg-warn ul { margin: 8px 0 0; padding-left: 18px; display: grid; gap: 4px; }
.mg-wname { font-weight: 600; overflow-wrap: anywhere; }
.mg-modal-btns { display: flex; gap: 10px; flex-wrap: wrap; }
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
