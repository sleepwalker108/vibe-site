import { createServerFeature } from '@payloadcms/richtext-lexical'

// Панель блоку як у WordPress — над абзацом, де стоїть курсор (див. BlockToolbar.tsx)
export const BlockToolbarFeature = createServerFeature({
  feature: { ClientFeature: '/features/blockToolbar/client#BlockToolbarFeatureClient' },
  key: 'blockToolbar',
})
