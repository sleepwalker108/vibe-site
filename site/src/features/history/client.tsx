'use client'
import { createClientFeature } from '@payloadcms/richtext-lexical/client'
import { REDO_COMMAND, UNDO_COMMAND } from '@payloadcms/richtext-lexical/lexical'

const Arrow = ({ flip }: { flip?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
    <path d="M7 5 3.5 8.5 7 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 8.5h7.5a4.5 4.5 0 0 1 0 9H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)
const UndoIcon = () => <Arrow />
const RedoIcon = () => <Arrow flip />

// Кнопки «Скасувати» і «Повторити» на початку панелі редактора (як у Word/WordPress)
export const HistoryFeatureClient = createClientFeature({
  toolbarFixed: {
    groups: [
      {
        type: 'buttons',
        key: 'history',
        order: 1,
        items: [
          {
            key: 'undo',
            ChildComponent: UndoIcon,
            label: 'Скасувати (Ctrl+Z)',
            onSelect: ({ editor }) => {
              editor.dispatchCommand(UNDO_COMMAND, undefined)
            },
          },
          {
            key: 'redo',
            ChildComponent: RedoIcon,
            label: 'Повторити (Ctrl+Y)',
            onSelect: ({ editor }) => {
              editor.dispatchCommand(REDO_COMMAND, undefined)
            },
          },
        ],
      },
    ],
  },
})
