/**
 * Початкове наповнення сайту.
 * Запуск:  npm run seed
 * Можна запускати повторно — новини й сторінки, які вже є, пропускаються.
 */
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import { getPayload } from 'payload'
import config from './payload.config'

const WP = 'https://dp-reintegration.gov.ua/wp-json/wp/v2'
const NEWS_LIMIT = Number(process.env.SEED_NEWS || 30)

const payload = await getPayload({ config: await config })
const editorConfig = await editorConfigFactory.default({ config: payload.config })

const stripTags = (html: string) =>
  new JSDOM(`<body>${html}</body>`).window.document.body.textContent?.replace(/\s+/g, ' ').trim() || ''
const toLexical = (html: string) => convertHTMLToLexical({ editorConfig, html, JSDOM }) as any
const isUkr = (s: string) => /[а-яіїєґ]/i.test(s)
const slugFromLink = (link: string) => {
  const last = new URL(link).pathname.split('/').filter(Boolean).pop() || ''
  try {
    return decodeURIComponent(last)
  } catch {
    return last
  }
}

const uploadImage = async (url: string, alt: string) => {
  try {
    const res = await fetch(url)
    if (!res.ok) return undefined
    const data = Buffer.from(await res.arrayBuffer())
    const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'image.jpg')
    const doc = await payload.create({
      collection: 'media',
      data: { alt },
      file: { data, mimetype: res.headers.get('content-type') || 'image/jpeg', name, size: data.length },
    })
    return doc.id
  } catch (e) {
    payload.logger.warn(`Не вдалося завантажити ${url}: ${(e as Error).message}`)
    return undefined
  }
}

// ---------- Глобальні розділи ----------
payload.logger.info('Заповнюю «Головну», «Статистику», «Контакти»…')

await payload.updateGlobal({
  slug: 'home',
  data: {
    _status: 'published',
    hero: {
      kicker: 'Державне некомерційне товариство',
      title: 'Національна агенція розвитку територій України',
      text: 'Цілодобова допомога громадянам у складних ситуаціях: евакуація, житло, виплати для ВПО, пошук зниклих безвісти',
      primary: { label: 'Подзвонити 1548', url: 'tel:1548' },
      secondary: { label: 'Перелік територій бойових дій', url: 'https://www.minre.gov.ua/' },
      flagSpeed: 0.32,
    },
    statement: {
      title: 'Гарячі лінії 1548 та 1648: швидка й надійна допомога українцям — щодня, цілодобово',
      text: 'Консультуємо з питань евакуації, житла, соціальних виплат, військовополонених, примусово депортованих та зниклих безвісти осіб.',
    },
    cards: [
      {
        color: 'navy', size: 'big', live: true,
        label: 'Цілодобово · безкоштовно', number: '1548',
        title: 'Гаряча лінія з кризових питань',
        text: 'Евакуація, житло, виплати для ВПО та інші питання, що виникли через війну',
        chips: [{ text: '+38 (096) 078-84-33 · Viber / WhatsApp / Telegram' }, { text: '@1548_MinRe_bot' }],
        url: '/cilodobova-garyacha-liniya-z-krizovih-pitan-1548',
      },
      {
        color: 'yellow', size: 'normal', label: 'Гаряча лінія', number: '1648',
        text: 'Військовополонені, примусово депортовані та зниклі безвісти',
      },
      {
        color: 'sky', size: 'normal', label: 'З 2022 року', number: '1,4 млн',
        text: 'українців звернулися на гарячу лінію 1548',
      },
      {
        color: 'white', size: 'wide', label: 'Уповноважений з питань ВПО',
        title: 'Цілодобова гаряча лінія Уповноваженого', text: '+38 (066) 813-62-39',
        linkLabel: 'Детальніше', url: '/cilodobova-garyacha-liniya-upovnovazhenogo-z-pitan-vpo',
      },
      {
        color: 'white', size: 'wide', label: 'Актуальний перелік',
        title: 'Території, на яких ведуться (велися) бойові дії або тимчасово окуповані РФ',
        linkLabel: 'Переглянути перелік', url: 'https://www.minre.gov.ua/',
      },
      {
        color: 'sky', size: 'wide', label: 'Корисна інформація',
        title: 'Відповіді та інфографіка для тих, хто звертається на гарячі лінії 1548 та 1648',
        linkLabel: 'Читати', url: '/infografika',
      },
    ] as any,
    resources: [
      { label: 'Мінрозвитку', url: 'https://www.minre.gov.ua/' },
      { label: 'Національне інформаційне бюро', url: 'https://nib.gov.ua/' },
      { label: 'Портал 1548', url: 'https://1548.in.ua/' },
      { label: 'United24', url: 'https://u24.gov.ua/' },
      { label: 'Мінна безпека', url: 'https://mine.dsns.gov.ua/' },
      { label: 'Прихисток', url: 'https://prykhystok.gov.ua/' },
    ],
  },
})

