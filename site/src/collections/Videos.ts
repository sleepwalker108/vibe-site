import type { CollectionConfig } from 'payload'
import { isAdmin, isLoggedIn } from '../access'

export const Videos: CollectionConfig = {
  slug: 'videos',
  labels: { singular: 'Відео', plural: 'Відео' },
  defaultSort: '-publishedAt',
  trash: true,
  admin: {
    // кнопка «Скасувати» біля збереження/публікації
    components: { edit: { beforeDocumentControls: ['/components/admin/CancelButton#CancelButton'] } },
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', 'source'],
    group: 'Контент',
    description: 'Сторінка «Відеоматеріали». Відео можна завантажити файлом або вставити посилання (MP4 чи YouTube).',
    livePreview: { url: '/video?preview=1' },
  },
  access: { read: () => true, create: isLoggedIn, update: isLoggedIn, delete: isAdmin },
  fields: [
    { name: 'title', type: 'text', label: 'Назва', required: true, localized: true },
    { name: 'description', type: 'textarea', label: 'Короткий опис (необов’язково)', localized: true },
    {
      name: 'source',
      type: 'radio',
      label: 'Звідки відео',
      defaultValue: 'link',
      options: [
        { label: 'Посилання (MP4 або YouTube)', value: 'link' },
        { label: 'Файл з медіатеки', value: 'file' },
      ],
    },
    {
      name: 'url',
      type: 'text',
      label: 'Посилання на відео',
      admin: {
        condition: (_, s) => s?.source !== 'file',
        description: 'Напр.: https://www.youtube.com/watch?v=… або пряме посилання на .mp4',
      },
    },
    {
      name: 'file',
      type: 'upload',
      relationTo: 'media',
      label: 'Відеофайл',
      admin: { condition: (_, s) => s?.source === 'file', description: 'MP4, бажано до 100 МБ.' },
    },
    {
      name: 'poster',
      type: 'upload',
      relationTo: 'media',
      label: 'Обкладинка (необов’язково)',
      admin: { description: 'Якщо не вибрати — покажемо кадр із самого відео (для YouTube — його обкладинку).' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Дата',
      defaultValue: () => new Date().toISOString(),
      admin: { position: 'sidebar', date: { displayFormat: 'dd.MM.yyyy' } },
    },
  ],
}
