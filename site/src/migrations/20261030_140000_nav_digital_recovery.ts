import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-sqlite'

// Верхнє меню: новий розділ «Цифрові системи» з підменю ГІС РР і DREAM — на місці колишнього пункту
// «Вакансії» (перед «Відеоматеріали»; якщо його немає — в кінець). Українською та англійською.
// Структуру бази не змінює; можна безпечно запускати повторно; меню потім вільно редагується в адмінці.

const MARK = 'gisrr.gov.ua' // розділ уже є, якщо в меню є посилання на ГІС РР
const BEFORE = '/video'

const ITEM = {
  uk: { label: 'Цифрові системи', children: ['ГІС регіонального розвитку', 'DREAM'] },
  en: { label: 'Digital systems', children: ['Regional Development GIS', 'DREAM'] },
}
// посилання в меню спільні для обох мов (поле не перекладається); мову DREAM можна перемкнути на самому сайті
const URLS = ['https://gisrr.gov.ua/', 'https://dream.gov.ua/']

type Item = { id?: string | null; label: string; url?: string | null; children?: Item[] | null }

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  try {
    const read = async (locale: 'uk' | 'en') =>
      ((await payload.findGlobal({ slug: 'navigation', locale, fallbackLocale: false as never, depth: 0, req, overrideAccess: true })) as {
        items?: Item[] | null
      }).items || []

    const items = await read('uk')
    if (!items.length || JSON.stringify(items).includes(MARK)) return // меню порожнє (нова база) або розділ уже є
    const enLabels = new Map((await read('en')).flatMap((i) => [[i.id, i.label] as const, ...(i.children || []).map((c) => [c.id, c.label] as const)]))

    const item: Item = { label: ITEM.uk.label, children: ITEM.uk.children.map((label, n) => ({ label, url: URLS[n] })) }
    const at = items.findIndex((i) => i.url === BEFORE)
    const next = at < 0 ? [...items, item] : [...items.slice(0, at), item, ...items.slice(at)]
    await payload.updateGlobal({ slug: 'navigation', locale: 'uk', data: { items: next, _status: 'published' } as never, req, overrideAccess: true })

    // англійська: існуючі рядки — як були, новий розділ — англійською
    const saved = await read('uk')
    const en = saved.map((i) => {
      if (i.label !== ITEM.uk.label || !JSON.stringify(i).includes(MARK)) {
        return { ...i, label: enLabels.get(i.id) || i.label, children: (i.children || []).map((c) => ({ ...c, label: enLabels.get(c.id) || c.label })) }
      }
      return { ...i, label: ITEM.en.label, children: (i.children || []).map((c, n) => ({ ...c, label: ITEM.en.children[n] })) }
    })
    await payload.updateGlobal({ slug: 'navigation', locale: 'en', data: { items: en, _status: 'published' } as never, req, overrideAccess: true })
    payload.logger.info('Меню: додано розділ «Цифрові системи» (ГІС РР, DREAM)')
  } catch (e) {
    payload.logger.warn(`Меню: розділ «Цифрові системи» не додано автоматично (${(e as Error).message}) — додайте в адмінці («Меню сайту»)`)
  }
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // за потреби розділ прибирає адміністратор: «Сайт» → «Меню сайту»
}
