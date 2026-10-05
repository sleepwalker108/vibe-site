import { createServerFeature } from '@payloadcms/richtext-lexical'

// Кнопки «Скасувати» / «Повторити» в панелі редактора
export const HistoryFeature = createServerFeature({
  feature: { ClientFeature: '/features/history/client#HistoryFeatureClient' },
  key: 'history',
})
