import type { CollectionConfig } from 'payload'
import { isAdmin, isLoggedIn } from '../access'
import { linkUrlHooks } from '../fields/linkUrl'
import { enqueueVideo } from '../lib/videoOptimize'
import { caseInsensitiveSearch } from '../hooks/caseInsensitiveSearch'

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
  // пошук в адмінці без різниці великих і малих літер
  hooks: {
    beforeOperation: [caseInsensitiveSearch()],
    afterChange: [
      // вибрали відеофайл без обкладинки — обкладинка з кадру (і стиснення, якщо треба) у фоні (lib/videoOptimize.ts)
      ({ doc, previousDoc, operation, req }) => {
        const file = typeof doc?.file === 'object' ? doc.file?.id : doc?.file
        const prev = typeof previousDoc?.file === 'object' ? previousDoc.file?.id : previousDoc?.file
        if (doc?.source === 'file' && file && !doc.poster && (operation === 'create' || file !== prev)) {
          enqueueVideo(req.payload, Number(file))
        }
        return doc
      },
    ],
  },
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
      hooks: linkUrlHooks,
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
      // у виборі з медіатеки — лише картинки
      filterOptions: { mimeType: { contains: 'image/' } },
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
