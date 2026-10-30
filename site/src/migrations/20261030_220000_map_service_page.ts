import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-sqlite'
import { toLexicalBlocks, type SimpleBlock } from '../scripts/lib/lexical'

// Розділ меню «Цифрові системи»: третя сторінка — «Картографічний веб-сервіс» (/mapa-terytorij) за постановою КМУ
// від 7 травня 2022 р. № 562 (Положення про інформаційну систему переліку територій, на яких ведуться (велися)
// бойові дії або тимчасово окупованих РФ; у редакції № 1142 від 17.09.2026). Українською та англійською.
// Сторінка створюється, лише якщо такої адреси ще немає; підпункт меню додається, лише якщо його ще немає.
// Структуру бази не змінює; можна безпечно запускати повторно; сторінку й меню потім вільно редагують в адмінці.

const SLUG = 'mapa-terytorij'
const MAP = 'https://map.minre.gov.ua/'
const LAW = 'https://zakon.rada.gov.ua/laws/show/562-2022-%D0%BF#Text'
const MENU = { uk: 'Картографічний веб-сервіс', en: 'Map web service' }

let n = 0
const id = () => `ms${Date.now().toString(36)}${n++}`
const cards = (items: { icon: string; title: string; text: string; url?: string }[]): SimpleBlock => ({
  raw: { type: 'block', version: 2, format: '', fields: { id: id(), blockName: '', blockType: 'cards', items: items.map((it) => ({ id: id(), ...it })) } },
})

