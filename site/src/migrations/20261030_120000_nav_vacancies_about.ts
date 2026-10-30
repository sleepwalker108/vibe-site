import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-sqlite'

// Верхнє меню: окремий пункт «Вакансії» прибирається — «Вакансії» стає підпунктом «Про нас» (останнім).
// «Про нас» шукається за підпунктом /diyalnist, «Вакансії» — за посиланням на сторінку вакансій.
// Структуру бази не змінює; можна безпечно запускати повторно; меню потім вільно редагується в адмінці.

const VACANCIES = '/dostupni-vakansiyi-ta-kontakti'
const ABOUT = '/diyalnist'
const LABEL = { uk: 'Вакансії', en: 'Vacancies' }

type Item = { id?: string | null; label: string; url?: string | null; children?: Item[] | null }

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  try {
    const read = async (locale: 'uk' | 'en') =>
      ((await payload.findGlobal({ slug: 'navigation', locale, fallbackLocale: false as never, depth: 0, req, overrideAccess: true })) as {
        items?: Item[] | null
      }).items || []

    const items = await read('uk')
    const about = items.find((i) => i.children?.some((c) => c.url === ABOUT))
    const vac = items.find((i) => i !== about && (i.url === VACANCIES || i.children?.some((c) => c.url === VACANCIES)))
    if (!about || !vac) return // уже перенесено (або меню інше) — нічого не робимо
    const enLabels = new Map((await read('en')).flatMap((i) => [[i.id, i.label] as const, ...(i.children || []).map((c) => [c.id, c.label] as const)]))

    const next = items
      .filter((i) => i !== vac)
      .map((i) => (i === about ? { ...i, children: [...(i.children || []), { label: LABEL.uk, url: VACANCIES }] } : i))
    await payload.updateGlobal({ slug: 'navigation', locale: 'uk', data: { items: next, _status: 'published' } as never, req, overrideAccess: true })

    // англійські назви: в існуючих рядків — як були, у нового підпункту — «Vacancies»
    const saved = await read('uk')
    const en = saved.map((i) => ({
      ...i,
      label: enLabels.get(i.id) || i.label,
      children: (i.children || []).map((c) => ({ ...c, label: enLabels.get(c.id) || (c.url === VACANCIES ? LABEL.en : c.label) })),
    }))
    await payload.updateGlobal({ slug: 'navigation', locale: 'en', data: { items: en, _status: 'published' } as never, req, overrideAccess: true })
    payload.logger.info('Меню: «Вакансії» перенесено в підменю «Про нас»')
  } catch (e) {
    payload.logger.warn(`Меню: «Вакансії» не перенесено автоматично (${(e as Error).message}) — перенесіть в адмінці («Меню сайту»)`)
  }
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // за потреби пункт повертає адміністратор: «Сайт» → «Меню сайту»
}
