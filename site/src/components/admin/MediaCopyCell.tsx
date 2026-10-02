'use client'
import { useState } from 'react'
import { absoluteUrl, copyText } from './copyText'

// Колонка «Посилання» у списку медіатеки: одна кнопка — і повна адреса файлу в буфері обміну
export const MediaCopyCell = ({ rowData }: { rowData?: { url?: string | null } }) => {
  const [done, setDone] = useState(false)
  if (!rowData?.url) return null
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation()
        e.preventDefault()
        if (await copyText(absoluteUrl(rowData.url))) {
          setDone(true)
          setTimeout(() => setDone(false), 1600)
        }
      }}
      title="Скопіювати посилання на файл"
      style={{
        padding: '3px 10px',
        borderRadius: 999,
        border: '1px solid',
        borderColor: done ? '#2f9e5f' : 'var(--theme-elevation-250)',
        background: 'transparent',
        color: done ? '#2f9e5f' : 'inherit',
        font: 'inherit',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {done ? 'Скопійовано ✓' : '⧉ Копіювати'}
    </button>
  )
}