const PAGE: Record<'uk' | 'en', { title: string; content: SimpleBlock[] }> = {
  uk: {
    title: 'Картографічний веб-сервіс',
    content: [
      {
        p: '**Картографічний веб-сервіс** — інтерактивна мапа, яка показує статус громад і населених пунктів із переліку територій, на яких ведуться (велися) бойові дії або тимчасово окупованих Російською Федерацією. Сервіс є складовою державної інформаційної системи переліку територій: один погляд на мапу — і видно актуальний статус потрібної території.',
      },
      cards([
        {
          icon: 'map',
          title: 'Відкрити мапу територій',
          text: 'Актуальний статус територій на електронній мапі — українською та англійською',
          url: MAP,
        },
      ]),
      { h2: 'Що дає сервіс' },
      cards([
        {
          icon: 'map',
          title: 'Статус на мапі',
          text: 'Систематизоване відображення електронних карт і статусу територій, включених до переліку, затвердженого Мінрозвитку.',
        },
        {
          icon: 'document',
          title: 'Єдина база даних',
          text: 'Дані про території та зміну їх статусу збираються, перевіряються та зберігаються в одній державній системі.',
        },
        {
          icon: 'globe',
          title: 'Двома мовами',
          text: 'Інформація на вебресурсі доступна українською та англійською — переклад забезпечує Агенція.',
        },
        {
          icon: 'search',
          title: 'Відкрито для всіх',
          text: 'Громадяни та організації мають право отримувати інформацію, розміщену в системі.',
        },
      ]),
      { h2: 'Як дані потрапляють на мапу' },
      {
        p: 'Після набрання чинності змінами до переліку пропозиції щодо статусу території, дат початку й завершення бойових дій чи тимчасової окупації вносяться до системи **не пізніше наступного робочого дня**:',
      },
      {
        ol: [
          '**Обласні та Київська міська військові адміністрації** вносять пропозиції, заповнюючи електронні поля системи.',
          '**Міноборони** погоджує пропозиції або обґрунтовано відхиляє їх.',
          '**Агенція як адміністратор системи** невідкладно затверджує пропозиції або обґрунтовано відхиляє їх — і статус території оновлюється.',
        ],
      },
      { h2: 'Інформаційні довідки' },
      {
        p: 'Система формує інформаційні довідки українською або англійською мовою, зокрема для цілей зовнішньоекономічної діяльності:',
      },
      cards([
        {
          icon: 'building',
          title: 'Для підприємств і ФОП',
          text: 'За кодом ЄДРПОУ чи реєстраційним номером облікової картки платника податків — довідка про статус території, де зареєстровано місцезнаходження.',
        },
        {
          icon: 'home',
          title: 'Для населеного пункту',
          text: 'За поштовим індексом або кодом населеного пункту за Кодифікатором адміністративно-територіальних одиниць — довідка про статус території.',
        },
      ]),
      { p: 'На кожну довідку накладається кваліфікована електронна печатка адміністратора системи — Агенції.' },
      { h2: 'Роль Агенції' },
      {
        p: 'Власником і розпорядником системи є держава в особі Мінрозвитку. ДНТ «Національна агенція розвитку територій України» є **адміністратором і технічним адміністратором** інформаційної системи, зокрема картографічного веб-сервісу. Агенція:',
      },
      {
        ul: [
          'забезпечує адміністрування, технічну підтримку та безперебійну роботу системи;',
          'надає й припиняє доступ користувачам, веде їх облік;',
          'захищає та зберігає інформацію, постійно стежить за технічним станом системи;',
          'інтегрує до системи інформаційні ресурси органів влади;',
          'затверджує або обґрунтовано відхиляє пропозиції щодо статусу територій;',
          'навчає користувачів і надає їм технічну та інформаційну підтримку;',
          'забезпечує переклад інформації на вебресурсі англійською мовою.',
        ],
      },
      { h2: 'Хто працює із системою' },
      cards([
        {
          icon: 'building',
          title: 'Органи влади',
          text: 'Мінцифри, Міноборони, Мінсоцполітики, обласні та Київська міська військові адміністрації, інші органи — через електронний кабінет із кваліфікованим електронним підписом.',
        },
        {
          icon: 'heart',
          title: 'Громадяни та бізнес',
          text: 'Переглядають мапу, перевіряють статус території, отримують інформаційні довідки.',
        },
      ]),
      {
        p: 'Дані системи використовують інші державні ресурси — зокрема **DREAM**, система управління публічними інвестиціями у відновлення.',
      },
      { h2: 'Правова основа' },
      {
        p: 'Постанова Кабінету Міністрів України від 7 травня 2022 р. № 562 «Про затвердження Положення про інформаційну систему переліку територій, на яких ведуться (велися) бойові дії або тимчасово окупованих Російською Федерацією».',
      },
      { link: 'Текст постанови на сайті Верховної Ради', url: LAW },
    ],
  },
  en: {
    title: 'Map web service',
    content: [
      {
        p: 'The **map web service** is an interactive map showing the status of communities and settlements on the list of territories where hostilities are (were) conducted or that are temporarily occupied by the Russian Federation. The service is part of the state information system of the list of territories: one look at the map shows the current status of the territory you need.',
      },
      cards([
        {
          icon: 'map',
          title: 'Open the territories map',
          text: 'The current status of territories on an electronic map — in Ukrainian and English',
          url: MAP,
        },
      ]),
      { h2: 'What the service provides' },
      cards([
        { icon: 'map', title: 'Status on the map', text: 'Systematic display of electronic maps and the status of territories included in the list approved by the Ministry for Development.' },
        { icon: 'document', title: 'A single database', text: 'Data on territories and changes in their status are collected, verified and stored in one state system.' },
        { icon: 'globe', title: 'In two languages', text: 'Information on the web resource is available in Ukrainian and English — the translation is ensured by the Agency.' },
        { icon: 'search', title: 'Open to everyone', text: 'Citizens and organisations have the right to receive the information published in the system.' },
      ]),
      { h2: 'How data gets onto the map' },
      {
        p: 'Once changes to the list take effect, proposals on the status of a territory and the start and end dates of hostilities or temporary occupation are entered into the system **no later than the next working day**:',
      },
      {
        ol: [
          '**Regional and Kyiv City military administrations** submit proposals by filling in the electronic fields of the system.',
          '**The Ministry of Defence** approves the proposals or rejects them with justification.',
          '**The Agency, as the system administrator,** promptly approves the proposals or rejects them with justification — and the status of the territory is updated.',
        ],
      },
      { h2: 'Information certificates' },
      { p: 'The system generates information certificates in Ukrainian or English, in particular for foreign economic activity:' },
      cards([
        {
          icon: 'building',
          title: 'For companies and sole proprietors',
          text: 'By EDRPOU code or taxpayer registration number — a certificate on the status of the territory where the registered address is located.',
        },
        {
          icon: 'home',
          title: 'For a settlement',
          text: 'By postal code or the settlement code under the Codifier of administrative-territorial units — a certificate on the status of the territory.',
        },
      ]),
      { p: 'Each certificate bears the qualified electronic seal of the system administrator — the Agency.' },
      { h2: 'Role of the Agency' },
      {
        p: 'The system is owned and managed by the state, represented by the Ministry for Development. The National Agency for Territorial Development of Ukraine is the **administrator and technical administrator** of the information system, including the map web service. The Agency:',
      },
      {
        ul: [
          'ensures administration, technical support and uninterrupted operation of the system;',
          'grants and terminates user access and keeps records of users;',
          'protects and stores information and constantly monitors the technical condition of the system;',
          'integrates information resources of public authorities into the system;',
          'approves or rejects with justification proposals on the status of territories;',
          'trains users and provides them with technical and information support;',
          'ensures translation of the information on the web resource into English.',
        ],
      },
      { h2: 'Who works with the system' },
      cards([
        {
          icon: 'building',
          title: 'Public authorities',
          text: 'The Ministry of Digital Transformation, the Ministry of Defence, the Ministry of Social Policy, regional and Kyiv City military administrations and other bodies — via an electronic cabinet with a qualified electronic signature.',
        },
        { icon: 'heart', title: 'Citizens and businesses', text: 'View the map, check the status of a territory and receive information certificates.' },
      ]),
      { p: 'Data from the system is used by other state resources — in particular **DREAM**, the system for managing public investment in recovery.' },
      { h2: 'Legal basis' },
      {
        p: 'Resolution of the Cabinet of Ministers of Ukraine No. 562 of 7 May 2022 approving the Regulation on the information system of the list of territories where hostilities are (were) conducted or that are temporarily occupied by the Russian Federation.',
      },
      { link: 'Text of the resolution (in Ukrainian)', url: LAW },
    ],
  },
}