await payload.updateGlobal({
  slug: 'stats',
  data: {
    _status: 'published',
    show: true,
    asOf: '2026-08-19T12:00:00.000Z',
    title: 'Звіт роботи гарячих ліній',
    subtitle: 'від початку повномасштабного вторгнення рф',
    categories: [
      { name: 'Виплата державної допомоги ВПО', value: 839620 },
      { name: 'Грошова допомога від міжнародних організацій', value: 113765 },
      { name: 'Отримання гуманітарної допомоги', value: 93960 },
      { name: 'Надання номерів інших установ, організацій, волонтерів', value: 131274 },
      { name: 'Евакуація', value: 12195 },
      { name: 'Виплати грошової допомоги сім’ям військовополонених', value: 7536 },
      { name: 'Компенсація власникам, програма «Прихисток»', value: 18669 },
      { name: 'Інші питання ВПО', value: 269389 },
      { name: 'З питань безвісти зниклих осіб', value: 200004 },
      { name: 'Реєстр оборонців (пошук інформації, внесення доповнень тощо)', value: 293414 },
      { name: 'Отримання відповідей на звернення / запити', value: 22921 },
      { name: 'Різні питання', value: 105684 },
    ],
    registered: 72984,
    messengers: 181663,
    note: 'Ми надаємо громадянам відповіді оперативно та зручно — зокрема через месенджер.',
  },
})

await payload.updateGlobal({
  slug: 'contacts',
  data: {
    _status: 'published',
    orgName: 'ДНТ «Національна агенція розвитку територій України»',
    shortName: 'Національна агенція\nрозвитку територій України',
    address: 'м. Київ, бульвар Лесі Українки, 26 А',
    schedule: [{ text: 'пн.–чт. 08:00–17:00' }, { text: 'пт. 08:00–15:45' }, { text: 'обідня перерва 12:00–12:45' }],
    email: 'info@dp-reintegration.gov.ua',
    phones: [{ text: '+38 (093) 367-83-66' }, { text: '+38 (044) 248-15-48' }],
    hotline: {
      number: '1548',
      lines: [
        { text: 'цілодобово, безкоштовно' },
        { text: '+38 (096) 078-84-33 — Viber / WhatsApp / Telegram' },
        { text: 'Telegram-бот @1548_MinRe_bot' },
        { text: '+38 (066) 813-62-39 — гаряча лінія Уповноваженого з питань ВПО' },
      ],
    },
  },
})

// ---------- Новини ----------
payload.logger.info(`Переношу ${NEWS_LIMIT} останніх новин зі старого сайту…`)
let imported = 0
for (let page = 1; imported < NEWS_LIMIT && page <= 20; page++) {
  const res = await fetch(`${WP}/posts?per_page=50&page=${page}&_fields=title,date,link,excerpt,content`)
  if (!res.ok) break
  const posts: any[] = await res.json()
  if (!posts.length) break
  for (const p of posts) {
    if (imported >= NEWS_LIMIT) break
    const title = stripTags(p.title.rendered)
    if (!isUkr(title)) continue // англомовні версії перенесемо окремо
    const exists = await payload.count({ collection: 'news', where: { legacyUrl: { equals: p.link } } })
    if (exists.totalDocs) {
      imported++
      continue
    }
    const html: string = p.content.rendered
    const firstImg = html.match(/<img[^>]+src="([^"]+)"/)?.[1]
    const cover = firstImg ? await uploadImage(firstImg, title) : undefined
    await payload.create({
      collection: 'news',
      data: {
        _status: 'published',
        title,
        slug: slugFromLink(p.link),
        publishedAt: new Date(p.date).toISOString(),
        excerpt: stripTags(p.excerpt.rendered).replace(/Continue reading.*$/i, '').slice(0, 300),
        content: toLexical(html.replace(/<img[^>]*>/g, '')), // перша картинка стає обкладинкою
        cover,
        legacyUrl: p.link,
      },
    })
    imported++
    payload.logger.info(`  ✓ ${title}`)
  }
}

// ---------- Сторінки ----------
payload.logger.info('Переношу україномовні сторінки…')
const pagesRes = await fetch(`${WP}/pages?per_page=100&_fields=title,link,content`)
const wpPages: any[] = pagesRes.ok ? await pagesRes.json() : []
for (const p of wpPages) {
  const title = stripTags(p.title.rendered)
  const slug = slugFromLink(p.link)
  if (!isUkr(title) || !slug || p.link.includes('/en/')) continue
  const exists = await payload.count({ collection: 'pages', where: { slug: { equals: slug } } })
  if (exists.totalDocs) continue
  const html: string = p.content.rendered
  // Складна розмітка WordPress (вбудовані віджети тощо) іноді не конвертується —
  // тоді пробуємо спрощений варіант, а в крайньому разі переносимо лише текст.
  const variants = [
    html,
    html.replace(/<(iframe|script|style|figure|svg)[\s\S]*?<\/\1>/gi, '').replace(/<\/?(div|span|section)[^>]*>/gi, ''),
    `<p>${stripTags(html)}</p>`,
  ]
  let ok = false
  for (const [i, v] of variants.entries()) {
    try {
      await payload.create({ collection: 'pages', data: { _status: 'published', title, slug, content: toLexical(v) } })
      payload.logger.info(`  ✓ ${title}${i ? ' (спрощено — варто перевірити вручну)' : ''}`)
      ok = true
      break
    } catch {
      /* пробуємо наступний варіант */
    }
  }
  if (!ok) payload.logger.warn(`  ✗ ${title} — не вдалося перенести, ${p.link}`)
}

payload.logger.info('Готово!')
process.exit(0)
