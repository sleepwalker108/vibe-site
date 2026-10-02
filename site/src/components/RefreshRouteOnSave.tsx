'use client'
import { RefreshRouteOnSave as PayloadRefresh } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'

// Оновлює сторінку в попередньому перегляді щоразу, коли адмінка зберігає зміни
export const RefreshRouteOnSave = () => {
  const router = useRouter()
  return (
    <PayloadRefresh
      refresh={() => router.refresh()}
      serverURL={process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}
    />
  )
}
