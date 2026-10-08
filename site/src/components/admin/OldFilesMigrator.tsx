'use client'
import { useEffect, useRef, useState } from 'react'
import type { MigrationState } from '@/lib/oldFiles'

// Перенесення файлів зі старого сайту в медіатеку: кнопка + хід виконання (працює у фоні на сервері)
export const OldFilesMigrator = ({ hasOld, onDone }: { hasOld: boolean; onDone: () => void }) => {
  const [st, setSt] = useState<MigrationState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const wasRunning = useRef(false)

  const load = async (method: 'GET' | 'POST' = 'GET') => {
    try {
      const r = await fetch('/api/status/old-files', { method, credentials: 'include' })
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

  // поки триває — оновлюємо хід кожні 2 секунди; після завершення — перевіряємо посилання знову
  useEffect(() => {
    if (st?.running) {
      wasRunning.current = true
      const t = setInterval(() => load(), 2000)
      return () => clearInterval(t)
    }
    if (st && wasRunning.current) {
      wasRunning.current = false
      onDone()
    }
  }, [st?.running])

  if (!st || (!hasOld && !st.running && !st.finishedAt)) return null
  const pct = st.total ? Math.round((st.done / st.total) * 100) : 0

  return (
    <div className="ss-migrate">
      {st.running ? (
        <>
          <p>
            <b>{st.stage}</b> {st.total > 0 && `${st.done} з ${st.total}`}
          </p>
          <div className="ss-meter ok" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Хід перенесення">
            <i style={{ width: `${pct}%` }} />
          </div>
          <p className="ss-muted">Можна закрити сторінку — перенесення триває на сервері.</p>
        </>
      ) : (
        <>
          {st.finishedAt && (
            <p>
              <b>Перенесення завершено.</b> Нових файлів у медіатеці: {st.copied}, уже були: {st.reused}; оновлено сторінок і новин:{' '}
              {st.docsUpdated}
              {st.videosUpdated ? `, відео: ${st.videosUpdated}` : ''}. Звідки: з архіву {st.fromArchive}, зі старого сайту {st.fromWeb}.
            </p>
          )}
          {hasOld && (
            <>
              <p className="ss-muted">
                Документи й відео, які ще лежать на старому сайті, можна перенести в медіатеку нового — посилання на сторінках і в розділі
                «Відео» оновляться самі. Повторний запуск безпечний: уже перенесені файли не дублюються.
              </p>
              <button type="button" className="ss-btn ss-btn-primary" onClick={() => load('POST')}>
                Перенести файли на новий сайт
              </button>
            </>
          )}
        </>
      )}
      {!!st.failed.length && (
        <details className="ss-group warn">
          <summary>
            <b>{st.failed.length}</b> не вдалося перенести
          </summary>
          <ul className="ss-list">
            {st.failed.map((f, i) => (
              <li key={i}>
                <code>{f.url}</code>
                <span className="ss-msg">{f.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {error && <p className="ss-muted">{error}</p>}
    </div>
  )
}
