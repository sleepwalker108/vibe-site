import type { GlobalConfig } from 'payload'
import { isLoggedIn } from '../access'

// Загальні налаштування для пошукових систем (Google, Bing) і соцмереж
export const Seo: GlobalConfig = {
  slug: 'seo',
  label: 'Пошук Google і соцмережі (SEO)',
  admin: {
    group: 'Сайт',
    description:
      'Як сайт виглядає в Google та при поширенні посилань. Для окремих новин і сторінок — блок «Пошук Google і соцмережі» внизу їхньої сторінки.',
  },
  access: { read: () => true, update: isLoggedIn },
  fields: [
    {
      name: 'siteTitle',
      type: 'text',
      label: 'Назва сайту в Google',
      localized: true,
      admin: { description: 'Заголовок головної сторінки. До 60 символів, найважливіші слова — на початку.' },
    },
    {
      name: 'titleSuffix',
      type: 'text',
      label: 'Додаток до заголовків сторінок',
      localized: true,
      admin: { description: 'Додається після назви кожної сторінки, напр. «НАРТУ» → «Новини — НАРТУ».' },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Опис сайту',
      localized: true,
      admin: { description: '120–160 символів. Показується під назвою сайту в Google.' },
    },
    {
      name: 'keywords',
      type: 'textarea',
      label: 'Ключові слова',
      localized: true,
      admin: {
        description:
          'Через кому. Google сам ці слова не враховує, але їх читають Bing і деякі каталоги. Головне для Google — щоб ці слова траплялися в заголовках і текстах сторінок.',
      },
    },
    {
      name: 'shareImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Картинка для соцмереж за замовчуванням',
      admin: { description: '1200×630 px. Показується, коли посиланням на сайт діляться у Facebook, Telegram тощо.' },
    },
    {
      type: 'collapsible',
      label: 'Підтвердження власника сайту',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'googleVerification',
          type: 'text',
          label: 'Код Google Search Console',
          admin: {
            description:
              'search.google.com/search-console → Додати ресурс → «Тег HTML». Вставте лише значення content="…" (без лапок).',
          },
        },
        { name: 'bingVerification', type: 'text', label: 'Код Bing Webmaster Tools' },
      ],
    },
    {
      name: 'allowIndexing',
      type: 'checkbox',
      label: 'Дозволити пошуковим системам показувати сайт',
      defaultValue: true,
      admin: { description: 'Вимикайте лише для тестової копії сайту.' },
    },
  ],
}
