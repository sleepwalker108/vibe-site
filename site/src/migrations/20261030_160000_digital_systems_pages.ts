import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-sqlite'
import { toLexicalBlocks, type SimpleBlock } from '../scripts/lib/lexical'

// Розділ меню «Цифрові системи»: дві сторінки — «ГІС регіонального розвитку» (/gis-rr) і «DREAM» (/dream)
// за постановами КМУ № 522 від 23.05.2023 і № 945 від 15.07.2026 (у редакції № 1142 від 17.09.2026),
// українською та англійською. Підпункти меню починають вести на ці сторінки (сайти систем — з самих сторінок).
// Сторінка створюється, лише якщо такої адреси ще немає; меню змінюється, лише якщо в ньому ще зовнішні посилання.
// Структуру бази не змінює; можна безпечно запускати повторно; сторінки й меню потім вільно редагуються в адмінці.

let n = 0
const id = () => `ds${Date.now().toString(36)}${n++}`
const cards = (items: { icon: string; title: string; text: string; url?: string }[]): SimpleBlock => ({
  raw: { type: 'block', version: 2, format: '', fields: { id: id(), blockName: '', blockType: 'cards', items: items.map((it) => ({ id: id(), ...it })) } },
})
const stat = (number: string, label: string, note: string): SimpleBlock => ({
  raw: { type: 'block', version: 2, format: '', fields: { id: id(), blockName: '', blockType: 'stat', number, label, note } },
})

const LAW_522 = 'https://zakon.rada.gov.ua/laws/show/522-2023-%D0%BF#Text'
const LAW_945 = 'https://zakon.rada.gov.ua/laws/show/945-2026-%D0%BF#Text'

