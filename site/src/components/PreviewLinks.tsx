'use client'
import { useEffect } from 'react'

export const PREVIEW_OPEN_MESSAGE = 'nartu:preview-open'

// Попередній перегляд в адмінці («око») показує сайт у рамці з обмеженнями (sandbox Payload).
// Нова вкладка, відкрита з такої рамки, успадковує обмеження — браузер не показує в ній PDF,
// а деякі браузери відкривають файл замість самої адмінки. Тому в рамці посилання «у новій вкладці»
// передаємо адмінці, і вона відкриває вкладку сама, вже без обмежень (див. admin/PreviewLinkOpener).
export const PreviewLinks = () => {
  useEffect(() => {
    if (window.top === window.self) return // звичайний перегляд сайту — нічого не змінюємо
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target !== '_blank' || !/^https?:$/.test(new URL(a.href).protocol)) return
      e.preventDefault()
      window.parent.postMessage({ type: PREVIEW_OPEN_MESSAGE, href: a.href }, location.origin)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])
  return null
}
