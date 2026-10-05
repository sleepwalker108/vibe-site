import type { CollectionConfig } from 'payload'
import { isLoggedIn } from '../access'

// Перегляди сторінок сайту — для розділу «Статистика» в адмінці.
// Без cookie та без IP-адрес: відвідувач — це анонімний відбиток, що змінюється щодня.
export const Visits: CollectionConfig = {
  slug: 'visits',
  labels: { singular: 'Перегляд', plural: 'Перегляди' },
  admin: { hidden: true },
  access: {
    read: isLoggedIn,
    create: () => false, // записує лише сам сайт (маршрут /visit)
    update: () => false,
    delete: isLoggedIn,
  },
  fields: [
    { name: 'path', type: 'text', required: true, index: true },
    { name: 'visitor', type: 'text', index: true },
    { name: 'referrer', type: 'text' },
    { name: 'device', type: 'text' },
    { name: 'lang', type: 'text' },
  ],
}
