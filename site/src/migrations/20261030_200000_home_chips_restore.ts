import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-sqlite'

// Головна, картка 1548: відновлення плашок. На сервері міграція home_hero_no_text (170000) виконалась раніше
// за home_chip_links (180000), яка додає колонку url для плашок: запис головної впав посередині й плашки картки
// 1548 стерлися. Якщо на картці 1548 плашок немає — повертаємо три: телефон із месенджерами, бот і «Портал 1548».
// Структуру бази не змінює; можна безпечно запускати повторно (картку з плашками не чіпає).

const CHIPS = [
  { uk: '+38 (096) 078-84-33 · Viber / WhatsApp / Telegram', en: '+38 (096) 078-84-33 · Viber / WhatsApp / Telegram' },
  { uk: '@1548_MinRe_bot', en: '@1548_MinRe_bot' },
  { uk: 'Портал 1548', en: '1548 Portal', url: 'https://1548.gov.ua/' },
]

type Chip = { id?: string | null; text: string; url?: string | null }
type Card = { id?: string | null; number?: string | null; chips?: Chip[] | null }

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  try {
    const uk = (await payload.findGlobal({ slug: 'home', locale: 'uk', depth: 0, req, overrideAccess: true })) as { cards?: Card[] | null }
    const cards = uk?.cards || []
    const card = cards.find((c) => String(c.number || '').trim() === '1548')
    if (!card || card.chips?.length) return // картки немає або плашки на місці

    const saved = (await payload.updateGlobal({
      slug: 'home',
      locale: 'uk',
      data: {
        cards: cards.map((c) => (c === card ? { ...c, chips: CHIPS.map((ch) => ({ text: ch.uk, url: ch.url || null })) } : c)),
        _status: 'published',
      } as never,
      req,
      overrideAccess: true,
    })) as { cards?: Card[] | null }
    const ids = (saved.cards || []).find((c) => c.id === card.id)?.chips?.map((ch) => ch.id) || []

    const en = (await payload.findGlobal({ slug: 'home', locale: 'en', depth: 0, req, overrideAccess: true })) as { cards?: Card[] | null }
    await payload.updateGlobal({
      slug: 'home',
      locale: 'en',
      data: {
        cards: (en.cards || []).map((c) => ({
          ...c,
          chips: (c.chips || []).map((ch) => {
            const n = ids.indexOf(ch.id)
            return n < 0 ? ch : { ...ch, text: CHIPS[n].en }
          }),
        })),
        _status: 'published',
      } as never,
      req,
      overrideAccess: true,
    })
    payload.logger.info('Головна: плашки картки 1548 відновлено (телефон, бот, «Портал 1548»)')
  } catch (e) {
    payload.logger.warn(`Головна: плашки картки 1548 не відновлено автоматично (${(e as Error).message}) — додайте в адмінці`)
  }
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // плашки за потреби змінює адміністратор: «Головна» → «Картки»
}
