'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

// Медіатека: файли можна просто перетягнути на сторінку (один чи багато одразу) або вибрати кілька
// кнопкою «Додати файли» — вони завантажуються самі, по кілька паралельно, з прогресом для кожного.
const ALLOWED = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4', 'video/webm',
]
const ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.avif,.pdf,.doc,.docx,.xls,.xlsx,.mp4,.webm'
const MAX = 300 * 1024 * 1024 // як client_max_body_size у nginx
const PARALLEL = 3

type Item = { id: number; file: File; progress: number; status: 'wait' | 'up' | 'ok' | 'err'; error?: string; docId?: number | string }

const size = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} КБ` : `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`)
const hasFiles = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes('Files')

// Один файл → POST /api/media (як кнопка «Створити»), з прогресом
const upload = (file: File, onProgress: (p: number) => void) =>
  new Promise<{ id?: number | string; error?: string }>((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/media')
    xhr.withCredentials = true
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onload = () => {
      let body: { doc?: { id: number | string }; errors?: { message?: string; data?: { errors?: { message?: string }[] } }[] } = {}
      try {
        body = JSON.parse(xhr.responseText)
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && body.doc) resolve({ id: body.doc.id })
      else {
        const e = body.errors?.[0]
        resolve({ error: e?.data?.errors?.[0]?.message || e?.message || (xhr.status === 413 ? 'Файл завеликий для сервера' : `Помилка ${xhr.status}`) })
      }
    }
    xhr.onerror = () => resolve({ error: 'Немає з’єднання з сервером' })
    const fd = new FormData()
    fd.append('file', file)
    fd.append('_payload', JSON.stringify({}))
    xhr.send(fd)
  })

export const MediaDrop = ({ onUploaded }: { onUploaded: () => void }) => {
  const [items, setItems] = useState<Item[]>([])
  const [dragging, setDragging] = useState(false)
  const [open, setOpen] = useState(true)
  const input = useRef<HTMLInputElement>(null)
  const nextId = useRef(1)
  const depth = useRef(0) // dragenter/dragleave спрацьовують на кожному вкладеному елементі

  const patch = (id: number, p: Partial<Item>) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...p } : it)))

  const add = useCallback(
    async (files: File[]) => {
      if (!files.length) return
      setOpen(true)
      const fresh: Item[] = files.map((file) => {
        const id = nextId.current++
        if (file.type && !ALLOWED.includes(file.type)) return { id, file, progress: 0, status: 'err', error: 'Такий тип файлу не дозволено' }
        if (file.size > MAX) return { id, file, progress: 0, status: 'err', error: `Більше ${size(MAX)}` }
        return { id, file, progress: 0, status: 'wait' }
      })
      setItems((list) => [...fresh, ...list])
      // черга: по PARALLEL файлів одночасно
      const queue = fresh.filter((it) => it.status === 'wait')
      let uploaded = 0
      const worker = async () => {
        for (let it = queue.shift(); it; it = queue.shift()) {
          const { id, file } = it
          patch(id, { status: 'up' })
          const r = await upload(file, (p) => patch(id, { progress: p }))
          if (r.id !== undefined) {
            uploaded++
            patch(id, { status: 'ok', progress: 1, docId: r.id })
          } else patch(id, { status: 'err', error: r.error })
        }
      }
      await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, worker))
      if (uploaded) onUploaded()
    },
    [onUploaded],
  )

  // Перетягування на будь-яке місце сторінки медіатеки
  useEffect(() => {
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth.current++
      setDragging(true)
    }
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault() // інакше браузер відкриє файл замість завантаження
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth.current = Math.max(0, depth.current - 1)
      if (!depth.current) setDragging(false)
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      // у вікні «Масове завантаження» Payload файли приймає сам
      if ((e.target as Element | null)?.closest?.('.drawer, .bulk-upload, [class*="bulk-upload"]')) return
      e.preventDefault()
      depth.current = 0
      setDragging(false)
      add([...(e.dataTransfer?.files || [])])
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [add])

  const busy = items.some((it) => it.status === 'wait' || it.status === 'up')
  const ok = items.filter((it) => it.status === 'ok').length
  const bad = items.filter((it) => it.status === 'err').length
  const total = items.length

  return (
    <>
      <style>{CSS}</style>
      <div className="md-zone">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        <span>
          <b>Перетягніть файли сюди</b> — один чи кілька одразу, вони завантажаться самі
        </span>
        <button type="button" className="md-btn" onClick={() => input.current?.click()}>
          Додати файли
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            add([...(e.target.files || [])])
            e.target.value = ''
          }}
        />
      </div>

      {!!total && (
        <div className="md-queue" aria-live="polite">
          <div className="md-qhead">
            <b>
              {busy ? `Завантаження… ${ok} з ${total}` : `Завантажено ${ok} з ${total}`}
              {bad ? ` · не вдалося: ${bad}` : ''}
            </b>
            <button type="button" className="md-link" onClick={() => setOpen((v) => !v)}>
              {open ? 'Згорнути' : 'Показати'}
            </button>
            {!busy && (
              <button type="button" className="md-link" onClick={() => setItems([])}>
                Очистити
              </button>
            )}
          </div>
          {open && (
            <ul>
              {items.map((it) => (
                <li key={it.id} className={`md-${it.status}`}>
                  <span className="md-name" title={it.file.name}>
                    {it.status === 'ok' && it.docId !== undefined ? <a href={`/admin/collections/media/${it.docId}`}>{it.file.name}</a> : it.file.name}
                  </span>
                  <span className="md-size">{size(it.file.size)}</span>
                  <span className="md-state">
                    {it.status === 'wait' && 'у черзі'}
                    {it.status === 'up' && `${Math.round(it.progress * 100)}%`}
                    {it.status === 'ok' && '✓ готово'}
                    {it.status === 'err' && `✕ ${it.error}`}
                  </span>
                  <span className="md-bar">
                    <i style={{ width: `${Math.round((it.status === 'ok' ? 1 : it.progress) * 100)}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {dragging && (
        <div className="md-overlay" aria-hidden="true">
          <div>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>
            <b>Відпустіть, щоб завантажити в медіатеку</b>
          </div>
        </div>
      )}
    </>
  )
}

