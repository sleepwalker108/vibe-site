import type { CollectionConfig } from 'payload'
import { isAdmin, isLoggedIn } from '../access'
import { slugify } from '../utils/slugify'

// Категорії (мітки) новин — за ними відвідувачі фільтрують новини на сайті й у пошуку
export const Topics: CollectionConfig = {
  slug: 'topics',
  labels: { singular: 'Категорія', plural: 'Категорії новин' },
  defaultSort: 'order',
  admin: {
    components: { edit: { beforeDocumentControls: ['/components/admin/CancelButton#CancelButton'] } },
    useAsTitle: 'name',
    defaultColumns: ['name', 'order', 'slug'],
    group: 'Контент',
    description:
      'Категорії, за якими відвідувачі фільтрують новини (сторінка «Новини» і пошук по сайту). Категорія без жодної новини на сайті не показується.',
    pagination: { defaultLimit: 50 },
  },
  access: {
    read: () => true,
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isAdmin,
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', label: 'Назва', required: true, localized: true },
        {
          name: 'order',
          type: 'number',
          label: 'Порядок у списку',
          defaultValue: 10,
          admin: { width: '180px', description: 'Менше число — вище у фільтрі.' },
        },
      ],
    },
    {
      name: 'slug',
      type: 'text',
      label: 'Адреса у фільтрі',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Латиницею, напр. evacuation → /news?topic=evacuation. Заповнюється автоматично з назви.',
      },
      hooks: {
        beforeValidate: [({ value, data }) => (value ? slugify(String(value)) : data?.name ? slugify(String(data.name)) : value)],
      },
    },
    {
      name: 'wpNames',
      type: 'text',
      label: 'Рубрики старого сайту',
      admin: {
        position: 'sidebar',
        description: 'Через кому — назви рубрик старого сайту, з яких імпорт новин проставляє цю категорію.',
      },
    },
    {
      // список новин цієї категорії (лише перегляд — категорії призначаються в самій новині)
      name: 'news',
      type: 'join',
      label: 'Новини в цій категорії',
      collection: 'news',
      on: 'topics',
      defaultSort: '-publishedAt',
      defaultLimit: 20,
      admin: { allowCreate: false, defaultColumns: ['title', 'publishedAt', '_status'] },
    },
  ],
}
