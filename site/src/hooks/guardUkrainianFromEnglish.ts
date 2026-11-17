import { APIError, type CollectionBeforeChangeHook } from 'payload'

// Запобіжник: не даємо записати англійський текст в українську версію.
// Сторінку «Корисна інформація» двічі знаходили з англійським текстом в українській версії. Головну причину
// (requireUkrainianTitle перемикав мову збереження) виправлено; це — друга лінія захисту на будь-який інший випадок.
// Зміну в українській версії, після якої назва або текст стають точнісінько як в англійській (а до зміни
// були інші), відхиляємо з поясненням. Скрипти й міграції (без користувача) не перевіряються.
// У повідомленні немає ком: Payload ділить його по комах на окремі рядки.
const same = (a: unknown, b: unknown) => a != null && b != null && JSON.stringify(a) === JSON.stringify(b)
const blank = (v: unknown) => v == null || (typeof v === 'string' && !v.trim())

export const guardUkrainianFromEnglish =
  (collection: 'news' | 'pages'): CollectionBeforeChangeHook =>
  async ({ data, originalDoc, req }) => {
    if (!req.user || !originalDoc?.id || (req.locale && req.locale !== 'uk')) return data
    const en = await req.payload
      // без req: інакше Payload перемкне мову всього збереження на англійську (див. requireUkrainianTitle.ts)
      .findByID({ collection, id: originalDoc.id, locale: 'en', fallbackLocale: false as never, draft: true, depth: 0, overrideAccess: true })
      .catch(() => null)
    if (!en) return data
    const title = typeof data?.title === 'string' ? data.title.trim() : undefined
    const enTitle = typeof en.title === 'string' ? en.title.trim() : ''
    const titleCopied = !!enTitle && title === enTitle && String(originalDoc.title || '').trim() !== enTitle
    const contentCopied = !blank(en.content) && same(data?.content, en.content) && !same(originalDoc.content, en.content)
    if (titleCopied || contentCopied) {
      throw new APIError(
        'Схоже на те що в українську версію потрапив англійський текст — зміни не збережено. Оновіть сторінку (F5) і перевірте що вгорі праворуч вибрано «Локалізація: Українська».',
        400,
        null,
        true,
      )
    }
    return data
  }
