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
    },
    components: {
      beforeNavLinks: ['/components/admin/ViewSiteLink#ViewSiteLink', '/components/admin/DashboardLink#DashboardLink'],
      // «Структура сайту» на головній сторінці адмінки
      beforeDashboard: ['/components/admin/StatsSummary#StatsSummary', '/components/admin/SiteMap#SiteMap'],
      afterNavLinks: ['/components/admin/StatsNavLink#StatsNavLink', '/components/admin/AdminNavLinks#AdminNavLinks', '/components/admin/ThemeToggle#ThemeToggle'],
      // підказки й українські назви кнопок у панелі редактора тексту
      providers: ['/components/admin/EditorHints#EditorHints'],
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
  // API розділів «Резервні копії» і «Стан сервера»
  endpoints: [...backupEndpoints, ...statusEndpoints],
  sharp,
  plugins: [],
})
