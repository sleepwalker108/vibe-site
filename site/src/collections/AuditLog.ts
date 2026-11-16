import type { CollectionConfig } from 'payload'
import { isLoggedIn } from '../access'

// Журнал видалень: хто й коли переніс у кошик, відновив або остаточно видалив новину, сторінку, відео
// чи файл медіатеки (записи робить сам сайт — hooks/auditLog.ts). Змінити чи стерти записи з адмінки не можна.
export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  labels: { singular: 'Запис журналу', plural: 'Журнал видалень' },
  admin: {
    group: 'Налаштування',
    useAsTitle: 'title',
    defaultColumns: ['createdAt', 'action', 'section', 'title', 'user'],
    description: 'Хто й коли переніс у кошик, відновив або остаточно видалив новину, сторінку, відео чи файл. Записи робить сам сайт.',
    pagination: { defaultLimit: 50 },
  },
  defaultSort: '-createdAt',
  access: {
    read: isLoggedIn,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'action',
      type: 'select',
      label: 'Дія',
      required: true,
      index: true,
      options: [
        { label: 'У кошик', value: 'trash' },
        { label: 'Відновлено з кошика', value: 'restore' },
        { label: 'Видалено назавжди', value: 'delete' },
      ],
    },
    {
      name: 'section',
      type: 'select',
      label: 'Розділ',
      required: true,
      index: true,
      options: [
        { label: 'Новини', value: 'news' },
        { label: 'Сторінки', value: 'pages' },
        { label: 'Відео', value: 'videos' },
        { label: 'Медіатека', value: 'media' },
      ],
    },
    { name: 'title', type: 'text', label: 'Назва' },
    { name: 'docId', type: 'text', label: 'Номер запису' },
    { name: 'slug', type: 'text', label: 'Адреса / файл' },
    { name: 'user', type: 'text', label: 'Хто', index: true },
  ],
}
