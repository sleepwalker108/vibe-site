// Англійська версія текстів з адмінки (головна, меню, статистика, звіт, мапа, контакти).
// Переклад прив'язаний до українського тексту: якщо рядок змінили — він лишиться українським, поки не перекладуть.
// Запуск: npx cross-env NODE_OPTIONS=--no-deprecation payload run src/scripts/translate-en.ts
import { getPayload } from 'payload'
import config from '../payload.config'

const payload = await getPayload({ config: await config })

const EN: Record<string, string> = {
  // перший екран і гасло
  'Державне некомерційне товариство': 'State non-profit company',
  'Національна агенція розвитку територій України': 'National Agency for Territorial Development of Ukraine',
  'Цілодобова допомога громадянам у складних ситуаціях: евакуація, житло, виплати для ВПО, пошук зниклих безвісти':
    '24/7 assistance to citizens in difficult situations: evacuation, housing, IDP payments, search for missing persons',
  'Подзвонити 1548': 'Call 1548',
  'Перелік територій бойових дій': 'List of combat-affected territories',
  'Гарячі лінії 1548 та 1648: швидка й надійна допомога українцям — щодня, цілодобово':
    'Hotlines 1548 and 1648: fast and reliable help for Ukrainians — every day, around the clock',
  'Консультуємо з питань евакуації, житла, соціальних виплат, військовополонених, примусово депортованих та зниклих безвісти осіб.':
    'We advise on evacuation, housing, social payments, prisoners of war, forcibly deported and missing persons.',
  // картки
  'Цілодобово · безкоштовно': '24/7 · free of charge',
  'Гаряча лінія з кризових питань': 'Crisis hotline',
  'Надаємо швидку та надійну допомогу українським громадянам у складних ситуаціях: евакуація, житло, виплати для ВПО':
    'Fast and reliable help for Ukrainian citizens in difficult situations: evacuation, housing, IDP payments',
  'Детальніше': 'Learn more',
  '1,4 млн звернень з 2022 року': '1.4 million requests since 2022',
  'Гаряча лінія': 'Hotline',
  'Військовополонені, примусово депортовані та зниклі безвісти': 'Prisoners of war, forcibly deported and missing persons',
  'Уповноважений з питань ВПО': 'IDP Commissioner',
  'Цілодобова гаряча лінія': '24/7 hotline',
  'Актуальний перелік': 'Current list',
  'Території, на яких ведуться (велися) бойові дії або тимчасово окуповані РФ':
    'Territories where hostilities are (were) taking place or temporarily occupied by the RF',
  'Переглянути перелік': 'View the list',
  'Корисна інформація': 'Useful information',
  'Інформація для громадян, які звертаються на гарячі лінії 1548 та 1648':
    'Information for citizens contacting hotlines 1548 and 1648',
  'Читати': 'Read',
  // евакуація
  'Подзвоніть зараз та дізнайтеся': 'Call now and find out',
  'все, що вас хвилює про виїзд': 'everything you need to know about leaving',
  'Транспорт': 'Transport',
  'Вас заберуть автобусом або спецтранспортом для маломобільних людей із можливістю перевезення лежачих':
    'You will be picked up by bus or by special transport for people with limited mobility, including bedridden people',
  'Транзитний центр': 'Transit centre',
  'Тут допоможуть з документами, квитками, нагодують та поселять': 'Help with documents and tickets, food and accommodation',
  'Житло': 'Housing',
  'За кілька днів вам підшукають безкоштовне місце тимчасового проживання (МТП)':
    'Within a few days you will be offered a free temporary accommodation place',
  'Виплати': 'Payments',
  '→ Одноразова виплата 12 300 грн на людину\n→ Щомісячні виплати для ВПО':
    '→ One-time payment of UAH 12,300 per person\n→ Monthly IDP payments',
  'Буде складно': 'It will be hard',
  'але врешті все буде добре': 'but in the end everything will be fine',
  // корисні ресурси
  Мінрозвитку: 'Ministry for Development',
  'Міністерство розвитку громад та територій': 'Ministry for Development of Communities and Territories',
  'Національне інформаційне бюро': 'National Information Bureau',
  'Пошук полонених, зниклих безвісти, депортованих': 'Search for prisoners, missing and deported persons',
  'Портал 1548': '1548 portal',
  'Вебпортал гарячої лінії 1548': 'Web portal of the 1548 hotline',
  'Офіційна платформа збору коштів': 'Official fundraising platform',
  'Мінна безпека': 'Mine safety',
  'Як поводитися з вибухонебезпечними предметами': 'How to handle explosive objects',
  Прихисток: 'Prykhystok (Shelter)',
  'Компенсація за розміщення ВПО': 'Compensation for hosting IDPs',
  // меню
  'Про нас': 'About us',
  Діяльність: 'Activities',
  Керівництво: 'Management',
  'Цілодобова Гаряча лінія Уповноваженого з питань ВПО': '24/7 Hotline of the IDP Commissioner',
  'Цілодобова Гаряча лінія з кризових питань 1548': '24/7 Crisis Hotline 1548',
  'Запобігання корупції': 'Anti-corruption',
  'Антикорупційна програма ДНТ «Національна агенція розвитку територій України»':
    'Anti-corruption programme of the National Agency for Territorial Development of Ukraine',
  'Контакти Уповноваженого з питань корупції': 'Anti-corruption officer contacts',
  'Фінансова звітність': 'Financial reports',
  Бюджет: 'Budget',
  Закупівлі: 'Procurement',
  'Звіти діяльності підприємства': 'Activity reports',
  Законодавство: 'Legislation',
  'Перелік законів, актів та постанов': 'Laws, acts and resolutions',
  Вакансії: 'Vacancies',
  'Доступні вакансії та контакти': 'Open vacancies and contacts',
  Відеоматеріали: 'Videos',
  // статистика
  'Звіт роботи гарячих ліній': 'Hotline performance report',
  'від початку повномасштабного вторгнення рф': 'since the start of the full-scale russian invasion',
  'Виплата державної допомоги ВПО': 'State assistance payments to IDPs',
  'Грошова допомога від міжнародних організацій': 'Financial aid from international organisations',
  'Отримання гуманітарної допомоги': 'Receiving humanitarian aid',
  'Надання номерів інших установ, організацій, волонтерів': 'Contacts of other institutions, organisations, volunteers',
  Евакуація: 'Evacuation',
  'Виплати грошової допомоги сім’ям військовополонених': 'Payments to families of prisoners of war',
  'Компенсація власникам, програма «Прихисток»': 'Compensation to owners, “Prykhystok” programme',
  'Інші питання ВПО': 'Other IDP issues',
  'З питань безвісти зниклих осіб': 'Missing persons',
  'Реєстр оборонців (пошук інформації, внесення доповнень тощо)': 'Register of defenders (information search, updates, etc.)',
  'Отримання відповідей на звернення / запити': 'Responses to appeals / requests',
  'Різні питання': 'Various issues',
  'Ми надаємо громадянам відповіді оперативно та зручно — зокрема через месенджер.':
    'We answer citizens promptly and conveniently — including via messengers.',
  // річний звіт
  'Річний звіт роботи гарячих ліній': 'Annual hotline report',
  'Підтримка громадян у кризових питаннях': 'Supporting citizens in crisis situations',
  'Гаряча лінія 15-48': 'Hotline 15-48',
  'Гаряча лінія Уповноваженого з питань ВПО': 'IDP Commissioner hotline',
  Месенджери: 'Messengers',
  'Грошова допомога ВПО': 'Financial assistance to IDPs',
  'Консультація щодо Постанови КМУ №332': 'Advice on CMU Resolution No. 332',
  'Контакти установ та організацій': 'Contacts of institutions and organisations',
  'Соціальні виплати': 'Social payments',
  'Інші питання': 'Other issues',
  'Перевірка установ': 'Checking institutions',
  'Додаткові консультації': 'Additional consultations',
  Інше: 'Other',
  // мапа
  'Градація статусів населених пунктів у розрізі областей': 'Status of settlements by region',
  'Згідно з Переліком територій, на яких ведуться (велися) бойові дії або тимчасово окупованих рф':
    'According to the List of territories where hostilities are (were) taking place or temporarily occupied by russia',
  'Перелік територій, на яких ведуться (велися) бойові дії або тимчасово окупованих російською федерацією, затверджений наказом Мінрозвитку від 28.02.2025 № 376 (зі змінами згідно з наказом Мінрозвитку від 16.07.2026 № 1389).':
    'The List of territories where hostilities are (were) taking place or temporarily occupied by the russian federation, approved by Order of the Ministry for Development No. 376 of 28.02.2025 (as amended by Order No. 1389 of 16.07.2026).',
  // контакти
  'ДНТ «Національна агенція розвитку територій України»': 'National Agency for Territorial Development of Ukraine',
  'Національна агенція\nрозвитку територій України': 'National Agency for\nTerritorial Development of Ukraine',
  'м. Київ, бульвар Лесі Українки, 26 А': '26A Lesi Ukrainky Blvd, Kyiv',
  'пн.–чт. 08:00–17:00': 'Mon–Thu 08:00–17:00',
  'пт. 08:00–15:45': 'Fri 08:00–15:45',
  'обідня перерва 12:00–12:45': 'lunch break 12:00–12:45',
  'цілодобово, безкоштовно': '24/7, free of charge',
  '+38 (096) 078-84-33 — Viber / WhatsApp / Telegram': '+38 (096) 078-84-33 — Viber / WhatsApp / Telegram',
  'Telegram-бот @1548_MinRe_bot': 'Telegram bot @1548_MinRe_bot',
  '+38 (066) 813-62-39 — гаряча лінія Уповноваженого з питань ВПО': '+38 (066) 813-62-39 — IDP Commissioner hotline',
}

