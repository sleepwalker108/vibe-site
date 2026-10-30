import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-sqlite'

// Сторінка «Діяльність»: розділ «Цифрові системи відновлення» (ГІС РР, DREAM) переноситься вище —
// одразу після розділу «Що ми робимо». Розділ — заголовок H2 і все до наступного H2.
// Українською та англійською. Структуру бази не змінює; можна безпечно запускати повторно.

const SLUG = 'diyalnist'
const MARK = 'gisrr.gov.ua' // розділ цифрових систем — той, де є посилання на ГІС РР
const AFTER = { uk: 'Що ми робимо', en: 'What we do' }

type Node = { type?: string; tag?: string; children?: { text?: string }[] }

const isH2 = (n: Node) => n.type === 'heading' && n.tag === 'h2'
const text = (n: Node) => (n.children || []).map((c) => c.text || '').join('').trim()

// розбиває вміст на розділи за заголовками H2 (вступ без заголовка — окремий розділ)
const sections = (nodes: Node[]) =>
  nodes.reduce<Node[][]>((acc, n) => {
    if (isH2(n) || !acc.length) acc.push([n])
    else acc[acc.length - 1].push(n)
    return acc
  }, [])

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  try {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { slug: { equals: SLUG } },
      depth: 0,
      limit: 1,
      req,
      overrideAccess: true,
    })
    if (!docs[0]) return // сторінки немає (нова база)

    for (const locale of ['uk', 'en'] as const) {
      const doc = (await payload.findByID({
        collection: 'pages',
        id: docs[0].id,
        locale,
        fallbackLocale: false as never,
        depth: 0,
        req,
        overrideAccess: true,
      })) as { content?: { root?: { children?: Node[] } } }
      const root = doc.content?.root
      if (!root?.children?.length) continue

      const parts = sections(root.children)
      const from = parts.findIndex((p) => JSON.stringify(p).includes(MARK))
      const after = parts.findIndex((p) => isH2(p[0]) && text(p[0]) === AFTER[locale])
      if (from < 0 || after < 0 || from === after + 1) continue // немає що переносити або вже на місці

      const [moved] = parts.splice(from, 1)
      parts.splice(after + (from < after ? 0 : 1), 0, moved)
      const content = { ...doc.content, root: { ...root, children: parts.flat() } }
      await payload.update({
        collection: 'pages',
        id: docs[0].id,
        locale,
        data: { content, _status: 'published' } as never,
        req,
        overrideAccess: true,
      })
    }
    payload.logger.info('Сторінка «Діяльність»: розділ «Цифрові системи відновлення» — одразу після «Що ми робимо»')
  } catch (e) {
    payload.logger.warn(`Сторінка «Діяльність»: розділ про ГІС РР і DREAM не перенесено автоматично (${(e as Error).message}) — перенесіть в адмінці`)
  }
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // порядок розділів за потреби змінює адміністратор: «Сторінки» → «Діяльність»
}
