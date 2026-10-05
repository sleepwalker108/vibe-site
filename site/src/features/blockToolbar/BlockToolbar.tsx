'use client'
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@payloadcms/richtext-lexical/client'
import {
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isRootNode,
  $parseSerializedNode,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  KEY_DOWN_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type ElementFormatType,
  type LexicalEditor,
  type LexicalNode,
  type RangeSelection,
  type TextFormatType,
} from '@payloadcms/richtext-lexical/lexical'
import { $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND } from '@payloadcms/richtext-lexical/lexical/list'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode } from '@payloadcms/richtext-lexical/lexical/rich-text'
import { $setBlocksType } from '@payloadcms/richtext-lexical/lexical/selection'
import { $findMatchingParent, mergeRegister } from '@payloadcms/richtext-lexical/lexical/utils'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icons } from './icons'
import { LINK_CSS, LinkEditPopover, LinkPreview, type LinkTarget } from './LinkPopover'

/**
 * Панель блоку як у WordPress (Gutenberg): з’являється над абзацом, у якому стоїть курсор.
 * Тип блоку · переміщення вгору/вниз · вирівнювання · жирний, курсив, посилання, ще · дії з блоком.
 */

type BlockType = 'paragraph' | 'h2' | 'h3' | 'h4' | 'heading' | 'ul' | 'ol' | 'quote' | 'image' | 'table' | 'block' | 'line'
type Menu = 'type' | 'align' | 'more' | 'options' | null
type State = {
  key: string
  type: BlockType
  isText: boolean
  align: ElementFormatType
  formats: Record<'bold' | 'italic' | 'underline' | 'strikethrough', boolean>
  link: { key: string; url: string; newTab: boolean } | null
  canUp: boolean
  canDown: boolean
}

const TYPES: { type: BlockType; label: string }[] = [
  { type: 'paragraph', label: 'Звичайний текст' },
  { type: 'h2', label: 'Заголовок 2' },
  { type: 'h3', label: 'Заголовок 3' },
  { type: 'h4', label: 'Заголовок 4' },
  { type: 'ul', label: 'Маркований список' },
  { type: 'ol', label: 'Нумерований список' },
  { type: 'quote', label: 'Цитата' },
]
const OTHER_LABEL: Partial<Record<BlockType, string>> = {
  heading: 'Заголовок',
  image: 'Картинка або файл',
  table: 'Таблиця',
  block: 'Блок',
  line: 'Горизонтальна лінія',
}
const ALIGNS: { value: ElementFormatType; label: string; icon: keyof typeof Icons }[] = [
  { value: 'left', label: 'Ліворуч', icon: 'left' },
  { value: 'center', label: 'По центру', icon: 'center' },
  { value: 'right', label: 'Праворуч', icon: 'right' },
  { value: 'justify', label: 'По ширині', icon: 'justify' },
]
const TOOLBAR_H = 48

// Блок верхнього рівня (безпосередньо в корені документа), у якому стоїть курсор
const $rootChild = (node: LexicalNode | null) => {
  let n = node
  while (n) {
    const parent: LexicalNode | null = n.getParent()
    if (!parent) return null
    if ($isRootNode(parent)) return n
    n = parent
  }
  return null
}

const $typeOf = (top: LexicalNode): BlockType => {
  if ($isListNode(top)) return top.getListType() === 'number' ? 'ol' : 'ul'
  if ($isHeadingNode(top)) {
    const tag = top.getTag()
    return tag === 'h2' || tag === 'h3' || tag === 'h4' ? tag : 'heading'
  }
  if ($isQuoteNode(top)) return 'quote'
  const t = top.getType()
  if (t === 'paragraph') return 'paragraph'
  if (t === 'upload' || t === 'relationship') return 'image'
  if (t === 'table') return 'table'
  if (t === 'horizontalrule') return 'line'
  return 'block'
}

