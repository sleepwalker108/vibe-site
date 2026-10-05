'use client'
import { useTheme } from '@payloadcms/ui'

// Перемикач «Світла / Темна тема» в лівому меню адмінки. Вибір запам’ятовується в браузері.
export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className="nav__link"
      onClick={() => setTheme(next)}
      aria-label={next === 'light' ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
      style={{ background: 'none', border: 0, padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left', marginTop: 4 }}
    >
      <span className="nav__link-label">{next === 'light' ? '☀ Світла тема' : '☾ Темна тема'}</span>
    </button>
  )
}
