'use client'
import { createClientFeature } from '@payloadcms/richtext-lexical/client'
import { BlockToolbar } from './BlockToolbar'

export const BlockToolbarFeatureClient = createClientFeature({
  plugins: [{ Component: BlockToolbar as any, position: 'floatingAnchorElem' }],
})
