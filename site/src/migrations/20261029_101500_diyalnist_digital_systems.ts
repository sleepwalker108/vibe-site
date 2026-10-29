import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-sqlite'
import { toLexicalBlocks, type SimpleBlock } from '../scripts/lib/lexical'

// Сторінка «Діяльність»: розділ «Цифрові системи відновлення» — ГІС регіонального розвитку і DREAM,
// роботу яких забезпечує Товариство (власник — держава в особі Мінрозвитку). Українською та англійською.
// Додається в кінець сторінки, лише якщо розділу ще немає. Структуру бази не змінює.
// Можна безпечно запускати повторно; розділ потім вільно редагується в адмінці.

const SLUG = 'diyalnist'
const MARK = 'gisrr.gov.ua' // розділ уже є, якщо на сторінці є посилання на ГІС РР

// Блок «Картки з іконками» (як у редакторі сторінок)
let n = 0
const cards = (items: { icon: string; title: string; text: string; url: string }[]): SimpleBlock => ({
  raw: {
    type: 'block',
    version: 2,
    format: '',
    fields: {
      id: `dgs${Date.now().toString(36)}${n++}`,
      blockName: '',
      blockType: 'cards',
      items: items.map((it) => ({ id: `dgs${Date.now().toString(36)}${n++}`, ...it })),
    },
  },
})

const UK: SimpleBlock[] = [
  { h2: 'Цифрові системи відновлення' },
  {
    p: 'Відновлення країни починається з точних даних і прозорих рішень. Товариство забезпечує роботу двох державних цифрових систем, власником яких є держава в особі Мінрозвитку.',
  },
  cards([
    {
      icon: 'map',
      title: 'ГІС регіонального розвитку',
      url: 'https://gisrr.gov.ua/',
      text: 'Інтерактивна мапа, на якій зібрані Державна стратегія регіонального розвитку, регіональні й місцеві стратегії та їхні цілі. Дає органам влади й громадам актуальні дані для планування відновлення та оцінки результатів.',
    },
    {
      icon: 'chart',
      title: 'DREAM',
      url: 'https://dream.gov.ua/',
      text: 'Державна цифрова екосистема управління публічними інвестиціями у відновлення: від планування й відбору проєктів до фінансування та реалізації. Працює за принципом «всі бачать все» — кожен може стежити за проєктами в реальному часі.',
    },
  ]),
]

const EN: SimpleBlock[] = [
  { h2: 'Digital recovery systems' },
  {
    p: 'Recovery starts with accurate data and transparent decisions. The Company ensures the operation of two state digital systems owned by the state, represented by the Ministry for Development.',
  },
  cards([
    {
      icon: 'map',
      title: 'Regional Development GIS',
      url: 'https://gisrr.gov.ua/',
      text: 'An interactive map that brings together the State Strategy for Regional Development, regional and local strategies and their goals. It gives authorities and communities up-to-date data for planning recovery and assessing the results.',
    },
    {
      icon: 'chart',
      title: 'DREAM',
      url: 'https://dream.gov.ua/en',
      text: 'The state digital ecosystem for managing public investment in recovery: from planning and selecting projects to financing and implementation. It works on the “everyone sees everything” principle — anyone can follow projects in real time.',
    },
  ]),
]

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  // Через Payload (сторінка читається з усіма полями). Якщо цей крок колись не зможе виконатись —
  // пропускаємо його з попередженням, не ламаючи оновлення сервера.
  try {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { slug: { equals: SLUG } },
      locale: 'uk',
      depth: 0,
      limit: 1,
      req,
      overrideAccess: true,
    })
    const page = docs[0] as { id: number; content?: { root?: { children?: unknown[] } } } | undefined
    if (!page?.content?.root) return // сторінки немає (нова база) — нічого не робимо

    for (const [locale, blocks] of [
      ['uk', UK],
      ['en', EN],
    ] as const) {
      const doc = (await payload.findByID({
        collection: 'pages',
        id: page.id,
        locale,
        fallbackLocale: false as never,
        depth: 0,
        req,
        overrideAccess: true,
      })) as { content?: { root?: { children?: unknown[] } } }
      const root = doc.content?.root
      if (!root?.children?.length) continue // для цієї мови тексту немає — не додаємо розділ окремо
      if (JSON.stringify(root).includes(MARK)) continue // розділ уже є
      const content = { ...doc.content, root: { ...root, children: [...root.children, ...toLexicalBlocks(blocks).root.children] } }
      await payload.update({
        collection: 'pages',
        id: page.id,
        locale,
        data: { content, _status: 'published' } as never,
        req,
        overrideAccess: true,
      })
    }
    payload.logger.info('Сторінка «Діяльність»: додано розділ «Цифрові системи відновлення» (ГІС РР, DREAM)')
  } catch (e) {
    payload.logger.warn(`Сторінка «Діяльність»: розділ про ГІС РР і DREAM не додано автоматично (${(e as Error).message}) — додайте його в адмінці`)
  }
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // розділ за потреби прибирає адміністратор: «Сторінки» → «Діяльність»
}
