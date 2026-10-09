import type { CollectionConfig } from 'payload'
import { isLoggedIn } from '../access'
import { enqueueVideo } from '../lib/videoOptimize'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Файл', plural: 'Медіатека' },
  admin: {
    // кнопка «Скасувати» біля збереження/публікації
    components: {
      edit: { beforeDocumentControls: ['/components/admin/CancelButton#CancelButton'] },
      // перемикач «Плитки / Список», фільтр за типом файлу, сортування (як у WordPress)
      beforeListTable: ['/components/admin/MediaGrid#MediaGrid'],
    },
    group: 'Контент',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'mimeType', 'copyLink', 'updatedAt'],
    listSearchableFields: ['filename', 'alt'],
    pagination: { defaultLimit: 50 },
  },
  access: {
    // Самі файли (/api/media/file/…) доступні всім — вони на сторінках сайту. А перелік медіатеки через API
    // бачать лише ті, хто увійшов: інакше можна було б знайти файли, завантажені для ще не опублікованих сторінок.
    // (Сайт отримує картинки напряму з бази, без цього переліку.)
    read: ({ req }) => Boolean(req.user) || /\/api\/media\/file\//.test(req.url || ''),
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
    // вбудоване поле типу файлу — лише українська назва колонки (за нею можна сортувати список)
    { name: 'mimeType', type: 'text', label: 'Тип файлу', admin: { readOnly: true, hidden: true } },
    {
      name: 'alt',
      type: 'text',
      label: 'Опис зображення (для незрячих)',
      admin: { description: 'Коротко: що зображено. Читається програмами екранного доступу.' },
    },
  ],
  upload: {
    // Лише перелічені формати. SVG навмисно не дозволено: SVG-файл може містити скрипт, який виконався б
    // на домені сайту (тобто й адмінки) — так редактор міг би отримати права адміністратора.
    mimeTypes: [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
      'application/pdf',
      // документи Word і Excel (браузер їх не виконує — лише завантажує)
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'video/mp4', 'video/webm',
    ],
    // Картинки (JPG, PNG…) під час завантаження автоматично перетворюються на WebP — у 2–5 разів легші,
    // сторінки вантажаться швидше. PDF, відео й SVG не змінюються.
    formatOptions: { format: 'webp', options: { quality: 82 } },
    imageSizes: [
      { name: 'card', width: 800, formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'wide', width: 1600, formatOptions: { format: 'webp', options: { quality: 82 } } },
    ],
  },
}
