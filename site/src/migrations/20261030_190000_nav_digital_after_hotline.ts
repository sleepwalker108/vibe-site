import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-sqlite'

// Верхнє меню: розділ «Цифрові системи» (ГІС РР, DREAM) — одразу після «Гарячої лінії».
// «Цифрові системи» шукаються за підпунктом ГІС РР, «Гаряча лінія» — за підпунктом сторінки лінії 1548.
// Структуру бази не змінює; можна безпечно запускати повторно; порядок потім вільно змінюється в адмінці.

const DIGITAL = /gis-rr|gisrr\.gov\.ua/
const HOTLINE = 'garyacha-liniya'

type Item = { id?: string | null; label: string; url?: string | null; children?: Item[] | null }

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  try {
    const read = async (locale: 'uk' | 'en') =>
      ((await payload.findGlobal({ slug: 'navigation', locale, fallbackLocale: false as never, depth: 0, req, overrideAccess: true })) as {
        items?: Item[] | null
      }).items || []

    const items = await read('uk')
    const from = items.findIndex((i) => (i.children || []).some((c) => DIGITAL.test(c.url || '')))
    const hot = items.findIndex((i) => (i.children || []).some((c) => (c.url || '').includes(HOTLINE)))
    if (from < 0 || hot < 0 || from === hot + 1) return // немає що переставляти або вже на місці

    const enLabels = new Map((await read('en')).flatMap((i) => [[i.id, i.label] as const, ...(i.children || []).map((c) => [c.id, c.label] as const)]))
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(hot + (from < hot ? 0 : 1), 0, moved)
    await payload.updateGlobal({ slug: 'navigation', locale: 'uk', data: { items: next, _status: 'published' } as never, req, overrideAccess: true })

    // англійські назви — як були
    const en = (await read('uk')).map((i) => ({
      ...i,
      label: enLabels.get(i.id) || i.label,
      children: (i.children || []).map((c) => ({ ...c, label: enLabels.get(c.id) || c.label })),
    }))
    await payload.updateGlobal({ slug: 'navigation', locale: 'en', data: { items: en, _status: 'published' } as never, req, overrideAccess: true })
    payload.logger.info('Меню: «Цифрові системи» — одразу після «Гарячої лінії»')
  } catch (e) {
    payload.logger.warn(`Меню: «Цифрові системи» не переставлено автоматично (${(e as Error).message}) — перетягніть в адмінці («Меню сайту»)`)
  }
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // порядок пунктів за потреби змінює адміністратор: «Сайт» → «Меню сайту»
}