type Item = { id?: string | null; label: string; url?: string | null; children?: Item[] | null }

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  try {
    // сторінка
    const { totalDocs } = await payload.find({ collection: 'pages', where: { slug: { equals: SLUG } }, limit: 1, depth: 0, req, overrideAccess: true, trash: true } as never)
    if (!totalDocs) {
      const doc = await payload.create({
        collection: 'pages',
        locale: 'uk',
        data: { title: PAGE.uk.title, slug: SLUG, content: toLexicalBlocks(PAGE.uk.content), _status: 'published' } as never,
        req,
        overrideAccess: true,
      })
      await payload.update({
        collection: 'pages',
        id: doc.id,
        locale: 'en',
        data: { title: PAGE.en.title, content: toLexicalBlocks(PAGE.en.content), _status: 'published' } as never,
        req,
        overrideAccess: true,
      })
    }

    // меню: підпункт у «Цифрових системах» (розділ — той, де є ГІС РР)
    const read = async (locale: 'uk' | 'en') =>
      ((await payload.findGlobal({ slug: 'navigation', locale, fallbackLocale: false as never, depth: 0, req, overrideAccess: true })) as {
        items?: Item[] | null
      }).items || []
    const items = await read('uk')
    const section = items.find((i) => (i.children || []).some((c) => /gis-rr|gisrr\.gov\.ua/.test(c.url || '')))
    if (section && !(section.children || []).some((c) => c.url === `/${SLUG}` || (c.url || '').includes('map.minre.gov.ua'))) {
      const enLabels = new Map((await read('en')).flatMap((i) => [[i.id, i.label] as const, ...(i.children || []).map((c) => [c.id, c.label] as const)]))
      const next = items.map((i) => (i === section ? { ...i, children: [...(i.children || []), { label: MENU.uk, url: `/${SLUG}` }] } : i))
      await payload.updateGlobal({ slug: 'navigation', locale: 'uk', data: { items: next, _status: 'published' } as never, req, overrideAccess: true })
      const en = (await read('uk')).map((i) => ({
        ...i,
        label: enLabels.get(i.id) || i.label,
        children: (i.children || []).map((c) => ({ ...c, label: enLabels.get(c.id) || (c.url === `/${SLUG}` ? MENU.en : c.label) })),
      }))
      await payload.updateGlobal({ slug: 'navigation', locale: 'en', data: { items: en, _status: 'published' } as never, req, overrideAccess: true })
    }
    payload.logger.info('Розділ «Цифрові системи»: сторінка «Картографічний веб-сервіс» створена й додана в меню')
  } catch (e) {
    payload.logger.warn(`Розділ «Цифрові системи»: сторінку «Картографічний веб-сервіс» не створено автоматично (${(e as Error).message})`)
  }
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // сторінку й меню за потреби змінює адміністратор в адмінці
}