const CSS = `
.md-zone { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 0 0 14px; padding: 14px 16px; border: 2px dashed var(--theme-elevation-250); border-radius: 12px; color: var(--theme-elevation-700); font-size: 13px; }
.md-zone svg { flex: none; color: var(--theme-elevation-500); }
.md-zone span { flex: 1 1 260px; }
.md-btn { flex: none; font: inherit; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 999px; border: 0; cursor: pointer; background: var(--theme-elevation-1000); color: var(--theme-elevation-0); }
.md-queue { margin: 0 0 16px; border: 1px solid var(--theme-elevation-150); border-radius: 12px; padding: 10px 14px; font-size: 13px; }
.md-qhead { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
.md-qhead b { margin-right: auto; }
.md-link { font: inherit; font-size: 12px; font-weight: 600; background: none; border: 0; padding: 0; color: inherit; text-decoration: underline; cursor: pointer; }
.md-queue ul { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 6px; max-height: 320px; overflow-y: auto; }
.md-queue li { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(90px, auto); gap: 4px 12px; align-items: center; }
.md-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.md-size { color: var(--theme-elevation-500); font-size: 12px; }
.md-state { text-align: right; font-size: 12px; font-variant-numeric: tabular-nums; }
.md-ok .md-state { color: #1f8a4c; } .md-err .md-state { color: #c2410c; white-space: normal; }
html[data-theme='dark'] .md-ok .md-state { color: #4ccb7f; } html[data-theme='dark'] .md-err .md-state { color: #ff8a5c; }
.md-bar { grid-column: 1 / -1; height: 4px; border-radius: 2px; background: var(--theme-elevation-100); overflow: hidden; }
.md-bar i { display: block; height: 100%; background: #0057b8; transition: width .2s; }
.md-ok .md-bar i { background: #1f8a4c; } .md-err .md-bar { display: none; }
.md-overlay { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 24px; background: rgba(0, 40, 90, .35); pointer-events: none; }
.md-overlay > div { display: grid; justify-items: center; gap: 12px; padding: 40px 56px; border: 3px dashed #fff; border-radius: 24px; background: rgba(0, 87, 184, .85); color: #fff; font-size: 18px; text-align: center; }
`