const $readState = (): State | null => {
  const sel = $getSelection()
  let node: LexicalNode | null = null
  if ($isRangeSelection(sel)) node = sel.anchor.getNode()
  else if ($isNodeSelection(sel)) node = sel.getNodes()[0] ?? null
  const top = $rootChild(node)
  if (!top) return null
  const type = $typeOf(top)
  const isText = $isRangeSelection(sel) && type !== 'table' && type !== 'block'
  let align: ElementFormatType = 'left'
  if ($isRangeSelection(sel)) {
    const el = $findMatchingParent(sel.anchor.getNode(), (n) => $isElementNode(n) && !n.isInline())
    if ($isElementNode(el)) align = el.getFormatType() || 'left'
  }
  const has = (f: TextFormatType) => ($isRangeSelection(sel) ? sel.hasFormat(f) : false)
  return {
    key: top.getKey(),
    type,
    isText,
    align,
    formats: { bold: has('bold'), italic: has('italic'), underline: has('underline'), strikethrough: has('strikethrough') },
    link: (() => {
      if (!$isRangeSelection(sel)) return null
      const l = $findMatchingParent(sel.anchor.getNode(), $isLinkNode) as any
      if (!l) return null
      const f = l.getFields?.() || {}
      return { key: l.getKey(), url: f.url || '', newTab: !!f.newTab }
    })(),
    canUp: !!top.getPreviousSibling(),
    canDown: !!top.getNextSibling(),
  }
}

// Глибока копія блоку (для «Дублювати»)
const serialize = (n: LexicalNode): any => {
  const json: any = n.exportJSON()
  if ($isElementNode(n)) json.children = n.getChildren().map(serialize)
  if (json.fields?.id) json.fields = { ...json.fields, id: Math.random().toString(16).slice(2).padEnd(24, '0').slice(0, 24) }
  return json
}


