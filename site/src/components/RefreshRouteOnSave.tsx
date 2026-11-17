'use client'
import { RefreshRouteOnSave as PayloadRefresh } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

// Не частіше, ніж раз на стільки мілісекунд: кожне оновлення — це повна перебудова сторінки на сервері
const GAP = 1000

// Оновлює сторінку в попередньому перегляді, коли адмінка зберігає зміни.
// Під час введення автозбереження спрацьовує раз за разом. Якщо перебудовувати сторінку на кожне,
// сервер не встигає, і решта адмінки (перехід між розділами) чекає в черзі. Тому кілька збережень
// поспіль дають одне оновлення: одразу, якщо давно не оновлювали, інакше — одне в кінці паузи.
export const RefreshRouteOnSave = () => {
  const router = useRouter()
  const last = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(() => {
    if (timer.current) return // оновлення вже заплановане — воно покаже й ці зміни
    const wait = last.current + GAP - Date.now()
    const run = () => {
      timer.current = null
      last.current = Date.now()
      router.refresh()
    }
    if (wait <= 0) run()
    else timer.current = setTimeout(run, wait)
  }, [router])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return <PayloadRefresh refresh={refresh} serverURL={process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'} />
}
