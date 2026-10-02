'use client'
import { useRowLabel } from '@payloadcms/ui'

// Підпис картки в адмінці: «1548 — Гаряча лінія з кризових питань» замість «Картка 01»
export const CardRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ number?: string; title?: string; label?: string }>()
  const parts = [data?.number, data?.title || data?.label].filter(Boolean)
  return <span>{parts.length ? parts.join(' — ') : `Картка ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`}</span>
}
