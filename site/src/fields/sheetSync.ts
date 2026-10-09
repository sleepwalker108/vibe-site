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
      label: 'Посилання на Google-таблицю з відповідями форми',
      admin: {
        description:
          'Посилання на таблицю з доступом «Усі, хто має посилання» (читач). Сайт нічого не оновлює сам: нові цифри показуються нижче й переносяться кнопкою.',
        placeholder: 'https://docs.google.com/spreadsheets/d/…/edit',
      },
      validate: (v: string | null | undefined) =>
        !v || v.trim().startsWith('https://docs.google.com/spreadsheets/d/') || 'Потрібне посилання на Google-таблицю (https://docs.google.com/spreadsheets/…)',
    },
    { name: 'sheetSync', type: 'ui', admin: { components: { Field: '/components/admin/SheetSyncPanel#SheetSyncPanel' } } },
  ],
}
