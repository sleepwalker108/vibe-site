import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-sqlite'

// Верхнє меню: розділ «Цифрові системи відновлення» перейменовується на коротше «Цифрові системи»
// (англійською — «Digital systems»), щоб меню вміщувалось в один рядок. Розділ — той, де є посилання на ГІС РР.
// Структуру бази не змінює; можна безпечно запускати повторно.

const MARK = 'gisrr.gov.ua'
const RENAME = {
  uk: { from: 'Цифрові системи відновлення', to: 'Цифрові системи' },
  en: { from: 'Digital recovery systems', to: 'Digital systems' },
}

type Item = { id?: string | null; label: string; url?: string | null; children?: Item[] | null }

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  try {
    for (const locale of ['uk', 'en'] as const) {
      const nav = (await payload.findGlobal({
        slug: 'navigation',
        locale,
        fallbackLocale: false as never,
        depth: 0,
        req,
        overrideAccess: true,
      })) as { items?: Item[] | null }
      const items = nav.items || []
      const hit = items.find((i) => i.label === RENAME[locale].from && JSON.stringify(i).includes(MARK))
      if (!hit) continue // уже перейменовано або назву змінили в адмінці
      const next = items.map((i) => (i === hit ? { ...i, label: RENAME[locale].to } : i))
      await payload.updateGlobal({ slug: 'navigation', locale, data: { items: next, _status: 'published' } as never, req, overrideAccess: true })
    }
    payload.logger.info('Меню: розділ цифрових систем — «Цифрові системи»')
  } catch (e) {
    payload.logger.warn(`Меню: розділ «Цифрові системи відновлення» не перейменовано автоматично (${(e as Error).message}) — перейменуйте в адмінці`)
  }
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // назву за потреби змінює адміністратор: «Сайт» → «Меню сайту»
}
