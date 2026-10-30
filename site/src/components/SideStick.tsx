'use client'
import { useEffect, useRef } from 'react'

// Бічна колонка «прилипає» під шапкою; якщо вона вища за екран — прилипає низом,
// щоб нижні картки (ГІС РР, DREAM) теж можна було побачити
export const SideStick = () => {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const side = ref.current?.parentElement
    if (!side) return
    const fit = () => {
      side.style.top = ''
      const top = parseFloat(getComputedStyle(side).top) || 0
      const room = window.innerHeight - side.offsetHeight - 24
      if (room < top) side.style.top = `${Math.round(room)}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(side)
    window.addEventListener('resize', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [])
  return <span ref={ref} hidden />
}