const GIS: Record<'uk' | 'en', { title: string; content: SimpleBlock[] }> = {
  uk: {
    title: 'ГІС регіонального розвитку',
    content: [
      {
        p: 'Єдина геоінформаційна система здійснення моніторингу та оцінювання розвитку регіонів і територіальних громад — **ГІС регіонального розвитку** — збирає в одному місці дані про те, як розвивається кожен регіон і кожна громада. Стратегії, показники й результати — на інтерактивній мапі, щоб рішення про відновлення ухвалювалися на основі фактів.',
      },
      cards([
        {
          icon: 'map',
          title: 'Перейти до ГІС РР',
          text: 'Стратегії розвитку, цілі та показники регіонів і громад на інтерактивній мапі — gisrr.gov.ua',
          url: 'https://gisrr.gov.ua/',
        },
      ]),
      { h2: 'Навіщо потрібна система' },
      {
        p: 'Мета ГІС регіонального розвитку — аналітична обробка інформації для підготовки та ухвалення управлінських рішень щодо відновлення і розвитку регіонів та громад, а також моніторинг і оцінювання того, як ці рішення виконуються.',
      },
      cards([
        {
          icon: 'globe',
          title: 'Дані в одному місці',
          text: 'Статистична, адміністративна інформація та геопросторові дані з різних державних ресурсів — у єдиній базі.',
        },
        {
          icon: 'chart',
          title: 'Аналітика й прогнози',
          text: 'Моделювання та аналіз соціально-економічного стану територій, прогнозування розвитку регіонів і громад.',
        },
        {
          icon: 'document',
          title: 'Стратегії під контролем',
          text: 'Моніторинг і оцінювання стратегій розвитку, пропозиції щодо їх коригування та реалізації регіональної політики.',
        },
        {
          icon: 'info',
          title: 'Відкриті дані',
          text: 'Публічна інформація системи доступна кожному на офіційному вебресурсі, зокрема у формі відкритих даних.',
        },
      ]),
      { h2: 'Роль Агенції' },
      {
        p: 'Власником системи є держава в особі Мінрозвитку. **Адміністратором** ГІС регіонального розвитку визначено ДНТ «Національна агенція розвитку територій України». Агенція забезпечує:',
      },
      {
        ul: [
          'створення, впровадження та сталу роботу системи;',
          'ведення та технічне адміністрування системи, зокрема заходи безпеки;',
          'організацію роботи в системі з авторизованими та зовнішніми користувачами;',
          'обмін даними з іншими державними інформаційними системами та національним геопорталом.',
        ],
      },
      { p: 'Регламент роботи системи затверджує Мінрозвитку за поданням Агенції.' },
      { h2: 'Хто користується' },
      cards([
        {
          icon: 'building',
          title: 'Органи влади та громади',
          text: 'Міністерства, обласні та військові адміністрації, органи місцевого самоврядування вносять дані, стежать за виконанням стратегій і готують аналітичні звіти.',
        },
        {
          icon: 'search',
          title: 'Громадяни та організації',
          text: 'Будь-хто може переглядати публічну інформацію системи та користуватися відкритими даними про розвиток регіонів і громад.',
        },
      ]),
      { h2: 'Правова основа' },
      {
        p: 'Постанова Кабінету Міністрів України від 23 травня 2023 р. № 522 «Про затвердження Порядку функціонування єдиної геоінформаційної системи здійснення моніторингу та оцінювання розвитку регіонів і територіальних громад».',
      },
      { link: 'Текст постанови на сайті Верховної Ради', url: LAW_522 },
    ],
  },
  en: {
    title: 'Regional Development GIS',
    content: [
      {
        p: 'The Unified Geographic Information System for Monitoring and Assessing the Development of Regions and Territorial Communities — the **Regional Development GIS** — brings together data on how every region and community develops. Strategies, indicators and results are shown on an interactive map, so that recovery decisions are based on facts.',
      },
      cards([
        {
          icon: 'map',
          title: 'Go to the Regional Development GIS',
          text: 'Development strategies, goals and indicators of regions and communities on an interactive map — gisrr.gov.ua',
          url: 'https://gisrr.gov.ua/',
        },
      ]),
      { h2: 'Why the system matters' },
      {
        p: 'The purpose of the Regional Development GIS is to provide analytical processing of information for preparing and making management decisions on the recovery and development of regions and communities, and for monitoring and assessing their implementation.',
      },
      cards([
        { icon: 'globe', title: 'Data in one place', text: 'Statistical and administrative information and geospatial data from various state resources in a single database.' },
        { icon: 'chart', title: 'Analytics and forecasts', text: 'Modelling and analysis of the socio-economic situation of territories, forecasting the development of regions and communities.' },
        { icon: 'document', title: 'Strategies under control', text: 'Monitoring and assessment of development strategies, proposals for adjusting them and for implementing regional policy.' },
        { icon: 'info', title: 'Open data', text: 'Public information of the system is available to everyone on its official web resource, including as open data.' },
      ]),
      { h2: 'Role of the Agency' },
      {
        p: 'The system is owned by the state, represented by the Ministry for Development. The National Agency for Territorial Development of Ukraine is the **administrator** of the Regional Development GIS. The Agency ensures:',
      },
      {
        ul: [
          'creation, implementation and stable operation of the system;',
          'maintenance and technical administration of the system, including security measures;',
          'organisation of work in the system with authorised and external users;',
          'data exchange with other state information systems and the national geoportal.',
        ],
      },
      { p: 'The rules of operation of the system are approved by the Ministry for Development on the Agency’s submission.' },
      { h2: 'Who uses it' },
      cards([
        {
          icon: 'building',
          title: 'Authorities and communities',
          text: 'Ministries, regional and military administrations and local self-government bodies enter data, monitor strategies and prepare analytical reports.',
        },
        {
          icon: 'search',
          title: 'Citizens and organisations',
          text: 'Anyone can view the public information of the system and use open data on the development of regions and communities.',
        },
      ]),
      { h2: 'Legal basis' },
      {
        p: 'Resolution of the Cabinet of Ministers of Ukraine No. 522 of 23 May 2023 approving the Procedure for the functioning of the unified geographic information system for monitoring and assessing the development of regions and territorial communities.',
      },
      { link: 'Text of the resolution (in Ukrainian)', url: LAW_522 },
    ],
  },
}

