// Побудова тексту для редактора (Lexical) з простих блоків — для скриптів перекладу/наповнення.
export type SimpleBlock =
  | { p: string }
  | { h2: string }
  | { h3: string }
  | { h4: string }
  | { quote: string }
  | { ul: string[] }
  | { ol: string[] }
  | { link: string; url: string } // абзац-посилання (напр. на документ)
  | { raw: unknown } // готовий вузол Lexical (напр. блок із редактора)

const base = { version: 1, direction: 'ltr', format: '', indent: 0 }
const text = (t: string) => ({ type: 'text', text: t, version: 1, detail: 0, format: 0, mode: 'normal', style: '' })

// **жирний** у тексті перетворюємо на жирний фрагмент
const inline = (t: string) =>
  t.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part) =>
    part.startsWith('**') && part.endsWith('**') ? { ...text(part.slice(2, -2)), format: 1 } : text(part),
  )

const list = (items: string[], ordered: boolean) => ({
  type: 'list', listType: ordered ? 'number' : 'bullet', tag: ordered ? 'ol' : 'ul', start: 1, ...base,
  children: items.map((t, i) => ({ type: 'listitem', value: i + 1, ...base, children: inline(t) })),
})

export const toLexicalBlocks = (blocks: SimpleBlock[]) => ({
  root: {
    type: 'root', ...base,
    children: blocks.map((b) => {
      if ('p' in b) return { type: 'paragraph', ...base, textFormat: 0, textStyle: '', children: inline(b.p) }
      if ('h2' in b) return { type: 'heading', tag: 'h2', ...base, children: inline(b.h2) }
      if ('h3' in b) return { type: 'heading', tag: 'h3', ...base, children: inline(b.h3) }
      if ('h4' in b) return { type: 'heading', tag: 'h4', ...base, children: inline(b.h4) }
      if ('quote' in b) return { type: 'quote', ...base, children: inline(b.quote) }
      if ('ul' in b) return list(b.ul, false)
      if ('ol' in b) return list(b.ol, true)
      if ('link' in b)
        return {
          type: 'paragraph', ...base, textFormat: 0, textStyle: '',
          children: [{ type: 'link', ...base, fields: { url: b.url, newTab: true, linkType: 'custom' }, children: [text(b.link)] }],
        }
      return b.raw
    }),
  },
})
