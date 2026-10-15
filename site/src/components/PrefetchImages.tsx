'use client'
import { useEffect } from 'react'

// Картинки наступної сторінки списку браузер завантажує заздалегідь — коли нічим не зайнятий.
// Тоді перехід на «далі» показує картки одразу з фото, без підвантаження (дані сторінки Next уже готує сам).
// Не вантажимо, якщо в людини ввімкнено «економію трафіку».
const done = new Set<string>()

export const PrefetchImages = ({ urls }: { urls: string[] }) => {
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (conn?.saveData) return
    const todo = urls.filter((u) => u && !done.has(u))
    if (!todo.length) return
    const run = () =>
      todo.forEach((u) => {
        done.add(u)
        const img = new Image()
        img.decoding = 'async'
        img.src = u
      })
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void }
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run, { timeout: 2000 })
      return () => w.cancelIdleCallback?.(id)
    }
    const t = setTimeout(run, 600)
    return () => clearTimeout(t)
  }, [urls])
  return null
}