const DREAM: Record<'uk' | 'en', { title: string; content: SimpleBlock[] }> = {
  uk: {
    title: 'DREAM',
    content: [
      {
        p: '**DREAM** — Цифрова інтегрована інформаційно-аналітична система підготовки та моніторингу публічних інвестиційних проєктів і програм. Вона супроводжує кожен проєкт відновлення на державному, регіональному та місцевому рівні: від реєстрації та оцінки до фінансування, реалізації й підсумкової оцінки — і робить цей шлях прозорим для всіх.',
      },
      cards([
        {
          icon: 'chart',
          title: 'Перейти до DREAM',
          text: 'Проєкти відновлення, їхній стан і фінансування — відкрито й у режимі реального часу на dream.gov.ua',
          url: 'https://dream.gov.ua/',
        },
      ]),
      stat('24/7', 'доступ до системи — безоплатно', 'Публічна інформація DREAM відкрита для кожного на порталі dream.gov.ua у режимі реального часу.'),
      { h2: 'Шлях проєкту в DREAM' },
      {
        ol: [
          '**Реєстрація** проєкту чи програми зі стандартизованими показниками та обґрунтуванням.',
          '**Оцінка й пріоритезація** — галузева та експертна, формування проєктних портфелів держави, регіонів і громад.',
          '**Моніторинг** підготовки та реалізації проєкту на кожному етапі.',
          '**Завершальна оцінка** реалізації та постінвестиційна оцінка масштабних проєктів.',
        ],
      },
      { h2: 'З чого складається система' },
      cards([
        { icon: 'document', title: 'Центральна база даних', text: 'Безпечне зберігання інформації та швидка, надійна й безперервна передача даних.' },
        { icon: 'building', title: 'Електронний кабінет', text: 'Робоче місце органів влади й організацій: внесення проєктів, погодження, звітність, аналітичні дашборди.' },
        { icon: 'globe', title: 'Портал dream.gov.ua', text: 'Відкритий і безоплатний доступ громадськості до публічної інформації, зокрема у формі відкритих даних.' },
      ]),
      { h2: 'Роль Агенції' },
      {
        p: 'Власником системи є держава в особі Мінрозвитку. **Технічним адміністратором** DREAM визначено ДНТ «Національна агенція розвитку територій України» — систему передано Агенції на адміністрування. Агенція забезпечує:',
      },
      {
        ul: [
          'безперервну роботу програмного забезпечення, резервне копіювання та усунення збоїв;',
          'авторизацію користувачів і розмежування прав доступу, облік дій у системі;',
          'реєстрацію адміністраторів органів влади й громад, блокування та анулювання доступу у визначених випадках;',
          'технічну та інформаційну підтримку, навчання й консультації користувачів;',
          'обмін даними з іншими державними системами та пропозиції щодо вдосконалення DREAM.',
        ],
      },
      { h2: 'Як органу влади почати роботу' },
      {
        ol: [
          'Керівник органу визначає розпорядчим документом адміністратора органу в системі та надсилає його копію на електронну адресу, визначену Мінрозвитку.',
          'Агенція реєструє адміністратора — він отримує листа із запрошенням до електронного кабінету.',
          'Адміністратор входить до кабінету, проходить електронну ідентифікацію та надає доступ співробітникам і підпорядкованим організаціям.',
        ],
      },
      { p: 'Рекомендації та роз’яснення щодо роботи в електронному кабінеті розміщені на порталі dream.gov.ua.' },
      { h2: 'Інтеграції' },
      {
        p: 'DREAM обмінюється даними через систему «Трембіта» з Prozorro, Єдиним вебпорталом використання публічних коштів, Єдиною державною електронною системою у сфері будівництва, Реєстром пошкодженого та знищеного майна, системами «ГРК-ВЕБ» і LOGIСA, ЄДР, **ГІС регіонального розвитку** та іншими державними ресурсами.',
      },
      { h2: 'Правова основа' },
      {
        p: 'Постанова Кабінету Міністрів України від 15 липня 2026 р. № 945 «Деякі питання функціонування Цифрової інтегрованої інформаційно-аналітичної системи підготовки та моніторингу публічних інвестиційних проектів та програм публічних інвестицій (DREAM)».',
      },
      { link: 'Текст постанови на сайті Верховної Ради', url: LAW_945 },
    ],
  },
  en: {
    title: 'DREAM',
    content: [
      {
        p: '**DREAM** is the Digital Integrated Information and Analytical System for the preparation and monitoring of public investment projects and programmes. It follows every recovery project at the national, regional and local level — from registration and appraisal to financing, implementation and final evaluation — and makes this path transparent to everyone.',
      },
      cards([
        {
          icon: 'chart',
          title: 'Go to DREAM',
          text: 'Recovery projects, their status and financing — openly and in real time at dream.gov.ua',
          url: 'https://dream.gov.ua/en',
        },
      ]),
      stat('24/7', 'access to the system — free of charge', 'Public information in DREAM is open to everyone in real time on the dream.gov.ua portal.'),
      { h2: 'A project’s path in DREAM' },
      {
        ol: [
          '**Registration** of a project or programme with standardised indicators and justification.',
          '**Appraisal and prioritisation** — sectoral and expert, forming project portfolios of the state, regions and communities.',
          '**Monitoring** of preparation and implementation at every stage.',
          '**Final evaluation** of implementation and ex-post evaluation of large-scale projects.',
        ],
      },
      { h2: 'What the system consists of' },
      cards([
        { icon: 'document', title: 'Central database', text: 'Secure storage of information and fast, reliable and continuous data transfer.' },
        { icon: 'building', title: 'Electronic cabinet', text: 'The workspace of authorities and organisations: submitting projects, approvals, reporting, analytical dashboards.' },
        { icon: 'globe', title: 'dream.gov.ua portal', text: 'Open and free public access to public information, including as open data.' },
      ]),
      { h2: 'Role of the Agency' },
      {
        p: 'The system is owned by the state, represented by the Ministry for Development. The National Agency for Territorial Development of Ukraine is the **technical administrator** of DREAM — the system has been transferred to the Agency for administration. The Agency ensures:',
      },
      {
        ul: [
          'continuous operation of the software, backups and troubleshooting;',
          'user authorisation, separation of access rights and logging of actions in the system;',
          'registration of administrators of authorities and communities, blocking and revoking access where provided;',
          'technical and information support, training and consultations for users;',
          'data exchange with other state systems and proposals for improving DREAM.',
        ],
      },
      { h2: 'How an authority gets started' },
      {
        ol: [
          'The head of the authority appoints its administrator in the system by an administrative document and sends a copy to the e-mail address set by the Ministry for Development.',
          'The Agency registers the administrator, who receives an e-mail invitation to the electronic cabinet.',
          'The administrator signs in, passes electronic identification and grants access to staff and subordinate organisations.',
        ],
      },
      { p: 'Guidance on working in the electronic cabinet is published on the dream.gov.ua portal.' },
      { h2: 'Integrations' },
      {
        p: 'Through the Trembita system, DREAM exchanges data with Prozorro, the Unified Web Portal for the Use of Public Funds, the Unified State Electronic System in Construction, the Register of Damaged and Destroyed Property, the GRK-WEB and LOGIСA systems, the Unified State Register of legal entities, the **Regional Development GIS** and other state resources.',
      },
      { h2: 'Legal basis' },
      {
        p: 'Resolution of the Cabinet of Ministers of Ukraine No. 945 of 15 July 2026 on certain issues of the functioning of the Digital Integrated Information and Analytical System for the preparation and monitoring of public investment projects and programmes (DREAM).',
      },
      { link: 'Text of the resolution (in Ukrainian)', url: LAW_945 },
    ],
  },
}

