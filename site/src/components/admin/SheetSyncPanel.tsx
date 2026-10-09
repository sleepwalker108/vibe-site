'use client'
import { useCallback, useEffect, useState } from 'react'
import type { SheetPreview } from '@/lib/sheetSync'

// «Статистика гарячих ліній» → блок «Google-форма»: остання відповідь форми, що зміниться на сайті,
// і кнопка «Перенести в статистику» (як чернетку). Сам сайт нічого не оновлює — лише за кнопкою.
// Унизу — інструкція й точний перелік питань форми (назви — з поточних категорій, щоб сайт їх упізнав).
export const SheetSyncPanel = () => {
  const [st, setSt] = useState<SheetPreview | null>(null)
  const [busy, setBusy] = useState<'check' | 'apply' | 'undo' | null>('check')
  const [questions, setQuestions] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const check = useCallback(async () => {
    setBusy('check')
    try {
      const r = await fetch('/api/stats-sheet', { credentials: 'include' })
      setSt(await r.json())
    } catch (e) {
      setSt({ ok: false, message: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }, [])

  useEffect(() => {
    check()
    fetch('/api/globals/stats?draft=true&locale=uk&depth=0', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((g: { categories?: { name: string }[] } | null) =>
        setQuestions(['Станом на (дата)', ...(g?.categories || []).map((c) => c.name), 'Зареєстровано звернень', 'Звернень через месенджери']),
      )
      .catch(() => {})
  }, [check])

  const apply = async () => {
    setBusy('apply')
    try {
      const r = await fetch('/api/stats-sheet', { method: 'POST', credentials: 'include' })
      setSt(await r.json())
    } catch (e) {
      setSt({ ok: false, message: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  // повернути цифри, які були до останнього перенесення
  const undo = async () => {
    if (!confirm('Повернути цифри, які були до перенесення з форми?')) return
    setBusy('undo')
    try {
      const r = await fetch('/api/stats-sheet', { method: 'DELETE', credentials: 'include' })
      setSt(await r.json())
    } catch (e) {
      setSt({ ok: false, message: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(questions.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  const hasChanges = !!st?.ok && !!st.changes?.length && !st.applied && !st.undone
  const time = (iso: string) => new Date(iso).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' })

  return (
    <div className="ssp">
      <style>{CSS}</style>
      {busy === 'check' && !st ? (
        <p className="ssp-muted">Читаю Google-таблицю…</p>
      ) : (
        st && (
          <>
            <p className={`ssp-msg ${st.ok === false ? 'bad' : st.applied ? 'good' : hasChanges ? 'new' : ''}`}>
              {st.message}
              {st.undo && !st.applied && <span className="ssp-muted"> Останнє перенесення з форми: {time(st.undo.at)}.</span>}
              {st.responseAt && (
                <span className="ssp-muted">
                  {' '}
                  Остання відповідь: {st.responseAt}
                  {st.responses ? ` (усього відповідей: ${st.responses})` : ''}.
                </span>
              )}
            </p>
            {!!st.changes?.length && (
              <table className="ssp-table">
                <thead>
                  <tr>
                    <th>Що змінюється</th>
                    <th>{st.applied ? 'Було' : 'Зараз'}</th>
                    <th>{st.applied ? 'Стало (чернетка)' : 'З форми'}</th>
                  </tr>
                </thead>
                <tbody>
                  {st.changes.map((c) => (
                    <tr key={c.label}>
                      <td>{c.label}</td>
                      <td>{c.from}</td>
                      <td>
                        <b>{c.to}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!!st.unmatched?.length && (
              <p className="ssp-msg bad">
                Не впізнано питання форми: {st.unmatched.map((u) => `«${u}»`).join(', ')}. Назва питання має збігатися з назвою категорії.
              </p>
            )}
          </>
        )
      )}
      <div className="ssp-row">
        {hasChanges && (
          <button type="button" className="ssp-btn" onClick={apply} disabled={!!busy}>
            {busy === 'apply' ? 'Переношу…' : 'Перенести в статистику (чернетка)'}
          </button>
        )}
        {st?.undo && (
          <button type="button" className="ssp-btn ssp-btn-undo" onClick={undo} disabled={!!busy} title={`Перенесено ${time(st.undo.at)}`}>
            {busy === 'undo' ? 'Повертаю…' : '↶ Скасувати перенесення'}
          </button>
        )}
        {st?.applied || st?.undone ? (
          <button type="button" className="ssp-btn" onClick={() => location.reload()}>
            Оновити сторінку, щоб побачити чернетку
          </button>
        ) : (
          <button type="button" className="ssp-btn ssp-btn-ghost" onClick={check} disabled={!!busy}>
            {busy === 'check' ? 'Перевіряю…' : 'Перевірити форму ще раз'}
          </button>
        )}
      </div>

      <details className="ssp-help">
        <summary>Як налаштувати Google-форму</summary>
        <ol>
          <li>
            Найпростіше — запустити готовий скрипт: він сам створить форму з усіма питаннями й таблицю відповідей
            (інструкція — у файлі <code>deploy/google-form.gs</code> у коді сайту).
          </li>
          <li>
            Або створіть форму вручну: питання «Коротка відповідь» (для дати — «Дата»), назви — <b>точно як тут</b>:
            <div className="ssp-q">
              <ul>
                {questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
              <button type="button" className="ssp-link" onClick={copy}>
                {copied ? 'Скопійовано ✓' : 'Скопіювати перелік'}
              </button>
            </div>
            Потім: «Відповіді» → «Зв’язати з Таблицями»; у таблиці «Поділитися» → «Усі, хто має посилання» (читач).
          </li>
          <li>Скопіюйте посилання на таблицю, вставте в поле вище й збережіть.</li>
          <li>
            Щоб дізнаватися про нові відповіді на пошту: у формі «Відповіді» → ⋮ → «Отримувати сповіщення про нові відповіді на
            ел. пошту».
          </li>
        </ol>
        <p className="ssp-muted">
          Таблицю може відкрити кожен, хто знає посилання, — тож тримайте в ній лише ці цифри (без імен і контактів).
        </p>
      </details>
    </div>
  )
}

const CSS = `
.ssp { margin: 4px 0 24px; display: grid; gap: 10px; }
.ssp-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ssp-btn { font: inherit; font-weight: 600; font-size: 13px; padding: 8px 16px; border-radius: 999px; border: 1px solid transparent; cursor: pointer; background: var(--theme-elevation-1000); color: var(--theme-elevation-0); }
.ssp-btn-ghost { background: transparent; color: inherit; border-color: var(--theme-elevation-250); }
.ssp-btn-undo { background: transparent; color: #c2410c; border-color: #c2410c; }
html[data-theme='dark'] .ssp-btn-undo { color: #ff8a5c; border-color: #ff8a5c; }
.ssp-btn:disabled { opacity: .6; cursor: progress; }
.ssp-muted { font-size: 12px; color: var(--theme-elevation-600); }
.ssp-msg { margin: 0; font-size: 13px; padding: 8px 12px; border-radius: 8px; background: var(--theme-elevation-50); border-left: 3px solid var(--theme-elevation-400); }
.ssp-msg.good { border-left-color: #2f9e5f; } .ssp-msg.bad { border-left-color: #c2410c; } .ssp-msg.new { border-left-color: #e0a800; }
.ssp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ssp-table th { text-align: left; font-weight: 500; font-size: 12px; color: var(--theme-elevation-500); padding: 0 8px 6px 0; }
.ssp-table td { padding: 6px 8px 6px 0; border-top: 1px solid var(--theme-elevation-100); font-variant-numeric: tabular-nums; }
.ssp-table td:not(:first-child), .ssp-table th:not(:first-child) { text-align: right; white-space: nowrap; }
.ssp-link { font: inherit; font-size: 12px; font-weight: 600; background: none; border: 0; padding: 0; color: var(--theme-success-600, #2f6fdb); cursor: pointer; text-decoration: underline; }
.ssp-help { font-size: 13px; border: 1px solid var(--theme-elevation-150); border-radius: 8px; padding: 10px 14px; }
.ssp-help summary { cursor: pointer; font-weight: 600; }
.ssp-help ol { margin: 10px 0 6px; padding-left: 20px; display: grid; gap: 6px; }
.ssp-q { margin: 6px 0; padding: 8px 12px; border-radius: 8px; background: var(--theme-elevation-50); }
.ssp-q ul { margin: 0 0 6px; padding-left: 18px; }
`
