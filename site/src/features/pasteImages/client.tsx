'use client'
import { useEffect } from 'react'
import { toast } from '@payloadcms/ui'
import { createClientFeature } from '@payloadcms/richtext-lexical/client'
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $parseSerializedNode,
  $setSelection,
  COMMAND_PRIORITY_HIGH,
  DROP_COMMAND,
  PASTE_COMMAND,
  type LexicalEditor,
} from '@payloadcms/richtext-lexical/lexical'
import { $generateNodesFromDOM } from '@payloadcms/richtext-lexical/lexical/html'
import { $dfs, $insertNodeToNearestRoot, mergeRegister } from '@payloadcms/richtext-lexical/lexical/utils'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'

// Картинки в тексті новин і сторінок — без попереднього завантаження в медіатеку:
//  • картинка з буфера обміну («Копіювати зображення» на будь-якому сайті, знімок екрана) або перетягнута з комп'ютера;
//  • скопійований з іншого сайту фрагмент із текстом і картинками — текст вставляється як звичайно,
//    а картинки сервер сам завантажує з того сайту (браузеру інші сайти це зазвичай забороняють);
//  • вставлена адреса картинки (https://…/photo.jpg).
// На місці кожної картинки спершу з'являється рядок «⏳ … [мітка]», потім він замінюється картинкою з медіатеки.
// Рядок шукаємо за міткою в тексті (а не за внутрішнім номером вузла): автозбереження чернетки перебудовує
// редактор, і внутрішні номери змінюються, а текст — ні.
type Job = { kind: 'file'; file: File } | { kind: 'url'; src: string }

const MARK = '⏳ Картинка завантажується…'
const MAX_IMAGES = 20
const IMAGE_URL = /^https?:\/\/\S+\.(jpe?g|png|webp|gif|avif)(\?\S*)?$/i

const token = () => Math.random().toString(36).slice(2, 8)
const markText = (t: string) => `${MARK} [${t}]`
// рядок-заглушка з міткою (верхній рівень тексту)
const $findMarker = (t: string) => {
  const end = `[${t}]`
  for (const { node } of $dfs()) if ($isTextNode(node) && node.getTextContent().endsWith(end)) return node.getTopLevelElement() || node
  return null
}

const hex24 = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('')

const uploadFile = async (file: File): Promise<number | string> => {
  const fd = new FormData()
  fd.append('file', file, file.name || `image.${(file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}`)
  fd.append('_payload', JSON.stringify({}))
  const r = await fetch('/api/media', { method: 'POST', body: fd, credentials: 'include' })
  const j = (await r.json().catch(() => ({}))) as { doc?: { id: number | string }; errors?: { message?: string }[] }
  if (!r.ok || !j.doc) throw new Error(j.errors?.[0]?.message || `помилка ${r.status}`)
  return j.doc.id
}

const dataUrlToFile = async (src: string) => {
  const blob = await (await fetch(src)).blob()
  return new File([blob], `image.${(blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}`, { type: blob.type })
}

const importUrl = async (src: string): Promise<number | string> => {
  if (src.startsWith('data:image/')) return uploadFile(await dataUrlToFile(src))
  const r = await fetch('/api/media-import', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: src }),
  })
  const j = (await r.json().catch(() => ({}))) as { id?: number | string; error?: string }
  if (!r.ok || j.id === undefined) throw new Error(j.error || `помилка ${r.status}`)
  return j.id
}

const usableSrc = (src: string | null) => !!src && (/^https?:\/\//i.test(src) || src.startsWith('data:image/'))
const isImageFile = (f: File) => /^image\/(jpeg|png|webp|gif|avif)$/.test(f.type)

// Рядки-заглушки замінюємо картинками, коли вони завантажаться (по 3 одночасно)
const runJobs = (editor: LexicalEditor, jobs: Job[], marks: string[]) => {
  if (!jobs.length) return
  const total = jobs.length
  const id = toast.loading(total === 1 ? 'Завантажую картинку в медіатеку…' : `Завантажую картинки в медіатеку (${total})…`)
  let failed = 0
  const queue = jobs.map((job, i) => ({ job, mark: marks[i] }))
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const { job, mark } = item
      try {
        const value = job.kind === 'file' ? await uploadFile(job.file) : await importUrl(job.src)
        editor.update(() => {
          const node = $findMarker(mark)
          // вузол картинки — через зареєстрований у редакторі клас (функція створення з пакета може бути з іншої копії
          // модуля, і тоді редактор мовчки відкидає вузол)
          if (node) node.replace($parseSerializedNode({ type: 'upload', version: 3, format: '', id: hex24(), fields: null, relationTo: 'media', value } as never))
        })
      } catch (e) {
        failed++
        editor.update(() => $findMarker(mark)?.remove())
        toast.error(`Не вдалося вставити картинку: ${(e as Error).message}`)
      }
    }
  }
  Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker)).then(() => {
    toast.dismiss(id)
    const ok = total - failed
    if (ok) toast.success(ok === 1 ? 'Картинку додано в медіатеку й вставлено' : `Картинки додано в медіатеку й вставлено (${ok})`)
  })
}

