'use client'
import { useEffect, useState } from 'react'

// Темна тема: місяць — увімкнути, сонце — повернути світлу (видно одну з двох, див. styles.css)
export const IconTheme = ({ size = 18 }: { size?: number }) => (
  <>
    <svg className="ti ti-moon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
    <svg className="ti ti-sun" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </svg>
  </>
)
// Перемикач теми. Початкову тему ставить скрипт у <head> (layout.tsx): збережений вибір або налаштування пристрою.
// Поки людина сама не вибрала — тема стежить за налаштуваннями пристрою.
const THEME_KEY = 'nartu-theme'
export const useTheme = () => {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const html = document.documentElement
    setDark(html.getAttribute('data-theme') === 'dark')
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onSystem = () => {
      let saved: string | null = null
      try {
        saved = localStorage.getItem(THEME_KEY)
      } catch {}
      if (saved) return
      html.setAttribute('data-theme', mq.matches ? 'dark' : 'light')
      setDark(mq.matches)
    }
    mq.addEventListener('change', onSystem)
    return () => mq.removeEventListener('change', onSystem)
  }, [])
  const toggle = () => {
    const next = !dark
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
    } catch {}
    setDark(next)
  }
  return { dark, toggle }
}
