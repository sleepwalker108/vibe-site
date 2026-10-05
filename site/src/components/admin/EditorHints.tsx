'use client'
import { useEffect } from 'react'

// Підказки до кнопок панелі редактора тексту (з’являються при наведенні) — у стандартній панелі їх немає
const HINTS: Record<string, string> = {
  undo: 'Скасувати (Ctrl+Z)',
  redo: 'Повторити (Ctrl+Y)',
  paragraph: 'Звичайний текст',
  h2: 'Заголовок 2 — розділ',
  h3: 'Заголовок 3 — підрозділ',
  h4: 'Заголовок 4 — дрібний підзаголовок',
  unorderedList: 'Маркований список •',
  orderedList: 'Нумерований список 1. 2. 3.',
  blockquote: 'Цитата',
  bold: 'Жирний (Ctrl+B)',
  italic: 'Курсив (Ctrl+I)',
  underline: 'Підкреслений (Ctrl+U)',
  strikethrough: 'Закреслений',
  link: 'Посилання: виділіть текст і натисніть',
  alignLeft: 'Вирівняти ліворуч',
  alignCenter: 'Вирівняти по центру',
  alignRight: 'Вирівняти праворуч',
  alignJustify: 'Вирівняти по ширині',
  indentDecrease: 'Зменшити відступ',
  indentIncrease: 'Збільшити відступ',
}
const DROPDOWNS: Record<string, string> = { add: 'Вставити: картинку, файл, таблицю, лінію', blocks: 'Блоки: запитання-відповіді, картки, цифри' }
const RENAME: Record<string, string> = { Table: 'Таблиця', Завантажити: 'Картинка або файл' }

const apply = (root: ParentNode) => {
  root.querySelectorAll<HTMLElement>('.fixed-toolbar .toolbar-popup__button').forEach((b) => {
    const key = [...b.classList].find((c) => c.startsWith('toolbar-popup__button-'))?.slice(22)
    const hint = key && HINTS[key]
    if (hint && b.title !== hint) {
      b.title = hint
      b.setAttribute('aria-label', hint)
    }
  })
  root.querySelectorAll<HTMLElement>('.fixed-toolbar .toolbar-popup__dropdown').forEach((b) => {
    const key = [...b.classList].find((c) => c.startsWith('toolbar-popup__dropdown-') && c !== 'toolbar-popup__dropdown-items')?.slice(24)
    const hint = key && DROPDOWNS[key]
    if (hint && b.title !== hint) b.title = hint
  })
  // назви, які редактор не переклав
  root.querySelectorAll<HTMLElement>('.toolbar-popup__dropdown-items .text, .slash-menu-popup__item-text, #slash-menu .text').forEach((el) => {
    const t = RENAME[el.textContent?.trim() || '']
    if (t) el.textContent = t
  })
}

export const EditorHints = ({ children }: { children?: React.ReactNode }) => {
  useEffect(() => {
    apply(document)
    let queued = false
    const obs = new MutationObserver(() => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        apply(document)
      })
    })
    obs.observe(document.body, { childList: true, subtree: true })
    return () => obs.disconnect()
  }, [])
  return (
    <>
      <style>{CSS}</style>
      {children}
    </>
  )
}

// Панель як у WordPress: видимі підписи «Вставити» і «Блоки», панель не губиться при прокручуванні
const CSS = `
.fixed-toolbar { flex-wrap: wrap; row-gap: 4px; gap: 6px; }
/* оформлення тексту тепер у панелі над абзацом (features/blockToolbar), тут лишаємо історію, «Вставити», «Блоки» */
.fixed-toolbar .fixed-toolbar__group-text, .fixed-toolbar .fixed-toolbar__group-format, .fixed-toolbar .fixed-toolbar__group-features,
.fixed-toolbar .fixed-toolbar__group-align, .fixed-toolbar .fixed-toolbar__group-indent, .fixed-toolbar .divider { display: none !important; }
.fixed-toolbar .fixed-toolbar__group-history { border-right: 1px solid var(--theme-elevation-150); padding-right: 6px; }
.fixed-toolbar .toolbar-popup__dropdown-add::after { content: 'Вставити'; margin-left: 6px; font-size: 13px; font-weight: 600; }
.fixed-toolbar .toolbar-popup__dropdown-blocks::after { content: 'Блоки'; margin-left: 6px; font-size: 13px; font-weight: 600; }
.fixed-toolbar .toolbar-popup__dropdown-add, .fixed-toolbar .toolbar-popup__dropdown-blocks { width: auto !important; padding-inline: 8px !important; }
`
