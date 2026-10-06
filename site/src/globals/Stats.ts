import type { GlobalConfig } from 'payload'
import { isLoggedIn } from '../access'

export const Stats: GlobalConfig = {
  slug: 'stats',
  label: 'Статистика гарячих ліній',
  admin: {
    // кнопка «Скасувати» біля збереження/публікації
    components: { elements: { beforeDocumentControls: ['/components/admin/CancelButton#CancelButton'] } },
    group: 'Сайт',
    description: 'Загальну кількість дзвінків рахувати не треба — сайт сам додає всі категорії.',
    livePreview: { url: '/?preview=1#stats' },
  },
  versions: { drafts: { autosave: { interval: 400 } }, max: 100 },
  access: { read: () => true, update: isLoggedIn },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'asOf', type: 'date', label: 'Станом на', admin: { date: { displayFormat: 'dd.MM.yyyy' } } },
        { name: 'show', type: 'checkbox', label: 'Показувати блок на головній', defaultValue: true },
      ],
    },
    { name: 'title', type: 'text', label: 'Заголовок', localized: true },
    { name: 'subtitle', type: 'text', label: 'Підзаголовок', localized: true },
    {
      name: 'categories',
      type: 'array',
      label: 'Категорії звернень',
      labels: { singular: 'Категорія', plural: 'Категорії' },
      admin: { description: 'На сайті сортуються автоматично — від більшої до меншої.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', label: 'Назва', required: true, localized: true, admin: { width: '70%' } },
            { name: 'value', type: 'number', label: 'Кількість', required: true, min: 0, admin: { width: '30%' } },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'registered', type: 'number', label: 'Зареєстровано звернень', min: 0 },
        { name: 'messengers', type: 'number', label: 'Звернень через месенджери', min: 0 },
      ],
    },
    { name: 'note', type: 'text', label: 'Підпис під блоком', localized: true },
  ],
}
