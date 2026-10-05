'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

// Повідомляє сайт про перегляд сторінки — для розділу «Статистика» в адмінці
let first = true
let last = { path: '', at: 0 }

export const VisitTracker = () => {
  const pathname = usePathname()
  useEffect(() => {
    // попередній перегляд у редакторі (сторінка всередині адмінки) не рахуємо
    if (window.top !== window.self || location.search.includes('preview=1')) return
    let path = pathname
    try {
      path = decodeURI(pathname)
    } catch {}
    // та сама сторінка двічі за секунду — це один перегляд
    if (last.path === path && Date.now() - last.at < 1000) return
    last = { path, at: Date.now() }
    // звідки прийшли — лише для першої сторінки; далі людина ходить сайтом
    const data = JSON.stringify({ path, ref: first ? document.referrer : '' })
    first = false
    if (!navigator.sendBeacon?.('/visit', data)) fetch('/visit', { method: 'POST', body: data, keepalive: true }).catch(() => {})
  }, [pathname])
  return null
}
