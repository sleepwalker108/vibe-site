'use client'
import { useEffect } from 'react'

// Пара до src/components/PreviewLinks.tsx: посилання «у новій вкладці», натиснуте в попередньому
// перегляді («око»), відкриваємо звідси — з адмінки, а не з рамки з обмеженнями, де PDF не відкривається.
export const PreviewLinkOpener = ({ children }: { children?: React.ReactNode }) => {
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // лише від сторінок нашого ж сайту (рамка попереднього перегляду)
      if (e.origin !== location.origin || e.data?.type !== 'nartu:preview-open') return
      let url: URL
      try {
        url = new URL(String(e.data.href), location.origin)
      } catch {
        return
      }
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return
      window.open(url.href, '_blank', 'noopener,noreferrer')
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])
  return <>{children}</>
}
