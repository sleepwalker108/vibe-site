import { useEffect, useState } from 'react'

// Копіювання тексту в буфер обміну (із запасним способом для старих браузерів)
export const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

// Повна адреса файлу (з доменом сайту) — щоб посилання працювало, куди б його не вставили.
// Лише в браузері (у обробниках подій або з origin із useOrigin): на сервері window немає.
export const absoluteUrl = (url?: string | null, origin?: string) => {
  if (!url) return ''
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  return base ? new URL(url, base).href : url
}

// Домен сайту для показу повних адрес. Сторінку адмінки спершу збирає сервер, де window немає, —
// тому домен підставляємо вже в браузері, після першого показу (до того — коротка адреса /api/media/file/…).
export const useOrigin = () => {
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])
  return origin
}
