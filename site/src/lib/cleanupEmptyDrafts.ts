import type { Payload } from 'payload'

// Порожні «покинуті» чернетки. Через автозбереження Payload створює новину чи сторінку в базі одразу,
// щойно відкрити «Створити» — ще до того, як щось введено. Якщо редактор передумав, у списку лишається
// порожній запис без назви (лише номер). Такі записи видаляємо, якщо вони:
//   • жодного разу не публікувались;
//   • не мають назви ні українською, ні англійською;
//   • створені понад добу тому (щоб не зачепити того, хто саме зараз пише).
// Запускається після старту сервера й далі кожні 6 годин (див. onInit у payload.config.ts).

const COLLECTIONS = ['news', 'pages'] as const
const AGE_MS = 24 * 3600 * 1000

export const cleanupEmptyDrafts = async (payload: Payload) => {
  const before = new Date(Date.now() - AGE_MS).toISOString()
  let removed = 0
  for (const collection of COLLECTIONS) {
    const { docs } = await payload.find({
      collection,
      draft: true,
      trash: true, // і ті, що вже в кошику
      locale: 'all',
      depth: 0,
      limit: 200,
      pagination: false,
      where: { and: [{ _status: { equals: 'draft' } }, { createdAt: { less_than: before } }] },
      overrideAccess: true,
    })
    for (const doc of docs as { id: number | string; title?: Record<string, string | null | undefined> | string | null }[]) {
      const titles = typeof doc.title === 'object' && doc.title ? Object.values(doc.title) : [doc.title]
      if (titles.some((t) => typeof t === 'string' && t.trim())) continue // є назва — це справжня чернетка
      const published = await payload.findVersions({
        collection,
        where: { and: [{ parent: { equals: doc.id } }, { 'version._status': { equals: 'published' } }] },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (published.totalDocs) continue // колись публікувалась — не чіпаємо
      await payload.delete({ collection, id: doc.id, trash: true, overrideAccess: true } as never) // trash — і з кошика
      removed++
    }
  }
  if (removed) payload.logger.info(`Прибрано порожніх чернеток без назви: ${removed}`)
  return removed
}
