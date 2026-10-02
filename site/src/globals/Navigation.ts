import type { GlobalConfig } from 'payload'
import { isLoggedIn } from '../access'

const linkFields = [
  { name: 'label', type: 'text' as const, label: 'Назва пункту', required: true, localized: true },
  {
    name: 'url',
    type: 'text' as const,
    label: 'Посилання',
    admin: { description: 'Сторінка сайту: /diyalnist. Зовнішній сайт: https://… Порожньо — пункт лише відкриває підменю.' },
  },
]

export const Navigation: GlobalConfig = {
  slug: 'navigation',
  label: 'Меню сайту',
  admin: {
    group: 'Сайт',
    description: 'Верхнє меню. Порядок змінюється перетягуванням.',
    livePreview: { url: '/?preview=1' },
  },
  versions: { drafts: { autosave: { interval: 400 } }, max: 30 },
  access: { read: () => true, update: isLoggedIn },
  fields: [
    {
      name: 'items',
      type: 'array',
      label: 'Пункти меню',
      labels: { singular: 'Пункт', plural: 'Пункти' },
      admin: { components: { RowLabel: '/components/admin/NavRowLabel#NavRowLabel' } },
      fields: [
        { type: 'row', fields: linkFields },
        {
          name: 'children',
          type: 'array',
          label: 'Підменю',
          labels: { singular: 'Підпункт', plural: 'Підпункти' },
          admin: { components: { RowLabel: '/components/admin/NavRowLabel#NavRowLabel' } },
          fields: [{ type: 'row', fields: linkFields }],
        },
      ],
    },
  ],
}
