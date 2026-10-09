'use client'
import { useEffect, useState } from 'react'
import type { SyncState } from '@/lib/sheetSync'

// «Статистика гарячих ліній» → блок «Google-форма»: коли й що підтягнулося, кнопка «Оновити зараз»
// і точний перелік питань для форми (назви — з поточних категорій, щоб сайт їх упізнав).
const time = (iso?: string) => (iso ? new Date(iso).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' }) : '—')

export const SheetSyncPanel = () => {
  const [st, setSt] = useState<SyncState | null>(null)
  const [busy, setBusy] = useState(false)
  const [questions, setQuestions] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/stats-sheet', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setSt)
      .catch(() => {})
    fetch('/api/globals/stats?draft=true&locale=uk&depth=0', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((g: { categories?: { name: string }[] } | null) =>
        setQuestions([
          'Станом на (дата)',
          ...(g?.categories || []).map((c) => c.name),
          'Зареєстровано звернень',
          'Звернень через месенджери',
        ]),
      )
      .catch(() => {})
  }, [])

  const syncNow = async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/stats-sheet', { method: 'POST', credentials: 'include' })
      setSt(await r.json())
    } catch (e) {
      setSt({ ok: false, message: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(questions.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  return (
    <div className="ssp">
      <style>{CSS}</style>
      <div className="ssp-row">
        <button type="button" className="ssp-btn" onClick={syncNow} disabled={busy}>
          {busy ? 'Перевіряю таблицю…' : 'Оновити зараз'}
        </button>
        <span className="ssp-muted">Сайт сам перевіряє таблицю раз на 15 хвилин. Востаннє: {time(st?.checkedAt)}</span>
      </div>
      {st?.message && <p className={`ssp-msg ${st.ok === false ? 'bad' : 'good'}`}>{st.message}</p>}
      {!!st?.changes?.length && st.draftAt && (
        <div className="ssp-box">
          <b>Остання чернетка з форми ({time(st.draftAt)}):</b>
          <ul>
            {st.changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <button type="button" className="ssp-link" onClick={() => location.reload()}>
            Оновити сторінку, щоб побачити чернетку
          </button>
        </div>
      )}
      {!!st?.unmatched?.length && (
        <p className="ssp-msg bad">
          Не впізнано питання форми: {st.unmatched.map((u) => `«${u}»`).join(', ')}. Назва питання має збігатися з назвою категорії нижче.
        </p>
      )}
      <details className="ssp-help">
        <summary>Як налаштувати Google-форму (5 хвилин)</summary>
        <ol>
          <li>
            Створіть Google-форму з питаннями «Коротка відповідь» (для дати — «Дата»). Назви питань — <b>точно як тут</b>:
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
            Загальну кількість дзвінків («Прийнято») вносити не треба — сайт рахує її сам.
          </li>
          <li>У формі: вкладка «Відповіді» → «Зв’язати з Таблицями» → створити нову таблицю.</li>
          <li>
            У таблиці: «Файл» → «Поділитися» → «Опублікувати в інтернеті» → аркуш з відповідями, формат <b>CSV</b> → «Опублікувати».
          </li>
          <li>Скопіюйте посилання, вставте його в поле вище й збережіть (кнопка «Зберегти чернетку» або «Опублікувати»).</li>
          <li>Після кожної нової відповіді цифри з’являтимуться тут як чернетка — перевірте й натисніть «Опублікувати».</li>
        </ol>
        <p className="ssp-muted">
          Опубліковану таблицю може відкрити кожен, хто знає посилання, — тож тримайте в ній лише ці цифри (без імен і контактів).
        </p>
      </details>
    </div>
  )
}

const CSS = `
.ssp { margin: 4px 0 24px; display: grid; gap: 10px; }
.ssp-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ssp-btn { font: inherit; font-weight: 600; font-size: 13px; padding: 8px 16px; border-radius: 999px; border: 0; cursor: pointer; background: var(--theme-elevation-1000); color: var(--theme-elevation-0); }
.ssp-btn:disabled { opacity: .6; cursor: progress; }
.ssp-muted { font-size: 12px; color: var(--theme-elevation-600); }
.ssp-msg { margin: 0; font-size: 13px; padding: 8px 12px; border-radius: 8px; background: var(--theme-elevation-50); border-left: 3px solid var(--theme-elevation-400); }
.ssp-msg.good { border-left-color: #2f9e5f; } .ssp-msg.bad { border-left-color: #c2410c; }
.ssp-box { font-size: 13px; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--theme-elevation-150); }
.ssp-box ul { margin: 6px 0; padding-left: 18px; }
.ssp-link { font: inherit; font-size: 12px; font-weight: 600; background: none; border: 0; padding: 0; color: var(--theme-success-600, #2f6fdb); cursor: pointer; text-decoration: underline; }
.ssp-help { font-size: 13px; border: 1px solid var(--theme-elevation-150); border-radius: 8px; padding: 10px 14px; }
.ssp-help summary { cursor: pointer; font-weight: 600; }
.ssp-help ol { margin: 10px 0 6px; padding-left: 20px; display: grid; gap: 6px; }
.ssp-q { margin: 6px 0; padding: 8px 12px; border-radius: 8px; background: var(--theme-elevation-50); }
.ssp-q ul { margin: 0 0 6px; padding-left: 18px; }
`
