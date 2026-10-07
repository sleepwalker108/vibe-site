'use client'
import { toast } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'
import { size } from '@/lib/adminFormat'
import type { BackupFile } from '@/lib/backups'

const MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']
// «7 жовтня 2026, 09:15» — з рядка дати копії, без перетворень часових поясів
const when = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}, ${d.slice(11, 16)}`

const api = async (url: string, init?: RequestInit) => {
  const r = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || `Помилка ${r.status}`)
  return data
}

type Confirm = { name: string; action: 'restore' | 'delete' } | null

export const BackupsPanel = ({ initial, free, dir }: { initial: BackupFile[]; free: number | null; dir: string }) => {
  const [list, setList] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null) // що саме зараз виконується
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [restored, setRestored] = useState<{ from: string; safety: string } | null>(null)

  const refresh = useCallback(async () => {
    try {
      setList((await api('/api/backups')).backups)
    } catch {}
  }, [])

  // поки створюється копія файлів — оновлюємо список кожні 3 секунди
  const making = list.some((b) => b.busy)
  useEffect(() => {
    if (!making) return
    const t = setInterval(refresh, 3000)
    return () => clearInterval(t)
  }, [making, refresh])

  const create = async (kind: 'db' | 'media') => {
    setBusy(kind)
    try {
      await api('/api/backups', { method: 'POST', body: JSON.stringify({ kind }) })
      toast.success(kind === 'db' ? 'Копію бази створено' : 'Копія файлів створюється — це може тривати кілька хвилин')
      await refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const run = async () => {
    if (!confirm) return
    const { name, action } = confirm
    setBusy(name)
    try {
      if (action === 'restore') {
        const r = await api('/api/backups/restore', { method: 'POST', body: JSON.stringify({ file: name }) })
        setRestored({ from: name, safety: r.safety })
        toast.success('Базу відновлено')
      } else {
        await api(`/api/backups?file=${encodeURIComponent(name)}`, { method: 'DELETE' })
        toast.success('Копію видалено')
      }
      setConfirm(null)
      await refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const dbCount = list.filter((b) => b.kind === 'db').length
  const mediaCount = list.filter((b) => b.kind === 'media').length
  const byName = (n: string) => list.find((b) => b.name === n)

  return (
    <div className="bk-wrap">
      <style>{CSS}</style>
      <h1>Резервні копії</h1>
      <p className="bk-sub">
        Копії робляться автоматично щодня о 03:15 і перед кожним оновленням сайту. Зберігаються останні 30 копій бази й 14 копій
        файлів. {free !== null && <>Вільно на диску: <b>{size(free)}</b>.</>}
      </p>

      {restored && (
        <div className="bk-note ok" role="status">
          <b>Базу відновлено</b> з копії від {when(byName(restored.from)?.date || '')}. Стан до відновлення збережено окремою копією —
          якщо треба, поверніться до нього кнопкою «Відновити» біля неї.{' '}
          <button type="button" className="bk-link" onClick={() => location.reload()}>
            Оновити сторінку
          </button>
        </div>
      )}

      <div className="bk-actions">
        <div className="bk-card">
          <div className="bk-ico" aria-hidden>
            🗄️
          </div>
          <div>
            <h3>База даних</h3>
            <p>Новини, сторінки, меню, налаштування, користувачі. Кілька секунд.</p>
          </div>
          <button type="button" className="bk-btn primary" disabled={!!busy} onClick={() => create('db')}>
            {busy === 'db' ? 'Створюю…' : 'Зробити копію бази'}
          </button>
        </div>
        <div className="bk-card">
          <div className="bk-ico" aria-hidden>
            🖼️
          </div>
          <div>
            <h3>Файли медіатеки</h3>
            <p>Картинки, PDF, відео. Може тривати кілька хвилин — сторінку можна закрити.</p>
          </div>
          <button type="button" className="bk-btn" disabled={!!busy || making} onClick={() => create('media')}>
            {making ? 'Створюється…' : busy === 'media' ? 'Запускаю…' : 'Зробити копію файлів'}
          </button>
        </div>
      </div>

      <h2 className="bk-h2">
        Збережені копії <span>({dbCount} бази, {mediaCount} файлів)</span>
      </h2>
      {!list.length ? (
        <p className="bk-empty">Копій ще немає.</p>
      ) : (
        <ul className="bk-list">
          {list.map((b) => {
            const asking = confirm?.name === b.name ? confirm.action : null
            return (
              <li key={b.name} className={asking ? 'asking' : undefined}>
                <div className="bk-row">
                  <span className={`bk-kind ${b.kind}`}>{b.kind === 'db' ? 'База' : 'Файли'}</span>
                  <span className="bk-date">{when(b.date)}</span>
                  <span className="bk-size">{b.busy ? <i className="bk-spin">створюється…</i> : size(b.size)}</span>
                  {!b.busy && (
                    <span className="bk-btns">
                      <a className="bk-btn small" href={`/api/backups/download?file=${encodeURIComponent(b.name)}`} download>
                        Завантажити
                      </a>
                      {b.kind === 'db' && (
                        <button type="button" className="bk-btn small" disabled={!!busy} onClick={() => setConfirm({ name: b.name, action: 'restore' })}>
                          Відновити
                        </button>
                      )}
                      <button
                        type="button"
                        className="bk-btn small danger"
                        disabled={!!busy}
                        aria-label={`Видалити копію від ${when(b.date)}`}
                        onClick={() => setConfirm({ name: b.name, action: 'delete' })}
                      >
                        Видалити
                      </button>
                    </span>
                  )}
                </div>
                {asking && (
                  <div className="bk-confirm" role="alertdialog" aria-label="Підтвердження">
                    {asking === 'restore' ? (
                      <p>
                        <b>Повернути всі дані сайту до стану на {when(b.date)}?</b> Новини, сторінки й налаштування, змінені після цього,
                        зникнуть. Поточний стан спершу автоматично збережеться окремою копією.
                      </p>
                    ) : (
                      <p>
                        <b>Видалити цю копію назавжди?</b>
                      </p>
                    )}
                    <div className="bk-btns">
                      <button type="button" className={`bk-btn small ${asking === 'delete' ? 'danger-fill' : 'primary'}`} disabled={!!busy} onClick={run}>
                        {busy === b.name ? 'Виконую…' : asking === 'restore' ? 'Так, відновити' : 'Так, видалити'}
                      </button>
                      <button type="button" className="bk-btn small" disabled={!!busy} onClick={() => setConfirm(null)}>
                        Скасувати
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <p className="bk-dir">Папка з копіями на сервері: {dir}</p>
    </div>
  )
}

const CSS = `
.bk-wrap { padding: 32px var(--gutter-h, 60px) 64px; max-width: 1100px; }
.bk-wrap h1 { margin: 0 0 6px; }
.bk-sub { margin: 0 0 20px; color: var(--theme-elevation-600); max-width: 720px; }
.bk-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 28px; }
.bk-card { display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; align-items: start; border: 1px solid var(--theme-elevation-150); border-radius: 12px; padding: 16px 18px; background: var(--theme-elevation-0); }
.bk-card h3 { margin: 0 0 4px; font-size: 16px; }
.bk-card p { margin: 0; color: var(--theme-elevation-600); font-size: 13px; }
.bk-card .bk-btn { grid-column: 2; justify-self: start; margin-top: 10px; }
.bk-ico { font-size: 26px; line-height: 1; }
.bk-btn { font: inherit; font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 8px; border: 1px solid var(--theme-elevation-250); background: var(--theme-elevation-0); color: var(--theme-elevation-1000); cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.bk-btn:hover:not(:disabled) { border-color: var(--theme-elevation-500); }
.bk-btn:focus-visible { outline: 2px solid var(--theme-success-500, #0057b8); outline-offset: 2px; }
.bk-btn:disabled { opacity: .55; cursor: default; }
.bk-btn.primary { background: var(--theme-elevation-1000); color: var(--theme-elevation-0); border-color: var(--theme-elevation-1000); }
.bk-btn.small { padding: 5px 10px; font-size: 12px; }
.bk-btn.danger { color: var(--theme-error-500, #c2410c); }
.bk-btn.danger-fill { background: var(--theme-error-500, #c2410c); border-color: var(--theme-error-500, #c2410c); color: #fff; }
.bk-h2 { font-size: 18px; margin: 0 0 10px; }
.bk-h2 span { font-weight: 400; color: var(--theme-elevation-500); font-size: 14px; }
.bk-list { list-style: none; margin: 0; padding: 0; border: 1px solid var(--theme-elevation-150); border-radius: 12px; overflow: hidden; background: var(--theme-elevation-0); }
.bk-list li + li { border-top: 1px solid var(--theme-elevation-100); }
.bk-list li.asking { background: var(--theme-elevation-50); }
.bk-row { display: grid; grid-template-columns: 70px 1fr 90px auto; gap: 12px; align-items: center; padding: 10px 16px; }
.bk-kind { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 3px 8px; border-radius: 999px; text-align: center; }
.bk-kind.db { background: #e3eefb; color: #0b4a91; }
.bk-kind.media { background: #fdf3d6; color: #7a5600; }
html[data-theme='dark'] .bk-kind.db { background: #173253; color: #a9cdf7; }
html[data-theme='dark'] .bk-kind.media { background: #3d3214; color: #f1d58a; }
.bk-date { font-weight: 600; }
.bk-size { color: var(--theme-elevation-600); font-variant-numeric: tabular-nums; font-size: 13px; }
.bk-btns { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.bk-confirm { padding: 0 16px 14px 98px; }
.bk-confirm p { margin: 0 0 10px; font-size: 13px; max-width: 640px; }
.bk-confirm .bk-btns { justify-content: flex-start; }
.bk-spin { color: var(--theme-elevation-600); animation: bk-pulse 1.4s infinite; }
@keyframes bk-pulse { 50% { opacity: .4; } }
.bk-note { padding: 12px 16px; border-radius: 10px; margin-bottom: 18px; font-size: 14px; }
.bk-note.ok { background: #e6f5ec; border: 1px solid #9fd5b4; color: #14532d; }
html[data-theme='dark'] .bk-note.ok { background: #12301f; border-color: #285e3c; color: #bfe8cf; }
.bk-link { font: inherit; background: none; border: 0; padding: 0; color: inherit; text-decoration: underline; cursor: pointer; font-weight: 600; }
.bk-empty { color: var(--theme-elevation-600); }
.bk-dir { margin-top: 14px; font-size: 12px; color: var(--theme-elevation-500); }
@media (max-width: 760px) {
  .bk-wrap { padding: 20px 16px 48px; }
  .bk-actions { grid-template-columns: 1fr; }
  .bk-row { grid-template-columns: auto 1fr; }
  .bk-size { text-align: right; }
  .bk-row .bk-btns { grid-column: 1 / -1; justify-content: flex-start; }
  .bk-confirm { padding-left: 16px; }
}
`
