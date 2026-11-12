import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { uk } from '@payloadcms/translations/languages/uk'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { News } from './collections/News'
import { Pages } from './collections/Pages'
import { Videos } from './collections/Videos'
import { Topics } from './collections/Topics'
import { Visits } from './collections/Visits'
import { Home } from './globals/Home'
import { Stats } from './globals/Stats'
import { AnnualReport } from './globals/AnnualReport'
import { Territories } from './globals/Territories'
import { Navigation } from './globals/Navigation'
import { FaqBlock } from './blocks/Faq'
import { CardsBlock, StatBlock } from './blocks/Highlights'
import { editorFeatures } from './fields/editor'
import { Contacts } from './globals/Contacts'
import { Seo } from './globals/Seo'
import { Resources } from './globals/Resources'
import { backupEndpoints } from './endpoints/backups'
import { statusEndpoints } from './endpoints/status'
import { statsSheetEndpoints } from './endpoints/statsSheet'
import { mediaUsageEndpoints } from './endpoints/mediaUsage'
import { mediaImportEndpoints } from './endpoints/mediaImport'
import { cleanupEmptyDrafts } from './lib/cleanupEmptyDrafts'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || '',
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — Адмінка НАРТУ',
      // значок вкладки браузера — герб сайту, а не логотип Payload
      icons: [{ rel: 'icon', type: 'image/png', url: '/img/emblem-96.png' }],
    },
    components: {
      beforeNavLinks: ['/components/admin/ViewSiteLink#ViewSiteLink', '/components/admin/DashboardLink#DashboardLink'],
      // «Структура сайту» на головній сторінці адмінки
      beforeDashboard: ['/components/admin/StatsSummary#StatsSummary', '/components/admin/SiteMap#SiteMap'],
      afterNavLinks: ['/components/admin/StatsNavLink#StatsNavLink', '/components/admin/AdminNavLinks#AdminNavLinks', '/components/admin/ThemeToggle#ThemeToggle'],
      // підказки й українські назви кнопок у панелі редактора тексту
      providers: ['/components/admin/EditorHints#EditorHints', '/components/admin/PreviewLinkOpener#PreviewLinkOpener'],
      views: {
        // Розділ «Статистика відвідувань»: /admin/stats
        stats: { Component: '/components/admin/StatsView#StatsView', path: '/stats', meta: { title: 'Статистика відвідувань' } },
        // Розділ «Стан сервера»: /admin/status
        status: { Component: '/components/admin/StatusView#StatusView', path: '/status', meta: { title: 'Стан сервера' } },
        // Розділ «Резервні копії»: /admin/backups
        backups: { Component: '/components/admin/BackupsView#BackupsView', path: '/backups', meta: { title: 'Резервні копії' } },
      },
    },
    livePreview: {
      breakpoints: [
        { label: 'Телефон', name: 'mobile', width: 375, height: 812 },
        { label: 'Планшет', name: 'tablet', width: 768, height: 1024 },
        { label: "Комп'ютер", name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },
  i18n: {
    supportedLanguages: { uk, en },
    fallbackLanguage: 'uk',
    // Українські написи Payload про кошик: скрізь «кошик» (не «смітник» / «Сміття») і без неправильного відмінка
    // («перемістити Новина у смітник» → «перемістити «…» у кошик»)
    translations: {
      uk: {
        general: {
          // рядок пошуку над списками: «Пошук: Заголовок або Адреса» (замість «Шукати по Заголовок…»)
          searchBy: 'Пошук: {{label}}',
          trash: 'Кошик',
          aboutToTrash: 'Ви збираєтеся перемістити <1>{{title}}</1> у кошик. Звідти його можна буде відновити. Ви впевнені?',
          aboutToTrashCount: 'Ви збираєтеся перемістити в кошик: {{count}} ({{label}})',
          aboutToPermanentlyDeleteTrash: 'Ви збираєтеся назавжди видалити з кошика: <0>{{count}}</0> (<1>{{label}}</1>). Ви впевнені?',
          noTrashResults: 'Кошик порожній.',
          titleTrashed: '«{{title}}» переміщено в кошик.',
          trashedCountSuccessfully: 'Переміщено в кошик: {{count}} ({{label}}).',
        },
      },
    },
  },
  localization: {
    locales: [
      { label: 'Українська', code: 'uk' },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'uk',
    fallback: true,
  },
  collections: [News, Topics, Pages, Videos, Media, Users, Visits],
  globals: [Home, Navigation, Stats, AnnualReport, Territories, Resources, Contacts, Seo],
  editor: lexicalEditor({
    // панель інструментів, таблиці, виправлені посилання + блок «Запитання — відповіді»
    features: editorFeatures([BlocksFeature({ blocks: [FaqBlock, CardsBlock, StatBlock] })]),
  }),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
    // типи оновлюються вручну (npm run generate:types) разом зі змінами в коді: якщо Payload переписує файл сам,
    // на сервері з'являються «власні зміни», і nartu-update відмовляється оновлюватись
    autoGenerate: false,
  },
  db: sqliteAdapter({
    // Структура бази змінюється лише міграціями (src/migrations):
    //   npm run payload migrate:create назва   — після зміни полів
    //   npm run payload migrate                — застосувати
    // Автоматичну звірку (push) вимкнено: вона повторно створювала індекси й ламала перший запуск.
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
    client: {
      url: process.env.DATABASE_URL || '',
    },
  }),
  jobs: {
    // потрібно для публікації новин за розкладом
    autoRun: [{ cron: '* * * * *', queue: 'default' }],
  },
  // Порожні чернетки без назви, що лишились після «Створити» без введення (lib/cleanupEmptyDrafts.ts):
  // перша перевірка — за 2 хвилини після старту, далі кожні 6 годин. unref — таймер не тримає процес
  // (скрипти й міграції завершуються як звичайно).
  onInit: async (payload) => {
    if (process.env.NEXT_PHASE === 'phase-production-build') return
    // База в режимі WAL: читання й запис не блокують одне одного. У звичайному режимі кожен запис (а це кожен
    // перегляд сторінки — для статистики — і кожне збереження в адмінці) на мить зупиняв усі читання, і під
    // напливом відвідувачів сторінки могли підвисати або падати з «database is locked». Режим записується в сам
    // файл бази, тож діє і для міграцій та резервних копій (вони роблять знімок через .backup / VACUUM INTO).
    // busy_timeout — зачекати до 5 с, якщо база зайнята, а не падати одразу; synchronous=NORMAL — звичайна пара до WAL.
    try {
      const db = (payload.db as unknown as { client?: { execute: (sql: string) => Promise<unknown> } }).client
      if (db) {
        await db.execute('PRAGMA journal_mode = WAL')
        await db.execute('PRAGMA synchronous = NORMAL')
        await db.execute('PRAGMA busy_timeout = 5000')
      }
    } catch (e) {
      payload.logger.warn(`Режим WAL для бази не ввімкнено: ${(e as Error).message}`)
    }
    const run = () => cleanupEmptyDrafts(payload).catch((e) => payload.logger.warn(`Прибирання порожніх чернеток: ${(e as Error).message}`))
    setTimeout(run, 2 * 60_000).unref()
    setInterval(run, 6 * 3600_000).unref()
  },
  // Завантаження файлів: до 300 МБ (стільки ж пропускає nginx — client_max_body_size). Без цього діяв типовий
  // ліміт Payload — 20 МБ на файл і 50 МБ на запит, і відео чи великий PDF через адмінку не завантажувались
  // («File size limit has been reached»), хоча підказка в полі обіцяла «до 100 МБ».
  upload: {
    limits: { fileSize: 300 * 1024 * 1024 },
    requestSizeLimit: 320 * 1024 * 1024,
    responseOnLimit: 'Файл завеликий: можна завантажити до 300 МБ.',
  },
  // GraphQL не використовується ні сайтом, ні адмінкою — вимкнено (менше точок доступу до даних)
  graphQL: { disable: true },
  // API розділів «Резервні копії» і «Стан сервера»
  endpoints: [...backupEndpoints, ...statusEndpoints, ...statsSheetEndpoints, ...mediaUsageEndpoints, ...mediaImportEndpoints],
  sharp,
  plugins: [],
})
