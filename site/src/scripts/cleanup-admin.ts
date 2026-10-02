// Одноразово: прибирання в адмінці.
//  1) повторне збереження сторінок і новин — виправляє зіпсовані посилання (див. src/fields/editor.ts);
//  2) новину, яку на старому сайті зробили сторінкою, переносимо в «Новини»;
//  3) зайве — в кошик (можна відновити в адмінці: Сторінки / Новини → «Кошик»).
import { getPayload } from 'payload'
import config from '../payload.config'

const payload = await getPayload({ config: await config })
const log = (s: string) => payload.logger.info(s)

// 1) виправляємо посилання
for (const collection of ['pages', 'news'] as const) {
  const { docs } = await payload.find({ collection, limit: 2000, depth: 0, locale: 'uk', fallbackLocale: false, draft: false })
  let n = 0
  for (const doc of docs) {
    if (!doc.content || !JSON.stringify(doc.content).includes('"url"')) continue
    await payload.update({ collection, id: doc.id, locale: 'uk', data: { content: doc.content, _status: doc._status } as any })
    n++
  }
  log(`Посилання перевірено: ${collection} — ${n}`)
}

// 2) «Планування – це ключовий елемент відновлення…» — це новина
const planSlug = 'планування-це-ключовий-елемент-відн'
const plan = (await payload.find({ collection: 'pages', where: { slug: { equals: planSlug } }, limit: 1, depth: 0 })).docs[0]
if (plan) {
  const exists = await payload.count({ collection: 'news', where: { slug: { equals: planSlug } } })
  if (!exists.totalDocs) {
    await payload.create({
      collection: 'news',
      locale: 'uk',
      data: {
        _status: 'published',
        title: plan.title,
        slug: planSlug,
        publishedAt: '2025-03-19T18:27:00.000Z',
        content: plan.content,
        legacyUrl: `https://dp-reintegration.gov.ua/${encodeURIComponent(planSlug)}/`,
      } as any,
    })
    log('Перенесено в новини: «Планування – це ключовий елемент відновлення…»')
  }
}

// 3) у кошик
const toTrash: Record<string, string> = {
  [planSlug]: 'перенесено в новини',
  'фінансова-звітність-2023-рік': 'дублікат «Фінансова звітність 2023 рік» з поламаними посиланнями',
  'відеоматеріали': 'замінено сторінкою-галереєю «Відео»',
  'pro-nas': 'застарілі дані (стара назва ДП «Реінтеграція та відновлення»)',
  news: 'порожня заготовка — список новин формується автоматично',
  'garyacha-liniya': 'порожня заготовка розділу меню',
  'zapobigannya-korupciyi': 'порожня заготовка розділу меню',
  zviti: 'порожня заготовка розділу меню',
  zakonodavstvo: 'порожня заготовка розділу меню',
  vakansiyi: 'порожня заготовка розділу меню',
}
for (const [slug, why] of Object.entries(toTrash)) {
  const doc = (await payload.find({ collection: 'pages', where: { slug: { equals: slug } }, limit: 1, depth: 0 })).docs[0]
  if (!doc) continue
  await payload.update({ collection: 'pages', id: doc.id, data: { deletedAt: new Date().toISOString() } as any })
  log(`  🗑 сторінка «${doc.title}» — ${why}`)
}
// порожні чернетки новин без назви (створюються, якщо відкрити «Створити» і нічого не ввести)
const empty = await payload.find({
  collection: 'news',
  where: { and: [{ _status: { equals: 'draft' } }, { title: { exists: false } }] },
  limit: 100,
  depth: 0,
  draft: true,
})
for (const d of empty.docs) {
  await payload.update({ collection: 'news', id: d.id, draft: true, data: { deletedAt: new Date().toISOString() } as any })
  log(`  🗑 порожня чернетка новини #${d.id}`)
}
log('Готово')
process.exit(0)
