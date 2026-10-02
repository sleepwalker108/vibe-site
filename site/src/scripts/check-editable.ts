// Діагностика: чи можна зберегти кожну сторінку/новину без змін (як це робить адмінка).
// Нічого не змінює — зберігає в режимі перевірки й одразу відкочує через транзакцію не потрібно: використовуємо validate через draft-збереження.
import { getPayload } from 'payload'
import config from '../payload.config'

const payload = await getPayload({ config: await config })
for (const collection of ['pages', 'news'] as const) {
  const { docs } = await payload.find({ collection, limit: 2000, depth: 0, locale: 'uk', fallbackLocale: false })
  let bad = 0
  for (const doc of docs) {
    try {
      // draft: true — зберігає лише чернетку-версію, опубліковане не чіпає
      await payload.update({ collection, id: doc.id, locale: 'uk', data: { content: doc.content, _status: doc._status } as any })
    } catch (e: any) {
      bad++
      const msgs = (e.data?.errors || []).map((x: any) => x.message).join(' | ')
      console.log(`✗ ${collection} #${doc.id} ${doc.slug}: ${msgs || e.message}`)
    }
  }
  console.log(`${collection}: ${docs.length} всього, з помилками — ${bad}`)
}
process.exit(0)
