import { APIError, type CollectionBeforeChangeHook } from 'payload'

// Запобіжник: не публікуємо новину чи сторінку без українського заголовка. Інакше документ, створений в
// англійській версії адмінки, отримував статус «Опубліковано», але без української назви й адреси сторінки —
// і на сайті його не було (сторінка створення в адмінці й так відкривається українською — див. src/proxy.ts).
// У повідомленні немає ком: Payload ділить його по комах на окремі рядки.
export const requireUkrainianTitle =
  (collection: 'news' | 'pages'): CollectionBeforeChangeHook =>
  async ({ data, originalDoc, req }) => {
    if (data?._status !== 'published' || !req.locale || req.locale === 'uk') return data
    const id = originalDoc?.id
    const uk = id
      ? await req.payload
          .findByID({ collection, id, locale: 'uk', fallbackLocale: false as never, draft: true, depth: 0, overrideAccess: true, req })
          .catch(() => null)
      : null
    const title = typeof uk?.title === 'string' ? uk.title.trim() : ''
    if (!title) {
      throw new APIError(
        'Спершу заповніть українську версію — без українського заголовка документ не з’явиться на сайті. Угорі праворуч виберіть «Локалізація: Українська» та введіть заголовок.',
        400,
        null,
        true,
      )
    }
    return data
  }
