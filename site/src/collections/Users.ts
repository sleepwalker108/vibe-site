import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminField } from '../access'
import { authAfterError, authBeforeOperation } from '../lib/authSecurity'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Користувач', plural: 'Користувачі' },
  admin: {
    // кнопка «Скасувати» біля збереження/публікації
    components: { edit: { beforeDocumentControls: ['/components/admin/CancelButton#CancelButton'] } },
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'role'],
    group: 'Налаштування',
  },
  auth: {
    maxLoginAttempts: 5, // після 5 невдалих спроб обліковий запис блокується
    lockTime: 15 * 60 * 1000, // на 15 хвилин
    tokenExpiration: 8 * 60 * 60, // сесія — 8 годин
    cookies: {
      sameSite: 'Lax',
      // з HTTPS (адреса сайту в .env починається з https://) cookie входу передається лише зашифрованим каналом
      secure: (process.env.NEXT_PUBLIC_SERVER_URL || '').startsWith('https://'),
    },
  },
  access: {
    // адміністратор бачить усіх; редактор — лише себе (email-и адміністраторів редакторам не показуємо)
    read: ({ req: { user } }) => (user?.role === 'admin' ? true : user ? { id: { equals: user.id } } : false),
    create: isAdmin,
    update: ({ req: { user }, id }) => user?.role === 'admin' || user?.id === id,
    delete: isAdmin,
  },
  hooks: {
    // надійний пароль + однаковий час відповіді при вході (див. src/lib/authSecurity.ts)
    beforeOperation: [authBeforeOperation],
    afterError: [authAfterError],
    beforeChange: [
      // Перший зареєстрований користувач автоматично стає адміністратором
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true })
          if (totalDocs === 0) data.role = 'admin'
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', label: "Ім'я та прізвище" },
    {
      name: 'role',
      type: 'select',
      label: 'Роль',
      required: true,
      defaultValue: 'editor',
      saveToJWT: true,
      access: { update: isAdminField },
      options: [
        { label: 'Адміністратор — керує всім, включно з користувачами', value: 'admin' },
        { label: 'Редактор — новини, сторінки, статистика, головна', value: 'editor' },
      ],
    },
  ],
}
