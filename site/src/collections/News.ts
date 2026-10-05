import type { CollectionConfig } from 'payload'
import { isAdmin, isLoggedIn, publishedOrLoggedIn } from '../access'
import { slugify } from '../utils/slugify'
import { markEnglish, translationFields } from '../fields/translations'
import { seoFields } from '../fields/seo'

export const News: CollectionConfig = {
  slug: 'news',
  labels: { singular: 'Новина', plural: 'Новини' },
  defaultSort: '-publishedAt',
  trash: true,
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', '_status', 'hasEnglish'],
    listSearchableFields: ['title', 'slug'],
    pagination: { defaultLimit: 50 },
    group: 'Контент',
    preview: (doc) => `/news/${encodeURIComponent(String(doc?.slug || ''))}`,
    livePreview: {
      url: ({ data }) => `/news/${encodeURIComponent(data?.slug || '')}?preview=1`,
    },
  },
  versions: {
    drafts: {
      autosave: { interval: 400 }, // зміни видно в попередньому перегляді майже одразу
      schedulePublish: true, // публікація за розкладом
    },
    maxPerDoc: 50,
  },
  access: {
    read: publishedOrLoggedIn,
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isAdmin,
  },
  hooks: { beforeChange: [markEnglish] },
  fields: [
  ...translationFields('news'),
    { name: 'title', type: 'text', label: 'Заголовок', required: true, localized: true },
    {
      type: 'row',
      fields: [
        {
          name: 'publishedAt',
          type: 'date',
          label: 'Дата публікації',
          required: true,
          defaultValue: () => new Date().toISOString(),
          admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd.MM.yyyy HH:mm' } },
        },
        {
          name: 'tag',
          type: 'text',
          label: 'Мітка (необов’язково)',
          localized: true,
          admin: { description: 'Напр.: «Житло для ВПО»' },
        },
      ],
    },
    { name: 'cover', type: 'upload', relationTo: 'media', label: 'Обкладинка' },
    {
      name: 'excerpt',
      type: 'textarea',
      label: 'Короткий опис',
      localized: true,
      admin: { description: 'Показується в списку новин. 1–2 речення.' },
    },
    { name: 'content', type: 'richText', label: 'Текст новини', localized: true },
    {
      name: 'slug',
      type: 'text',
      label: 'Адреса сторінки',
      index: true,
      unique: true,
      admin: { position: 'sidebar', description: 'Заповнюється автоматично із заголовка.' },
      hooks: {
        beforeValidate: [({ value, data }) => (value ? value : data?.title ? slugify(data.title) : value)],
      },
    },
    {
      name: 'legacyUrl',
      type: 'text',
      label: 'Стара адреса на WordPress',
      admin: { position: 'sidebar', readOnly: true, description: 'Для переадресації старих посилань.' },
    },
    seoFields(),
  ],
}
