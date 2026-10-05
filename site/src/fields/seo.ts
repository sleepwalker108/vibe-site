import type { Field } from 'payload'

// Блок «Пошук Google і соцмережі» для новин і сторінок.
// Якщо поля порожні — сайт сам бере заголовок, короткий опис і обкладинку.
export const seoFields = (): Field => ({
  type: 'collapsible',
  label: 'Пошук Google і соцмережі (SEO)',
  admin: {
    initCollapsed: true,
    description: 'Необов’язково. Як сторінка виглядатиме в результатах Google і при поширенні у Facebook, Telegram тощо.',
  },
  fields: [
    {
      name: 'seoPreview',
      type: 'ui',
      admin: { components: { Field: '/components/admin/SeoPreview#SeoPreview' } },
    },
    {
      name: 'meta',
      type: 'group',
      label: false,
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Заголовок для Google',
          localized: true,
          admin: { description: 'До 60 символів. Порожньо — використовується звичайний заголовок.' },
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Опис для Google',
          localized: true,
          admin: {
            description: '120–160 символів: про що сторінка, з ключовими словами, якими люди шукають. Порожньо — береться короткий опис або початок тексту.',
          },
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Картинка для соцмереж',
          admin: { description: 'Найкраще 1200×630 px. Порожньо — обкладинка або картинка сайту за замовчуванням.' },
        },
        {
          name: 'noindex',
          type: 'checkbox',
          label: 'Не показувати цю сторінку в Google',
          defaultValue: false,
        },
      ],
    },
  ],
})
