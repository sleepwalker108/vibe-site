'use client'
import { useEffect, useState } from 'react'
import { size } from '@/lib/adminFormat'
import type { VideoState } from '@/lib/videoOptimize'

// «Стан сервера» → «Відео»: стиснення відео під веб, «швидкий старт» і обкладинки — у фоні на сервері
export const VideosSection = () => {
  const [st, setSt] = useState<VideoState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async (method: 'GET' | 'POST' = 'GET') => {
    try {
      const r = await fetch('/api/status/videos', { method, credentials: 'include' })
      if (!r.ok) throw new Error(`Помилка ${r.status}`)
      setSt(await r.json())
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }
  useEffect(() => {
    load()
  }, [])
  useEffect(() => {
    if (!st?.running) return
    const t = setInterval(() => load(), 2000)
    return () => clearInterval(t)
  }, [st?.running])

  const saved = st ? st.items.reduce((n, i) => n + (i.before - i.after), 0) : 0
  const pct = st?.total ? Math.round((st.done / st.total) * 100) : 0

  return (
    <section className="ss-section">
      <div className="ss-section-head">
        <h2>Відео</h2>
        {st?.running && <span className="ss-chip warn">обробляється…</span>}
        {st && !st.running && st.finishedAt && <span className="ss-chip ok">оптимізовано</span>}
      </div>
      <p className="ss-muted">
        Великі відео стискаються під перегляд на сайті (до 1080p, ~4 Мбіт/с — різниці на око не видно), «паспорт» відео переноситься на
        початок файлу, щоб показ починався одразу, а відео з розділу «Відео» отримують обкладинку з кадру. Нові відео обробляються
        автоматично після завантаження.
      </p>
      {st?.running ? (
        <div className="ss-migrate">
          <p>
            <b>Обробляю {st.current || '…'}</b> — {st.done} з {st.total}
          </p>
          <div className="ss-meter ok" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Хід оптимізації відео">
            <i style={{ width: `${pct}%` }} />
          </div>
          <p className="ss-muted">Великі відео стискаються кілька хвилин. Сторінку можна закрити — робота триває на сервері.</p>
        </div>
      ) : (
        <button type="button" className="ss-btn ss-btn-primary" onClick={() => load('POST')}>
          Оптимізувати всі відео
        </button>
      )}
      {!!st?.items.length && (
        <>
          {saved > 0 && (
            <p style={{ marginTop: 12 }}>
              Зекономлено <b>{size(saved)}</b> — відео вантажаться швидше.
            </p>
          )}
          <ul className="ss-list">
            {st.items.map((i) => (
              <li key={i.name}>
                <code>{i.name}</code>
                <span className="ss-msg">
                  {i.action}
                  {i.after !== i.before && ` · ${size(i.before)} → ${size(i.after)}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {!!st?.failed.length && (
        <details className="ss-group warn">
          <summary>
            <b>{st.failed.length}</b> не вдалося обробити
          </summary>
          <ul className="ss-list">
            {st.failed.map((f) => (
              <li key={f.name}>
                <code>{f.name}</code>
                <span className="ss-msg">{f.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {error && <p className="ss-muted">{error}</p>}
    </section>
  )
}
