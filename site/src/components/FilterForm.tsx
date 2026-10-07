'use client'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useListNav } from './ListNav'

// Форма фільтрів: застосовується без перезавантаження сторінки й без прокрутки вгору,
// а в адресі лишаються лише вибрані фільтри (без порожніх). Без JavaScript — звичайна форма.
export const FilterForm = ({ action, className, children }: { action: string; className?: string; children: React.ReactNode }) => {
  const router = useRouter()
  const nav = useListNav() // усередині списку — з індикатором завантаження
  const [pending, start] = useTransition()
  return (
    <form
      className={className}
      action={action}
      method="get"
      aria-busy={pending || undefined}
      onSubmit={(e) => {
        e.preventDefault()
        const p = new URLSearchParams()
        for (const [k, v] of new FormData(e.currentTarget)) {
          const s = String(v).trim()
          if (s && !(k === 'sort' && s === 'new')) p.set(k, s)
        }
        const qs = p.toString()
        const href = qs ? `${action}?${qs}` : action
        if (nav) nav.go(href)
        else start(() => router.push(href, { scroll: false }))
      }}
    >
      {children}
    </form>
  )
}
