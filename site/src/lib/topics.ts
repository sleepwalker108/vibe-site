// Категорії новин (розділ адмінки «Категорії новин») — для фільтрів у списку новин і в пошуку
import type { Payload } from 'payload'

export type TopicItem = { id: number; slug: string; name: string }

// Усі категорії в порядку, заданому в адмінці
export const getTopics = async (payload: Payload, locale: 'uk' | 'en'): Promise<TopicItem[]> => {
  const { docs } = await payload.find({
    collection: 'topics',
    limit: 200,
    depth: 0,
    sort: 'order',
    locale,
    fallbackLocale: 'uk',
    select: { name: true, slug: true },
  })
  return docs.filter((d) => d.slug).map((d) => ({ id: d.id as number, slug: d.slug as string, name: d.name as string }))
}

// Назва категорії новини: поле може містити саму категорію (з depth ≥ 1) або лише її номер
export const topicName = (value: unknown, topics?: TopicItem[]): string | null => {
  if (value && typeof value === 'object' && 'name' in value) return String((value as { name: unknown }).name || '') || null
  if (typeof value === 'number' && topics) return topics.find((t) => t.id === value)?.name || null
  return null
}
