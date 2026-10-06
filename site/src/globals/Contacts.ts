import type { GlobalConfig } from 'payload'
import { isLoggedIn } from '../access'

const lines = (name: string, label: string, localized = false) => ({
  name,
  type: 'array' as const,
  label,
  fields: [{ name: 'text', type: 'text' as const, label: 'Рядок', required: true, localized }],
})

export const Contacts: GlobalConfig = {
  slug: 'contacts',
  label: 'Контакти й підвал сайту',
  admin: {
    // кнопка «Скасувати» біля збереження/публікації
    components: { elements: { beforeDocumentControls: ['/components/admin/CancelButton#CancelButton'] } },
    group: 'Сайт',
    livePreview: { url: '/?preview=1#footer' },
  },
  versions: { drafts: { autosave: { interval: 400 } }, max: 50 },
  access: { read: () => true, update: isLoggedIn },
  fields: [
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Логотип (емблема)',
      admin: { description: 'PNG із прозорим фоном, квадратний. Якщо не вибрано — використовується стандартна емблема.' },
    },
    { name: 'kicker', type: 'text', label: 'Надпис над назвою в шапці', localized: true },
    { name: 'orgName', type: 'text', label: 'Повна назва організації', localized: true },
    { name: 'shortName', type: 'textarea', label: 'Коротка назва (у шапці)', localized: true },
    { name: 'address', type: 'text', label: 'Адреса', localized: true },
    lines('schedule', 'Режим роботи', true),
    { name: 'email', type: 'email', label: 'Електронна пошта' },
    {
      name: 'socials',
      type: 'array',
      label: 'Соцмережі та месенджери',
      labels: { singular: 'Посилання', plural: 'Посилання' },
      admin: { description: 'Кнопки в мобільному меню, напр. Telegram-бот гарячої лінії, Facebook.' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'network',
              type: 'select',
              label: 'Мережа',
              required: true,
              defaultValue: 'telegram',
              options: [
                { label: 'Telegram', value: 'telegram' },
                { label: 'Facebook', value: 'facebook' },
                { label: 'Instagram', value: 'instagram' },
                { label: 'YouTube', value: 'youtube' },
                { label: 'Viber', value: 'viber' },
                { label: 'X (Twitter)', value: 'x' },
                { label: 'LinkedIn', value: 'linkedin' },
              ],
            },
            { name: 'label', type: 'text', label: 'Напис на кнопці', localized: true },
            { name: 'url', type: 'text', label: 'Посилання', required: true },
          ],
        },
      ],
    },
    lines('phones', 'Телефони'),
    {
      name: 'hotline',
      type: 'group',
      label: 'Гаряча лінія в підвалі',
      fields: [
        { name: 'number', type: 'text', label: 'Номер', defaultValue: '1548' },
        lines('lines', 'Рядки під номером', true),
      ],
    },
  ],
}