const PAGES = [
  { slug: 'gis-rr', data: GIS, external: 'gisrr.gov.ua' },
  { slug: 'dream', data: DREAM, external: 'dream.gov.ua' },
]

type Item = { id?: string | null; label: string; url?: string | null; children?: Item[] | null }

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  try {
    // сторінки
    for (const p of PAGES) {
      const { totalDocs } = await payload.find({ collection: 'pages', where: { slug: { equals: p.slug } }, limit: 1, depth: 0, req, overrideAccess: true, trash: true } as never)
      if (totalDocs) continue // сторінка вже є
      const doc = await payload.create({
        collection: 'pages',
        locale: 'uk',
        data: { title: p.data.uk.title, slug: p.slug, content: toLexicalBlocks(p.data.uk.content), _status: 'published' } as never,
        req,
        overrideAccess: true,
      })
      await payload.update({
        collection: 'pages',
        id: doc.id,
        locale: 'en',
        data: { title: p.data.en.title, content: toLexicalBlocks(p.data.en.content), _status: 'published' } as never,
        req,
        overrideAccess: true,
      })
    }

    // меню: підпункти «Цифрових систем» — на нові сторінки замість зовнішніх сайтів
    const nav = (await payload.findGlobal({ slug: 'navigation', locale: 'uk', depth: 0, req, overrideAccess: true })) as { items?: Item[] | null }
    const items = nav.items || []
    let changed = false
    const next = items.map((i) => ({
      ...i,
      children: (i.children || []).map((c) => {
        const p = PAGES.find((pg) => c.url && c.url.includes(pg.external))
        if (!p) return c
        changed = true
        return { ...c, url: `/${p.slug}` }
      }),
    }))
    if (changed) {
      await payload.updateGlobal({ slug: 'navigation', locale: 'uk', data: { items: next, _status: 'published' } as never, req, overrideAccess: true })
    }
    payload.logger.info('Розділ «Цифрові системи»: сторінки «ГІС регіонального розвитку» і «DREAM» створено й додано в меню')
  } catch (e) {
    payload.logger.warn(`Розділ «Цифрові системи»: сторінки не створено автоматично (${(e as Error).message})`)
  }
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // сторінки й меню за потреби змінює адміністратор в адмінці
}
