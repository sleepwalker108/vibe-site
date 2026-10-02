import type { GlobalConfig } from 'payload'
import { isLoggedIn } from '../access'
import { UA_REGION_OPTIONS } from '../data/regionNames'

const num = (name: string, label: string) => ({ name, type: 'number' as const, label, min: 0, defaultValue: 0 })

export const Territories: GlobalConfig = {
  slug: 'territories',
  label: 'Мапа: статуси територій',
  admin: {
    group: 'Сайт',
    description:
      'Кількість населених пунктів (НП) у підсумках сайт рахує сам — додаючи числа всіх областей. Вручну вводяться лише кількості громад (ТГ).',
    livePreview: { url: '/?preview=1#territories' },
  },
  versions: { drafts: { autosave: { interval: 400 } }, max: 50 },
  access: { read: () => true, update: isLoggedIn },
  fields: [
    { name: 'show', type: 'checkbox', label: 'Показувати блок на головній', defaultValue: true },
    { name: 'title', type: 'text', label: 'Заголовок', localized: true },
    { name: 'subtitle', type: 'textarea', label: 'Підзаголовок', localized: true },
    {
      name: 'communities',
      type: 'group',
      label: 'Кількість територіальних громад (ТГ) за статусами',
      fields: [
        {
          type: 'row',
          fields: [
            num('possible', 'Можливих бойових дій'),
            num('eres', 'Активних бойових дій (з е-ресурсами)'),
            num('active', 'Активних бойових дій'),
            num('occupied', 'Тимчасово окуповані'),
          ],
        },
      ],
    },
    {
      name: 'regions',
      type: 'array',
      label: 'Області на мапі',
      labels: { singular: 'Область', plural: 'Області' },
      admin: {
        description: 'Кількість населених пунктів за статусами. Кружечок з’являється на мапі для кожної області зі списку.',
        components: { RowLabel: '/components/admin/RegionRowLabel#RegionRowLabel' },
      },
      fields: [
        {
          name: 'region',
          type: 'select',
          label: 'Область',
          required: true,
          options: UA_REGION_OPTIONS.map((r) => ({
            label: r.name,
            value: r.id,
          })),
        },
        {
          type: 'row',
          fields: [
            num('possible', 'Можливих бойових дій'),
            num('eres', 'Активних (з е-ресурсами)'),
            num('active', 'Активних бойових дій'),
            num('occupied', 'Тимчасово окуповані'),
          ],
        },
      ],
    },
    {
      name: 'source',
      type: 'textarea',
      label: 'Підстава (наказ)',
      localized: true,
      admin: { description: 'Напр.: «…затверджений наказом Мінрозвитку від 28.02.2025 № 376 (зі змінами…)»' },
    },
  ],
}
