import type { CollectionConfig } from 'payload'
import { isLoggedIn } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Файл', plural: 'Медіатека' },
  admin: {
    group: 'Контент',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'mimeType', 'copyLink', 'updatedAt'],
    listSearchableFields: ['filename', 'alt'],
    pagination: { defaultLimit: 50 },
  },
  access: {
    read: () => true,
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isLoggedIn,
  },
  fields: [
    // Блок «Посилання на файл» у правій колонці: копіювати, відкрити, завантажити, де використовується
    {
      name: 'fileLinks',
      type: 'ui',
      admin: { position: 'sidebar', components: { Field: '/components/admin/MediaLinks#MediaLinks' } },
    },
    // Колонка «Посилання» у списку з кнопкою «Копіювати»
    {
      name: 'copyLink',
      type: 'ui',
      label: 'Посилання',
      admin: { components: { Field: false, Cell: '/components/admin/MediaCopyCell#MediaCopyCell' } },
    },
    {
      name: 'alt',
      type: 'text',
      label: 'Опис зображення (для незрячих)',
      admin: { description: 'Коротко: що зображено. Читається програмами екранного доступу.' },
    },
  ],
  upload: {
    mimeTypes: ['image/*', 'application/pdf', 'video/mp4', 'video/webm'],
    imageSizes: [
      { name: 'card', width: 800 },
      { name: 'wide', width: 1600 },
    ],
  },
}
