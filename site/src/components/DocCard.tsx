'use client'
import { useEffect, useId, useState } from 'react'

export type DocLabels = { docView: string; docHide: string; docDownload: string; docOpen: string; docNoInline: string }

const ext = (url: string) => (url.split(/[?#]/)[0].match(/\.([a-z0-9]{2,5})$/i)?.[1] || '').toLowerCase()

// Документ на сторінці: натискання будь-де на заголовку розгортає/згортає перегляд PDF прямо на сторінці.
// Файл вантажиться лише після першого розгортання. «Завантажити» — окрема кнопка, що не згортає картку.
// Документи інших форматів (Word, Excel) браузер показати не може — для них лише відкриття/завантаження.
export const DocCard = ({ url, title, labels }: { url: string; title: string; labels: DocLabels }) => {
  const type = ext(url)
  const isPdf = type === 'pdf'
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false) // перегляд уже відкривали — не перезавантажуємо при повторному розгортанні
  const [inline, setInline] = useState(true) // чи вміє браузер показувати PDF на сторінці (телефони здебільшого ні)
  const id = useId()

  useEffect(() => {
    const nav = navigator as Navigator & { pdfViewerEnabled?: boolean }
    if (nav.pdfViewerEnabled === false) setInline(false)
  }, [])

  const toggle = () => {
    setOpen((o) => !o)
    setLoaded(true)
  }

  const head = (
    <>
      <span className="doc-ico" aria-hidden>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </svg>
      </span>
      <span className="doc-title">{title}</span>
      {type && <span className="doc-type">{type.toUpperCase()}</span>}
    </>
  )

  // не PDF — просто посилання на файл
  if (!isPdf) {
    return (
      <div className="doc-card">
        <a className="doc-head" href={url} target="_blank" rel="noopener noreferrer">
          {head}
          <span className="doc-state">{labels.docOpen}</span>
        </a>
      </div>
    )
  }

  return (
    <div className={`doc-card${open ? ' is-open' : ''}`}>
      <div className="doc-row">
        <button type="button" className="doc-head" aria-expanded={open} aria-controls={id} onClick={toggle}>
          {head}
          <span className="doc-state">
            {open ? labels.docHide : labels.docView}
            <svg className="doc-caret" viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </button>
        {/* відкрити в новій вкладці (на комп'ютері; на телефоні ця дія є в розгорнутій картці) */}
        <a className="doc-dl doc-newtab" href={url} target="_blank" rel="noopener noreferrer" aria-label={`${labels.docOpen}: ${title}`} title={labels.docOpen}>
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </svg>
        </a>
        <a className="doc-dl" href={url} download target="_blank" rel="noopener noreferrer" aria-label={`${labels.docDownload}: ${title}`} title={labels.docDownload}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
          </svg>
        </a>
      </div>
      <div id={id} className="doc-body" hidden={!open}>
        {loaded &&
          (inline ? (
            <iframe className="doc-frame" src={`${url}#view=FitH`} title={title} loading="lazy" />
          ) : (
            <div className="doc-noinline">
              <p>{labels.docNoInline}</p>
              <div className="doc-actions">
                <a className="doc-btn" href={url} target="_blank" rel="noopener noreferrer">
                  {labels.docOpen}
                </a>
                <a className="doc-btn ghost" href={url} download>
                  {labels.docDownload}
                </a>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
