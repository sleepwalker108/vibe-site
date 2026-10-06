'use client'
import { useId, useState, type ReactNode } from 'react'

/**
 * Картка річного звіту. На телефоні — згорнута: видно заголовок, підсумок і стрілочку,
 * дотик розгортає вміст. На комп'ютері вміст завжди відкритий (див. .rcard-fold у styles.css).
 */
export const RCard = ({ title, summary, children }: { title: string; summary?: ReactNode; children: ReactNode }) => {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className={`rcard rcard-fold${open ? ' is-open' : ''}`}>
      <button type="button" className="rcard-head" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        <h3>{title}</h3>
        {summary != null && <span className="rcard-sum">{summary}</span>}
        <svg className="rcard-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div className="rcard-body" id={id}>
        <div className="rcard-inner">{children}</div>
      </div>
    </div>
  )
}
