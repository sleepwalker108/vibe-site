'use client'
import { useRowLabel } from '@payloadcms/ui'

// Підпис рядка меню в адмінці: назва пункту замість «Пункт 01»
export const NavRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ label?: string; children?: unknown[] }>()
  const n = data?.children?.length
  if (!data?.label) return <span>Пункт {String((rowNumber ?? 0) + 1).padStart(2, '0')}</span>
  return (
    <span>
      {data.label}
      {n ? ` (${n} у підменю)` : ''}
    </span>
  )
}