const Btn = ({
  label,
  on,
  disabled,
  onClick,
  children,
  className = '',
}: {
  label: string
  on?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) => (
  <button
    type="button"
    className={`bt-btn ${on ? 'on' : ''} ${className}`}
    title={label}
    aria-label={label}
    aria-pressed={on}
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
  >
    {children}
  </button>
)

const Item = ({ icon, label, on, danger, onClick }: { icon: React.ReactNode; label: string; on?: boolean; danger?: boolean; onClick: () => void }) => (
  <button type="button" role="menuitem" className={`bt-item ${on ? 'on' : ''} ${danger ? 'danger' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
    <span className="bt-item-ico">{icon}</span>
    <span>{label}</span>
    {on && (
      <span className="bt-item-check">
        <Icons.check />
      </span>
    )}
  </button>
)

export const BlockToolbar = ({ anchorElem }: { anchorElem: HTMLElement }) => {
  const [editor] = useLexicalComposerContext()
  const [state, setState] = useState<State | null>(null)
  const [focused, setFocused] = useState(false)
  const [typing, setTyping] = useState(false)
  const [menu, setMenu] = useState<Menu>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const [linkUi, setLinkUi] = useState<{
    initial: LinkTarget
    pos: { top: number; left: number }
    rects: { top: number; left: number; width: number; height: number }[]
    selection: RangeSelection | null
    linkKey?: string
  } | null>(null)
  const linkRef = useRef<() => void>(() => {})

  const refresh = useCallback(() => {
    editor.getEditorState().read(() => setState($readState()))
  }, [editor])

  // стан блоку при кожній зміні тексту чи курсора
  useEffect(
    () =>
      mergeRegister(
        editor.registerUpdateListener(({ editorState }) => editorState.read(() => setState($readState()))),
        editor.registerCommand(
          SELECTION_CHANGE_COMMAND,
          () => {
            refresh()
            return false
          },
          COMMAND_PRIORITY_LOW,
        ),
        // поки людина друкує — панель ховається (як у WordPress), рух мишки повертає її
        editor.registerCommand(
          KEY_DOWN_COMMAND,
          (e: KeyboardEvent) => {
            // Ctrl+K — посилання (працює й на українській розкладці)
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
              e.preventDefault()
              setTimeout(() => linkRef.current(), 0) // після поточного оновлення редактора
              return true
            }
            if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter')) {
              setTyping(true)
              setMenu(null)
            }
            return false
          },
          COMMAND_PRIORITY_LOW,
        ),
      ),
    [editor, refresh],
  )

  // фокус у редакторі або на самій панелі
  useEffect(() => {
    const check = () => {
      const root = editor.getRootElement()
      const a = document.activeElement
      setFocused(!!a && (!!root?.contains(a) || !!box.current?.contains(a)))
    }
    const onMove = () => setTyping(false)
    document.addEventListener('focusin', check)
    document.addEventListener('focusout', () => setTimeout(check, 0))
    document.addEventListener('mousemove', onMove, { passive: true })
    check()
    return () => {
      document.removeEventListener('focusin', check)
      document.removeEventListener('mousemove', onMove)
    }
  }, [editor])

  // меню закривається кліком поза панеллю та клавішею Esc
  useEffect(() => {
    if (!menu) return
    const down = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setMenu(null)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null)
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', esc)
    }
  }, [menu])
  useEffect(() => setMenu(null), [state?.key])

  // розташування: над поточним блоком, вирівняно по його лівому краю
  const place = useCallback(() => {
    if (!state) return setPos(null)
    const el = editor.getElementByKey(state.key)
    if (!el) return setPos(null)
    const r = el.getBoundingClientRect()
    const a = anchorElem.getBoundingClientRect()
    const width = box.current?.offsetWidth || 400
    setPos({
      top: r.top - a.top - TOOLBAR_H - 8,
      left: Math.max(0, Math.min(r.left - a.left, a.width - width)),
    })
  }, [anchorElem, editor, state])
  useLayoutEffect(place, [place])
  useEffect(() => {
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [place])

  const flash = (text: string) => {
    setHint(text)
    setTimeout(() => setHint(null), 2600)
  }

  const withBlock = (fn: (n: LexicalNode) => void) =>
    editor.update(() => {
      const n = state && $getNodeByKey(state.key)
      if (n) fn(n)
    })

  const setType = (t: BlockType) => {
    setMenu(null)
    if (!state) return
    if (t === 'ul' || t === 'ol') {
      editor.dispatchCommand(state.type === t ? REMOVE_LIST_COMMAND : t === 'ul' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined)
      return
    }
    if (state.type === 'ul' || state.type === 'ol') editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
    editor.update(() => {
      const sel = $getSelection()
      if (!$isRangeSelection(sel)) return
      $setBlocksType(sel, () =>
        t === 'quote' ? $createQuoteNode() : t === 'h2' || t === 'h3' || t === 'h4' ? $createHeadingNode(t) : $createParagraphNode(),
      )
    })
  }

  const move = (dir: -1 | 1) => {
    withBlock((n) => {
      if (dir < 0) n.getPreviousSibling()?.insertBefore(n)
      else n.getNextSibling()?.insertAfter(n)
    })
    requestAnimationFrame(() => state && editor.getElementByKey(state.key)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }

  const format = (f: TextFormatType) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, f)

  const clearFormatting = () => {
    setMenu(null)
    editor.update(() => {
      const sel = $getSelection()
      if (!$isRangeSelection(sel)) return
      ;(['bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'code'] as TextFormatType[]).forEach(
        (f) => sel.hasFormat(f) && sel.formatText(f),
      )
    })
  }

  // Координати відносно редактора
  const rel = (r: DOMRect) => {
    const a = anchorElem.getBoundingClientRect()
    return { top: r.top - a.top, left: r.left - a.left, width: r.width, height: r.height }
  }
  const popPos = (r: { top: number; left: number; height: number }) => ({
    top: r.top + r.height + 10,
    left: Math.max(0, Math.min(r.left, anchorElem.getBoundingClientRect().width - 380)),
  })

  // Посилання: виділений текст (або слово під курсором) → вікно «пошук або адреса»; у посиланні — редагування
  const link = () => {
    setMenu(null)
    if (state?.link) {
      const el = editor.getElementByKey(state.link.key)
      if (!el) return
      const r = rel(el.getBoundingClientRect())
      return setLinkUi({ initial: { url: state.link.url, newTab: state.link.newTab, isNew: false }, pos: popPos(r), rects: [], selection: null, linkKey: state.link.key })
    }
    editor.update(
      () => {
        const sel = $getSelection()
        if ($isRangeSelection(sel) && sel.isCollapsed()) {
          sel.modify('move', true, 'word')
          sel.modify('extend', false, 'word')
        }
        // пробіл після слова в посилання не беремо
        if ($isRangeSelection(sel) && !sel.isCollapsed()) {
          const text = sel.getTextContent()
          const trail = text.length - text.trimEnd().length
          const end = sel.isBackward() ? sel.anchor : sel.focus
          if (trail && end.type === 'text' && end.offset >= trail) end.set(end.key, end.offset - trail, 'text')
        }
      },
      { discrete: true },
    )
    let text = ''
    let saved: RangeSelection | null = null
    editor.getEditorState().read(() => {
      const sel = $getSelection()
      text = sel?.getTextContent() || ''
      if ($isRangeSelection(sel)) saved = sel.clone()
    })
    if (!text.trim() || !saved) return flash('Виділіть текст, який має стати посиланням')
    const dom = window.getSelection()
    const rects = dom && dom.rangeCount ? [...dom.getRangeAt(0).getClientRects()].map(rel) : []
    const last = rects[rects.length - 1] || rel(editor.getElementByKey(state!.key)!.getBoundingClientRect())
    setLinkUi({ initial: { url: '', newTab: false, isNew: true }, pos: popPos(last), rects, selection: saved })
  }

  const applyLink = (url: string, newTab: boolean) => {
    const ui = linkUi
    setLinkUi(null)
    if (!ui) return
    const fields = { linkType: 'custom', url, newTab, doc: null }
    editor.update(() => {
      if (ui.linkKey) {
        const n = $getNodeByKey(ui.linkKey) as any
        if ($isLinkNode(n)) {
          n.setFields({ ...(n as any).getFields(), ...fields })
          n.selectEnd()
        }
      } else if (ui.selection) {
        $setSelection(ui.selection.clone())
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, { fields, text: null } as any)
        const sel = $getSelection()
        if ($isRangeSelection(sel)) {
          const focus = sel.isBackward() ? sel.anchor : sel.focus
          sel.anchor.set(focus.key, focus.offset, focus.type)
        }
      }
    }, { discrete: true })
    // курсор повертаємо окремо: інакше редактор сприйме зміну як «лише фокус» і не позначить документ зміненим
    setTimeout(() => editor.focus(), 0)
  }

  const removeLink = (key?: string) => {
    setLinkUi(null)
    setMenu(null)
    if (!key) return
    editor.update(() => {
      const n = $getNodeByKey(key)
      if (!$isLinkNode(n)) return
      const children = n.getChildren()
      children.forEach((c) => n.insertBefore(c))
      n.remove()
      children[children.length - 1]?.selectEnd?.()
    }, { discrete: true })
    setTimeout(() => editor.focus(), 0)
  }

  linkRef.current = link

  const unlink = () => removeLink(state?.link?.key)

  const insertParagraph = (where: 'before' | 'after') => {
    setMenu(null)
    withBlock((n) => {
      const p = $createParagraphNode()
      if (where === 'before') n.insertBefore(p)
      else n.insertAfter(p)
      p.select()
    })
  }

  const duplicate = () => {
    setMenu(null)
    withBlock((n) => {
      const copy = $parseSerializedNode(serialize(n))
      n.insertAfter(copy)
    })
  }

  const remove = () => {
    setMenu(null)
    withBlock((n) => {
      const prev = n.getPreviousSibling()
      const next = n.getNextSibling()
      n.remove()
      const root = $getRoot()
      if (root.getChildrenSize() === 0) root.append($createParagraphNode())
      const target = prev || next || root.getFirstChild()
      if ($isElementNode(target)) target.selectEnd()
    })
  }

  const show = focused && !typing && !!state && !!pos
  if (!state) return null
  const typeIcon = Icons[state.type as keyof typeof Icons] || Icons.block
  const TypeIcon = typeIcon as () => React.JSX.Element
  const typeLabel = TYPES.find((t) => t.type === state.type)?.label || OTHER_LABEL[state.type] || 'Блок'
  const alignIcon = (ALIGNS.find((a) => a.value === state.align) || ALIGNS[0]).icon
  const AlignIcon = Icons[alignIcon]

  // картка посилання під курсором (коли вікно редагування закрите)
  const linkEl = state.link && !linkUi && focused ? editor.getElementByKey(state.link.key) : null
  const previewPos = linkEl ? popPos(rel(linkEl.getBoundingClientRect())) : null

  return createPortal(
    <>
      <style>{LINK_CSS}</style>
      {linkUi?.rects.map((r, i) => (
        <div key={i} className="lp-sel" style={r} />
      ))}
      {linkUi && (
        <LinkEditPopover
          initial={linkUi.initial}
          pos={linkUi.pos}
          onApply={applyLink}
          onRemove={() => removeLink(linkUi.linkKey)}
          onClose={() => {
            setLinkUi(null)
            setTimeout(() => editor.focus(), 0)
          }}
        />
      )}
      {state.link && previewPos && (
        <LinkPreview url={state.link.url} pos={previewPos} onEdit={link} onRemove={unlink} />
      )}
    <div
      ref={box}
      className={`bt ${show ? 'show' : ''}`}
      style={pos ? { top: pos.top, left: pos.left } : undefined}
      role="toolbar"
      aria-label="Панель блоку"
    >
      <style>{CSS}</style>
      {/* 1. Тип блоку */}
      <div className="bt-group">
        <Btn
          label={state.isText ? `${typeLabel} — змінити тип блоку` : typeLabel}
          on={menu === 'type'}
          disabled={!state.isText}
          onClick={() => setMenu(menu === 'type' ? null : 'type')}
          className="bt-type"
        >
          <TypeIcon />
        </Btn>
        <div className="bt-move">
          <Btn label="Перемістити вгору" disabled={!state.canUp} onClick={() => move(-1)}>
            <Icons.up />
          </Btn>
          <Btn label="Перемістити вниз" disabled={!state.canDown} onClick={() => move(1)}>
            <Icons.down />
          </Btn>
        </div>
        {menu === 'type' && (
          <div className="bt-menu" role="menu">
            <div className="bt-menu-title">Перетворити на</div>
            {TYPES.map((t) => {
              const Ico = Icons[t.type as keyof typeof Icons] as () => React.JSX.Element
              return <Item key={t.type} icon={<Ico />} label={t.label} on={state.type === t.type} onClick={() => setType(t.type)} />
            })}
          </div>
        )}
      </div>

      {state.isText && (
        <>
          {/* 2. Вирівнювання */}
          <div className="bt-group">
            <Btn label="Вирівнювання" on={menu === 'align'} onClick={() => setMenu(menu === 'align' ? null : 'align')}>
              <AlignIcon />
            </Btn>
            {menu === 'align' && (
              <div className="bt-menu" role="menu">
                {ALIGNS.map((a) => {
                  const Ico = Icons[a.icon]
                  return (
                    <Item
                      key={a.value}
                      icon={<Ico />}
                      label={`Вирівняти ${a.label.toLowerCase()}`}
                      on={state.align === a.value || (a.value === 'left' && !state.align)}
                      onClick={() => {
                        setMenu(null)
                        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, a.value)
                      }}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* 3. Оформлення тексту і посилання */}
          <div className="bt-group">
            <Btn label="Жирний (Ctrl+B)" on={state.formats.bold} onClick={() => format('bold')}>
              <Icons.bold />
            </Btn>
            <Btn label="Курсив (Ctrl+I)" on={state.formats.italic} onClick={() => format('italic')}>
              <Icons.italic />
            </Btn>
            <Btn label={state.link ? 'Змінити посилання' : 'Додати посилання (Ctrl+K)'} on={!!state.link} onClick={link}>
              <Icons.link />
            </Btn>
            <Btn label="Ще: підкреслений, закреслений…" on={menu === 'more'} onClick={() => setMenu(menu === 'more' ? null : 'more')} className="bt-narrow">
              <Icons.caret />
            </Btn>
            {menu === 'more' && (
              <div className="bt-menu" role="menu">
                <Item icon={<Icons.underline />} label="Підкреслений" on={state.formats.underline} onClick={() => format('underline')} />
                <Item icon={<Icons.strike />} label="Закреслений" on={state.formats.strikethrough} onClick={() => format('strikethrough')} />
                {state.link && <Item icon={<Icons.unlink />} label="Прибрати посилання" onClick={unlink} />}
                <Item icon={<Icons.clear />} label="Очистити форматування" onClick={clearFormatting} />
              </div>
            )}
            {hint && <div className="bt-hint">{hint}</div>}
          </div>
        </>
      )}

      {/* 4. Дії з блоком */}
      <div className="bt-group">
        <Btn label="Дії з блоком" on={menu === 'options'} onClick={() => setMenu(menu === 'options' ? null : 'options')}>
          <Icons.more />
        </Btn>
        {menu === 'options' && (
          <div className="bt-menu bt-menu-right" role="menu">
            <Item icon={<Icons.before />} label="Додати абзац перед" onClick={() => insertParagraph('before')} />
            <Item icon={<Icons.after />} label="Додати абзац після" onClick={() => insertParagraph('after')} />
            <Item icon={<Icons.copy />} label="Дублювати" onClick={duplicate} />
            <div className="bt-sep" />
            <Item icon={<Icons.trash />} label="Видалити блок" danger onClick={remove} />
          </div>
        )}
      </div>
    </div>
    </>,
    anchorElem,
  )
}

const CSS = `
.bt { position: absolute; z-index: 60; font-family: var(--font-body, system-ui, -apple-system, "Segoe UI", sans-serif); font-size: 13px; line-height: 1.3; display: flex; align-items: stretch; height: ${TOOLBAR_H}px; background: var(--theme-elevation-0);
  border: 1px solid var(--theme-elevation-900); border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,.12);
  opacity: 0; pointer-events: none; transform: translateY(4px); transition: opacity .15s ease, transform .15s ease; }
.bt.show { opacity: 1; pointer-events: auto; transform: none; }
.bt-group { position: relative; display: flex; align-items: center; gap: 2px; padding: 0 6px; }
.bt-group + .bt-group { border-left: 1px solid var(--theme-elevation-200); }
.bt-btn { min-width: 36px; height: 36px; padding: 0 6px; display: inline-grid; place-items: center; border: 0; border-radius: 3px; background: transparent;
  color: var(--theme-elevation-900); cursor: pointer; }
.bt-btn:hover:not(:disabled) { background: var(--theme-elevation-100); }
.bt-btn.on { background: var(--theme-elevation-900); color: var(--theme-elevation-0); }
.bt-btn:disabled { opacity: .35; cursor: default; }
.bt-btn:focus-visible { outline: 2px solid #3858e9; outline-offset: 1px; }
.bt-narrow { min-width: 22px; padding: 0 2px; }
.bt-type { min-width: 40px; }
.bt-move { display: flex; flex-direction: column; justify-content: center; }
.bt-move .bt-btn { min-width: 24px; width: 24px; height: 18px; padding: 0; }
.bt-menu { position: absolute; top: calc(100% + 8px); left: 0; min-width: 230px; padding: 6px; background: var(--theme-elevation-0);
  border: 1px solid var(--theme-elevation-900); border-radius: 4px; box-shadow: 0 6px 24px rgba(0,0,0,.18); z-index: 61; }
.bt-menu-right { left: auto; right: 0; }
.bt-menu-title { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--theme-elevation-500); padding: 6px 10px 4px; }
.bt-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 6px 10px; border: 0; border-radius: 3px; background: none;
  color: var(--theme-elevation-900); font: inherit; font-size: 13px; text-align: left; cursor: pointer; }
.bt-item:hover { background: var(--theme-elevation-100); }
.bt-item.on { color: #3858e9; font-weight: 600; }
.bt-item.danger { color: #cc1818; }
.bt-item-ico { display: inline-grid; place-items: center; width: 24px; height: 24px; }
.bt-item-check { margin-left: auto; display: inline-grid; }
.bt-sep { height: 1px; margin: 6px 4px; background: var(--theme-elevation-150); }
.bt-hint { position: absolute; top: calc(100% + 8px); left: 0; white-space: nowrap; padding: 6px 10px; border-radius: 4px; font-size: 12px;
  background: var(--theme-elevation-900); color: var(--theme-elevation-0); z-index: 31; }
`
