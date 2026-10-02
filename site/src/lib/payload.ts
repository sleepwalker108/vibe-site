import { headers as getHeaders } from 'next/headers'
import { getPayload, type Where } from 'payload'
import config from '@/payload.config'

export const getClient = async () => getPayload({ config: await config })

/**
 * Чернетки показуємо лише в режимі попереднього перегляду (?preview=1)
 * і лише тому, хто увійшов в адмінку. Відвідувачі завжди бачать опубліковане.
 */
export const isDraftMode = async (searchParams: Record<string, string | string[] | undefined>) => {
  if (searchParams.preview !== '1') return false
  const payload = await getClient()
  const { user } = await payload.auth({ headers: await getHeaders() })
  return Boolean(user)
}

// Поза режимом перегляду — тільки опубліковане
export const publishedOnly = (draft: boolean): Where | undefined =>
  draft ? undefined : { _status: { equals: 'published' } }

export const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

export const mediaUrl = (m: unknown, size: 'card' | 'wide' = 'card'): string | undefined => {
  if (!m || typeof m !== 'object') return undefined
  const media = m as { url?: string | null; sizes?: Record<string, { url?: string | null } | undefined> }
  return media.sizes?.[size]?.url || media.url || undefined
}
