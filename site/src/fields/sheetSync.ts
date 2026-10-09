import type { Field } from 'payload'

// Блок «Google-форма» для статистики (див. lib/sheetSync.ts): посилання на таблицю відповідей
// і панель — остання відповідь, що зміниться, кнопки «Перенести» / «Скасувати перенесення», інструкція
export const sheetSyncFields: Field = {
  type: 'collapsible',
  label: 'Google-форма: цифри з таблиці відповідей',
  admin: { initCollapsed: false },
  fields: [
    {
      name: 'sheetUrl',
      type: 'text',
      label: 'Посилання для сайту на відповіді форми',
      // у посиланні — секретний ключ: його бачать лише ті, хто увійшов в адмінку (не публічний API сайту)
      access: { read: ({ req }) => Boolean(req.user) },
      admin: {
        description:
          'Посилання з Google-скрипта (функція siteLinks) — таблиця при цьому лишається закритою. Або посилання на таблицю з доступом «Усі, хто має посилання». Сайт нічого не оновлює сам: нові цифри показуються нижче й переносяться кнопкою.',
        placeholder: 'https://script.google.com/macros/s/…/exec?id=…&key=…',
      },
      validate: (v: string | null | undefined) =>
        !v ||
        /^https:\/\/(docs\.google\.com\/spreadsheets\/d\/|script\.google\.com\/macros\/s\/)/.test(v.trim()) ||
        'Потрібне посилання з Google-скрипта (https://script.google.com/macros/s/…) або на Google-таблицю (https://docs.google.com/spreadsheets/…)',
    },
    { name: 'sheetSync', type: 'ui', admin: { components: { Field: '/components/admin/SheetSyncPanel#SheetSyncPanel' } } },
  ],
}
