import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// Головна, картки: плашка може бути посиланням (поле url). На картці 1548 плашку «1,4 млн звернень з 2022 року»
// замінено на «Портал 1548» → https://1548.gov.ua/ (англійською — «1548 Portal»).
// Лише додає колонки й міняє одну плашку, якщо вона ще є. Можна безпечно запускати повторно.

const PORTAL = { url: 'https://1548.gov.ua/', uk: 'Портал 1548', en: '1548 Portal' }

type Chip = { id?: string | null; text: string; url?: string | null }
type Card = { id?: string | null; number?: string | null; chips?: Chip[] | null }

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const colsOf = async (t: string) =>
    ((await db.all(sql.raw(`PRAGMA table_info(\`${t}\`)`))) as { name: string }[]).map((c) => c.name)
  for (const t of ['home_cards_chips', '_home_v_version_cards_chips']) {
    if (!(await colsOf(t)).includes('url')) await db.run(sql.raw(`ALTER TABLE \`${t}\` ADD \`url\` text;`))
  }

  try {
    const uk = (await payload.findGlobal({ slug: 'home', locale: 'uk', depth: 0, req, overrideAccess: true })) as { cards?: Card[] | null }
    const cards = uk?.cards || []
    const card = cards.find((c) => String(c.number || '').trim() === '1548')
    const chip = card?.chips?.find((ch) => /1,4\s*млн/i.test(ch.text) && !ch.url)
    if (!card || !chip) return // плашки вже немає (замінили чи змінили в адмінці) або головна порожня

    await payload.updateGlobal({
      slug: 'home',
      locale: 'uk',
      data: {
        cards: cards.map((c) =>
          c === card ? { ...c, chips: (c.chips || []).map((ch) => (ch === chip ? { ...ch, text: PORTAL.uk, url: PORTAL.url } : ch)) } : c,
        ),
        _status: 'published',
      } as never,
      req,
      overrideAccess: true,
    })
    const en = (await payload.findGlobal({ slug: 'home', locale: 'en', depth: 0, req, overrideAccess: true })) as { cards?: Card[] | null }
    await payload.updateGlobal({
      slug: 'home',
      locale: 'en',
      data: {
        cards: (en.cards || []).map((c) => ({
          ...c,
          chips: (c.chips || []).map((ch) => (ch.id === chip.id ? { ...ch, text: PORTAL.en } : ch)),
        })),
        _status: 'published',
      } as never,
      req,
      overrideAccess: true,
    })
    payload.logger.info('Головна: на картці 1548 — плашка «Портал 1548» (1548.gov.ua)')
  } catch (e) {
    payload.logger.warn(`Головна: плашку «Портал 1548» не додано автоматично (${(e as Error).message}) — додайте в адмінці`)
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`home_cards_chips\` DROP COLUMN \`url\`;`)
  await db.run(sql`ALTER TABLE \`_home_v_version_cards_chips\` DROP COLUMN \`url\`;`)
}
