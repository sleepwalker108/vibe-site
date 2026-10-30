import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-sqlite'

// Головна, перший екран: прибрано підзаголовок під назвою («Цілодобова допомога громадянам у складних ситуаціях…»)
// українською та англійською. Порожнє поле на сайті не показується; текст за потреби можна повернути в адмінці:
// «Головна» → «Перший екран» → «Підзаголовок». Структуру бази не змінює.

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  try {
    for (const locale of ['uk', 'en'] as const) {
      const home = (await payload.findGlobal({ slug: 'home', locale, fallbackLocale: false as never, depth: 0, req, overrideAccess: true })) as {
        hero?: { title?: string; text?: string | null }
      }
      if (!home?.hero?.title || !home.hero.text) continue // порожня головна (нова база) або підзаголовка вже немає
      await payload.updateGlobal({
        slug: 'home',
        locale,
        data: { hero: { ...home.hero, text: '' }, _status: 'published' } as never,
        req,
        overrideAccess: true,
      })
    }
    payload.logger.info('Головна: прибрано підзаголовок першого екрана')
  } catch (e) {
    payload.logger.warn(`Головна: підзаголовок першого екрана не прибрано автоматично (${(e as Error).message}) — очистіть його в адмінці`)
  }
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // текст за потреби повертає адміністратор: «Головна» → «Перший екран» → «Підзаголовок»
}
