'use client'
import { useRowLabel } from '@payloadcms/ui'

// Підпис запитання в адмінці: сам текст запитання замість «Запитання 01»
export const FaqRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ question?: string }>()
  return <span>{data?.question || `Запитання ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`}</span>
}