let missing = new Set<string>()
// Рекурсивно замінює значення перекладених полів; решту (числа, посилання, id) лишає як є
const tr = (v: unknown, key?: string): unknown => {
  if (typeof v === 'string') {
    if (key && ['url', 'id', 'region', 'color', 'size', 'icon', 'blockType', 'number', 'email'].includes(key)) return v
    if (EN[v] !== undefined) return EN[v]
    if (/[А-Яа-яІіЇїЄєҐґ]/.test(v)) missing.add(v)
    return v
  }
  if (Array.isArray(v)) return v.map((x) => tr(x))
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v)
        .filter(([k]) => !['createdAt', 'updatedAt', 'globalType', '_status'].includes(k))
        .map(([k, x]) => [k, tr(x, k)]),
    )
  }
  return v
}

for (const slug of ['home', 'navigation', 'stats', 'annual-report', 'territories', 'contacts'] as const) {
  const doc = await payload.findGlobal({ slug, depth: 0, locale: 'uk', fallbackLocale: false })
  await payload.updateGlobal({ slug, locale: 'en', data: { ...(tr(doc) as object), _status: 'published' } as any })
  payload.logger.info(`✓ ${slug}`)
}
if (missing.size) payload.logger.warn(`Без перекладу (лишаться українською):\n  ${[...missing].join('\n  ')}`)
payload.logger.info('Готово: англійські тексти додано')
process.exit(0)
