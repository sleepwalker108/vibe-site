import { createServerFeature } from '@payloadcms/richtext-lexical'

// Картинки в тексті без медіатеки вручну: вставлені (Ctrl+V) чи перетягнуті картинки, скопійовані з іншого сайту
// фрагменти з картинками й адреси картинок самі завантажуються в медіатеку й стають картинками в тексті
export const PasteImagesFeature = createServerFeature({
  feature: { ClientFeature: '/features/pasteImages/client#PasteImagesFeatureClient' },
  key: 'pasteImages',
})
