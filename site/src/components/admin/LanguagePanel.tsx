'use client'
import { useDocumentInfo, useFormFields, useLocale } from '@payloadcms/ui'

const LANGS = [
  { code: 'uk', short: 'UA', name: 'Українська' },
  { code: 'en', short: 'EN', name: 'English' },
] as const

// Блок «Мови» у правій колонці форми новини/сторінки: перемикання між українською та англійською версією
export const LanguagePanel = () => {
  const { id, collectionSlug } = useDocumentInfo()
  const locale = useLocale()
  const hasEnglish = useFormFields(([fields]) => Boolean(fields?.hasEnglish?.value))
  const current = locale?.code || 'uk'

  return (
    <div className="lang-panel">
      <style>{CSS}</style>
      <div className="lp-title">Мови</div>
      {!id ? (
        <p className="lp-note">Спершу збережіть українську версію — тоді з’явиться можливість додати англійську.</p>
      ) : (
        <>
          <ul>
            {LANGS.map((l) => {
              const active = l.code === current
              const exists = l.code === 'uk' || hasEnglish
              return (
                <li key={l.code}>
                  <a
                    className={`lp-row${active ? ' active' : ''}`}
                    href={`/admin/collections/${collectionSlug}/${id}?locale=${l.code}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="lp-code">{l.short}</span>
                    <span className="lp-name">{l.name}</span>
                    <span className={`lp-status${exists ? ' ok' : ''}`}>
                      {active ? 'редагується' : exists ? 'є ✎' : '+ додати'}
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
          {current === 'en' && !hasEnglish && (
            <p className="lp-note">
              Англійської версії ще немає. Щоб узяти український текст за основу, натисніть ⋮ угорі праворуч →
              «Копіювати до локалізації» → з «Українська» в «English». Потім перекладіть і збережіть.
            </p>
          )}
          {current === 'en' && hasEnglish && <p className="lp-note">Порожні англійські поля на сайті показуються українською.</p>}
        </>
      )}
    </div>
  )
}

const CSS = `
.lang-panel { margin: 0 0 24px; padding: 14px; border: 1px solid var(--theme-elevation-150); border-radius: 10px; }
.lp-title { font-weight: 600; margin-bottom: 8px; }
.lang-panel ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.lp-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; text-decoration: none; color: inherit; border: 1px solid transparent; }
.lp-row:hover { background: var(--theme-elevation-50); }
.lp-row.active { border-color: #ffd500; background: var(--theme-elevation-50); }
.lp-code { flex: none; width: 30px; height: 22px; border-radius: 6px; display: grid; place-items: center; font-size: 11px; font-weight: 700; background: var(--theme-elevation-150); }
.lp-row.active .lp-code { background: #ffd500; color: #0a2440; }
.lp-name { flex: 1; }
.lp-status { font-size: 12px; color: var(--theme-elevation-500); white-space: nowrap; }
.lp-status.ok { color: var(--theme-success-500, #2f9e5f); }
.lp-row.active .lp-status { color: inherit; font-weight: 600; }
.lp-note { margin: 10px 0 0; font-size: 12px; line-height: 1.45; color: var(--theme-elevation-600); }
`
