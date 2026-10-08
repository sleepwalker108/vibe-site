import type { CollectionConfig } from 'payload'
import { isAdmin, isLoggedIn, publishedOrLoggedIn } from '../access'
import { slugify } from '../utils/slugify'
import { markEnglish, translationFields } from '../fields/translations'
import { seoFields } from '../fields/seo'
import { fillSearchText, searchTextField } from '../fields/searchText'
import { normalizeHeadings } from '../fields/normalizeHeadings'

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Сторінка', plural: 'Сторінки' },
  trash: true, // видалені сторінки потрапляють у кошик, їх можна відновити
  admin: {
    // кнопка «Скасувати» біля збереження/публікації
    components: { edit: { beforeDocumentControls: ['/components/admin/CancelButton#CancelButton'] } },
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt', '_status', 'hasEnglish'],
    listSearchableFields: ['title', 'slug'],
    pagination: { defaultLimit: 50 },
    group: 'Контент',
    description: 'Текстові сторінки сайту. Де яка сторінка в меню — дивіться на головній сторінці адмінки («Структура сайту»).',
    preview: (doc) => `/${encodeURIComponent(String(doc?.slug || ''))}`,
    livePreview: {
      url: ({ data }) => `/${encodeURIComponent(data?.slug || '')}?preview=1`,
    },
  },
  versions: { drafts: { autosave: { interval: 400 } }, maxPerDoc: 50 },
  access: {
    read: publishedOrLoggedIn,
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isAdmin,
  },
  // текст для пошуку по сайту оновлюється під час кожного збереження
  hooks: {
    // заголовки зі старого сайту (h1, h5, h6) — до дозволених h2–h4, інакше сторінку не зберегти
    beforeValidate: [normalizeHeadings(['content'])],
    beforeChange: [markEnglish, fillSearchText(['title', 'content'])],
  },
  fields: [
  ...translationFields('pages'),
    { name: 'title', type: 'text', label: 'Назва', required: true, localized: true },
    { name: 'content', type: 'richText', label: 'Вміст', localized: true },
    {
      name: 'slug',
      type: 'text',
      label: 'Адреса сторінки',
      index: true,
      unique: true,
      admin: {
        position: 'sidebar',
        description: 'Частина адреси після домену. Не змінюйте без потреби — старі посилання перестануть працювати.',
      },
      hooks: {
        beforeValidate: [({ value, data }) => (value ? value : data?.title ? slugify(data.title) : value)],
      },
    },
    seoFields(),
    searchTextField,
  ],
}
