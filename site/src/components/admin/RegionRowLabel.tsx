'use client'
import { useRowLabel } from '@payloadcms/ui'
import { regionName } from '../../data/regionNames'

// Підпис рядка в адмінці: «Харківська — 1 216 НП» замість «Область 03»
export const RegionRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{
    region?: string
    possible?: number
    eres?: number
    active?: number
    occupied?: number
  }>()
  const name = regionName(data?.region)
  const total = (data?.possible || 0) + (data?.eres || 0) + (data?.active || 0) + (data?.occupied || 0)
  if (!name) return <span>Область {String((rowNumber ?? 0) + 1).padStart(2, '0')}</span>
  return (
    <span>
      {name} — {total.toLocaleString('uk-UA')} НП
    </span>
  )
}
