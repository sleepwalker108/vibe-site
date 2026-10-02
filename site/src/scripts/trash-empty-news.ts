// Одноразово: порожні чернетки новин (без назви) — у кошик, оминаючи перевірку обов'язкових полів
import { getPayload } from 'payload'
import config from '../payload.config'

const payload = await getPayload({ config: await config })
const now = new Date().toISOString()
for (const id of [31, 32, 33]) {
  const doc = await payload.findByID({ collection: 'news', id, draft: true, depth: 0, disableErrors: true })
  if (!doc || doc.title) continue // лише справді порожні
  await payload.db.updateOne({ collection: 'news', where: { id: { equals: id } }, data: { deletedAt: now } })
  payload.logger.info(`🗑 порожня чернетка новини #${id}`)
}
process.exit(0)
