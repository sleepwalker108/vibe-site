// Позначити «є англійська версія» для наявних новин і сторінок (за англійською назвою без запасної української)
import { getPayload } from 'payload'
import config from '../payload.config'

const payload = await getPayload({ config: await config })
for (const collection of ['news', 'pages'] as const) {
  const { docs } = await payload.find({ collection, limit: 5000, depth: 0, locale: 'en', fallbackLocale: false, select: { title: true } })
  let yes = 0
  for (const d of docs) {
    const has = Boolean(d.title && String(d.title).trim())
    if (has) yes++
    await payload.db.updateOne({ collection, where: { id: { equals: d.id } }, data: { hasEnglish: has } })
  }
  payload.logger.info(`${collection}: з англійською версією — ${yes} з ${docs.length}`)
}
process.exit(0)
