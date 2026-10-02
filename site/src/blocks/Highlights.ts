import type { Block } from 'payload'

// Іконки для карток (малюються в components/ResourceIcon.tsx)
const ICONS = [
  { label: 'Серце (допомога)', value: 'heart' },
  { label: 'Терези (право)', value: 'scales' },
  { label: 'Телефон (гаряча лінія)', value: 'phone' },
  { label: 'Дім (житло, ВПО)', value: 'home' },
  { label: 'Будівля (установа)', value: 'building' },
  { label: 'Пошук людини', value: 'search' },
  { label: 'Документ', value: 'document' },
  { label: 'Мапа', value: 'map' },
  { label: 'Інформація', value: 'info' },
  { label: 'Попередження', value: 'warning' },
  { label: 'Глобус', value: 'globe' },
]

// Блок «Картки з іконками»: 2–4 короткі пункти у вигляді карток (напрями роботи, переваги тощо)
export const CardsBlock: Block = {
  slug: 'cards',
  labels: { singular: 'Картки з іконками', plural: 'Картки з іконками' },
  interfaceName: 'CardsBlock',
  fields: [
    {
      name: 'items',
      type: 'array',
      label: 'Картки',
      labels: { singular: 'Картка', plural: 'Картки' },
      minRows: 1,
      maxRows: 8,
      admin: { components: { RowLabel: '/components/admin/CardRowLabel#CardRowLabel' } },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'icon', type: 'select', label: 'Іконка', defaultValue: 'info', options: ICONS, admin: { width: '30%' } },
            { name: 'title', type: 'text', label: 'Заголовок', required: true, admin: { width: '70%' } },
          ],
        },
        { name: 'text', type: 'textarea', label: 'Текст' },
      ],
    },
  ],
}

// Блок «Виділена цифра»: велике число з підписом (напр. «2 150 010+ дзвінків опрацьовано»)
export const StatBlock: Block = {
  slug: 'stat',
  labels: { singular: 'Виділена цифра', plural: 'Виділені цифри' },
  interfaceName: 'StatBlock',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'number', type: 'text', label: 'Число', required: true, admin: { width: '40%', description: 'Напр.: 2 150 010+' } },
        { name: 'label', type: 'text', label: 'Підпис під числом', required: true, admin: { width: '60%' } },
      ],
    },
    { name: 'note', type: 'textarea', label: 'Пояснення (необов’язково)' },
  ],
}