// Рядки-заглушки в місці курсора (по одному на картинку). Мітки створюємо ДО оновлення редактора:
// обробник вставки сам працює всередині оновлення, тож вкладене оновлення виконується пізніше.
const insertMarkers = (marks: string[]) => {
  for (const t of marks) {
    const p = $createParagraphNode().append($createTextNode(markText(t)))
    const sel = $getSelection()
    if ($isRangeSelection(sel)) $insertNodeToNearestRoot(p)
    else $getRoot().append(p)
  }
}
const newMarks = (count: number) => Array.from({ length: count }, token)

// Фрагмент сайту: картинки → рядки-заглушки з номером, решта вставляється як звичайний текст
const pasteHtml = (editor: LexicalEditor, html: string): boolean => {
  const dom = new DOMParser().parseFromString(html, 'text/html')
  const imgs = [...dom.images]
  const srcs: string[] = []
  const marks: string[] = []
  for (const img of imgs) {
    // найбільша версія картинки, якщо сайт дає кілька розмірів
    const src = img.getAttribute('data-src') || img.getAttribute('src')
    if (usableSrc(src) && srcs.length < MAX_IMAGES) {
      const p = dom.createElement('p')
      const t = token()
      p.textContent = markText(t)
      marks.push(t)
      srcs.push(src!)
      ;(img.closest('picture') || img).replaceWith(p)
    } else img.remove()
  }
  if (!srcs.length) return false
  editor.update(
    () => {
      const nodes = $generateNodesFromDOM(editor, dom)
      const sel = $getSelection()
      if ($isRangeSelection(sel)) sel.insertNodes(nodes)
      else $getRoot().append(...nodes)
    },
    { discrete: true },
  )
  runJobs(
    editor,
    srcs.map((src) => ({ kind: 'url', src })),
    marks,
  )
  return true
}

const PasteImagesPlugin = () => {
  const [editor] = useLexicalComposerContext()
  useEffect(
    () =>
      mergeRegister(
        editor.registerCommand(
          PASTE_COMMAND,
          (event) => {
            if (!(event instanceof ClipboardEvent) || !event.clipboardData) return false
            const cd = event.clipboardData
            const files = [...cd.files].filter(isImageFile).slice(0, MAX_IMAGES)
            const html = cd.getData('text/html')
            const text = cd.getData('text/plain').trim()
            const htmlText = html ? (new DOMParser().parseFromString(html, 'text/html').body.textContent || '').trim() : ''
            // картинка з буфера («Копіювати зображення», знімок екрана): файл, а HTML — лише обгортка картинки
            if (files.length && (!html || !htmlText)) {
              event.preventDefault()
              const marks = newMarks(files.length)
              editor.update(() => insertMarkers(marks))
              runJobs(editor, files.map((file) => ({ kind: 'file', file })), marks)
              return true
            }
            // фрагмент сайту з картинками
            if (html && /<img[\s>]/i.test(html)) {
              event.preventDefault()
              if (pasteHtml(editor, html)) return true
              return false
            }
            // адреса картинки
            if (!html && IMAGE_URL.test(text)) {
              event.preventDefault()
              const marks = newMarks(1)
              editor.update(() => insertMarkers(marks))
              runJobs(editor, [{ kind: 'url', src: text }], marks)
              return true
            }
            return false
          },
          COMMAND_PRIORITY_HIGH,
        ),
        editor.registerCommand(
          DROP_COMMAND,
          (event) => {
            if (!(event instanceof DragEvent) || !event.dataTransfer) return false
            const dt = event.dataTransfer
            const files = [...dt.files].filter(isImageFile).slice(0, MAX_IMAGES)
            let srcs: string[] = []
            if (!files.length) {
              // картинка, перетягнута з іншої вкладки браузера
              const html = dt.getData('text/html')
              if (html) srcs = [...new DOMParser().parseFromString(html, 'text/html').images].map((i) => i.getAttribute('src') || '').filter(usableSrc)
              const uri = dt.getData('text/uri-list').split('\n')[0]?.trim()
              if (!srcs.length && uri && IMAGE_URL.test(uri)) srcs = [uri]
            }
            if (!files.length && !srcs.length) return false
            event.preventDefault()
            event.stopPropagation()
            // курсор — туди, куди відпустили
            const range = document.caretRangeFromPoint?.(event.clientX, event.clientY)
            const marks = newMarks(files.length || srcs.length)
            editor.update(
              () => {
                if (range) {
                  const sel = $createRangeSelection()
                  sel.applyDOMRange(range)
                  $setSelection(sel)
                }
                insertMarkers(marks)
              },
              { discrete: true },
            )
            const jobs: Job[] = files.length ? files.map((file) => ({ kind: 'file', file })) : srcs.slice(0, MAX_IMAGES).map((src) => ({ kind: 'url', src }))
            runJobs(editor, jobs, marks)
            return true
          },
          COMMAND_PRIORITY_HIGH,
        ),
      ),
    [editor],
  )
  return null
}

export const PasteImagesFeatureClient = createClientFeature({
  plugins: [{ Component: PasteImagesPlugin, position: 'normal' }],
})
