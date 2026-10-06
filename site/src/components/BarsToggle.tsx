'use client'
import { useState } from 'react'

// Телефон: «Показати всі категорії» під топ-5 у статистиці (на комп'ютері кнопка схована — видно все)
export const BarsToggle = ({ count, more, less, light }: { count: number; more: string; less: string; light?: boolean }) => {
  const [open, setOpen] = useState(false)
  return (
    <button
      type="button"
      className={`bars-toggle${light ? ' light' : ''}${open ? ' is-open' : ''}`}
      aria-expanded={open}
      onClick={(e) => {
        const bars = (e.currentTarget.previousElementSibling as HTMLElement | null) || null
        bars?.classList.toggle('expanded', !open)
        setOpen(!open)
        if (open) bars?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }}
    >
      {open ? less : `${more} (${count})`}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  )
}
