import type { GlobalConfig } from 'payload'
import { isLoggedIn } from '../access'
import { ICON_OPTIONS } from './Home'

// Блок «Корисні ресурси» внизу головної сторінки (перед підвалом)
export const Resources: GlobalConfig = {
  slug: 'resources',
  label: 'Корисні ресурси',
  admin: {
    group: 'Сайт',
    description: 'Картки з посиланнями на інші сайти внизу головної сторінки. Порядок змінюється перетягуванням.',
    livePreview: { url: '/?preview=1#resources' },
  },
  versions: { drafts: { autosave: { interval: 400 } }, max: 50 },
  access: { read: () => true, update: isLoggedIn },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'show', type: 'checkbox', label: 'Показувати блок на сайті', defaultValue: true },
        { name: 'title', type: 'text', label: 'Заголовок блоку', localized: true, admin: { placeholder: 'Корисні ресурси' } },
      ],
    },
    {
      name: 'subtitle',
      type: 'text',
      label: 'Текст під заголовком (необов’язково)',
      localized: true,
    },
    {
      name: 'items',
      type: 'array',
      label: 'Ресурси',
      labels: { singular: 'Ресурс', plural: 'Ресурси' },
      admin: { components: { RowLabel: '/components/admin/CardRowLabel#CardRowLabel' } },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', label: 'Назва', required: true, localized: true },
            { name: 'url', type: 'text', label: 'Посилання', admin: { description: 'Повна адреса, напр. https://minre.gov.ua' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'icon', type: 'select', label: 'Іконка', defaultValue: 'globe', options: ICON_OPTIONS },
            {
              name: 'description',
              type: 'text',
              label: 'Короткий опис',
              localized: true,
              admin: { description: 'Порожньо — показується адреса сайту.' },
            },
          ],
        },
      ],
    },
  ],
}
