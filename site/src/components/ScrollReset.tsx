'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * Перехід за посиланням → нова сторінка завжди відкривається згори.
 * (Next.js іноді лишає прокрутку попередньої сторінки, і людину «кидало» донизу.)
 * Кнопки браузера «Назад»/«Вперед» не чіпаємо — там повертається попереднє місце.
 */
export const ScrollReset = () => {
  const pathname = usePathname()
  const pending = useRef(false)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin || url.hash) return
      if (url.pathname !== location.pathname) pending.current = true
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  useEffect(() => {
    if (!pending.current) return
    pending.current = false
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
    // ще раз після того, як Next.js завершить власну прокрутку
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }))
  }, [pathname])

  return null
}
