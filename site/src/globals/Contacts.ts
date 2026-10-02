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
