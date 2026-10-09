import type { GlobalConfig } from 'payload'
import { isLoggedIn } from '../access'
import { languageSwitcher } from '../fields/translations'

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
    // перемикач Українська / English (як у новинах)
    languageSwitcher,
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
    // цифри з Google-форми (див. lib/sheetSync.ts): сайт бере останню відповідь і зберігає її як чернетку
    {
      type: 'collapsible',
      label: 'Google-форма: цифри з таблиці відповідей',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'sheetUrl',
          type: 'text',
          label: 'Посилання на опубліковану Google-таблицю з відповідями',
          admin: {
            description: 'Таблиця → «Файл» → «Поділитися» → «Опублікувати в інтернеті» → формат CSV. Порожнє поле — форма не використовується.',
            placeholder: 'https://docs.google.com/spreadsheets/d/e/…/pub?output=csv',
          },
          validate: (v: string | null | undefined) =>
            !v || v.trim().startsWith('https://docs.google.com/spreadsheets/d/') ||'Потрібне посилання на Google-таблицю (https://docs.google.com/spreadsheets/…)',
        },
        { name: 'sheetSync', type: 'ui', admin: { components: { Field: '/components/admin/SheetSyncPanel#SheetSyncPanel' } } },
      ],
    },
  ],
}
