'use client'
import { useEffect, useRef, useState } from 'react'
import { Icons } from './icons'

/**
 * Вікно посилання як у WordPress: одне поле «пошук або адреса» + підказки зі сторінок і новин сайту.
 * Enter — вставити, ↑/↓ — вибір підказки, Esc — закрити.
 */

export type LinkTarget = { url: string; newTab: boolean; isNew: boolean }
type Result = { title: string; url: string; kind: string }

// Те, що людина ввела, як адреса: сайт, пошта, телефон, адреса на нашому сайті
export const toUrl = (raw: string): string | null => {
  const q = raw.trim()
  if (!q) return null
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(q)) return q
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q)) return `mailto:${q}`
  if (/^\+?[\d\s()-]{3,}$/.test(q) && /\d{3,}/.test(q.replace(/\D/g, ''))) return `tel:${q.replace(/[\s()-]/g, '')}`
  if (/^[^\s/]+\.[a-zа-яіїєґ]{2,}(\/\S*)?$/i.test(q)) return `https://${q}`
  return null
}

export const prettyUrl = (url: string) => {
  try {
    return decodeURI(url).replace(/^https?:\/\/(www\.)?/, '').replace(/^mailto:/, '').replace(/^tel:/, '☎ ')
  } catch {
    return url
  }
}

const search = async (q: string, signal: AbortSignal): Promise<Result[]> => {
  const like = q ? `&where[title][like]=${encodeURIComponent(q)}` : ''
  const get = (col: string, sort: string, limit: number) =>
    fetch(`/api/${col}?depth=0&limit=${limit}&sort=${sort}&select[title]=true&select[slug]=true&locale=uk${like}`, { credentials: 'include', signal })
      .then((r) => (r.ok ? r.json() : { docs: [] }))
      .then((j) => j.docs as { title?: string; slug?: string }[])
  const [pages, news] = await Promise.all([get('pages', 'title', q ? 6 : 3), get('news', '-publishedAt', q ? 6 : 4)])
  return [
    ...pages.filter((p) => p.slug).map((p) => ({ title: p.title || p.slug!, url: `/${p.slug}`, kind: 'Сторінка' })),
    ...news.filter((n) => n.slug).map((n) => ({ title: n.title || n.slug!, url: `/news/${n.slug}`, kind: 'Новина' })),
  ]
}

export const LinkEditPopover = ({
  initial,
  pos,
  onApply,
  onRemove,
  onClose,
}: {
  initial: LinkTarget
  pos: { top: number; left: number }
  onApply: (url: string, newTab: boolean) => void
  onRemove: () => void
  onClose: () => void
}) => {
  const [q, setQ] = useState(() => {
    try {
      return decodeURI(initial.url)
    } catch {
      return initial.url
    }
  })
  const [newTab, setNewTab] = useState(initial.newTab)
  const [results, setResults] = useState<Result[] | null>(null)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    input.current?.focus()
    input.current?.select()
  }, [])

  // підказки: поки поле порожнє — останні новини й сторінки, далі — пошук за назвою
  useEffect(() => {
    const typed = toUrl(q)
    if (typed && !typed.startsWith('/')) return setResults([])
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      search(typed ? '' : q.trim(), ctrl.signal)
        .then((r) => {
          setResults(typed ? [] : r)
          setActive(0)
        })
        .catch(() => {})
    }, 180)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [q])

  // клік поза вікном — закрити
  useEffect(() => {
    const down = (e: MouseEvent) => !box.current?.contains(e.target as Node) && onClose()
    document.addEventListener('mousedown', down)
    return () => document.removeEventListener('mousedown', down)
  }, [onClose])

  const typed = toUrl(q)
  const options: Result[] = [
    ...(typed ? [{ title: prettyUrl(typed), url: typed, kind: 'Адреса' }] : []),
    ...(results || []),
  ]

  const choose = (r?: Result) => {
    const url = r?.url || typed
    if (url) onApply(url, newTab)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(options[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div ref={box} className="lp" style={{ top: pos.top, left: pos.left }} role="dialog" aria-label={initial.isNew ? 'Додати посилання' : 'Змінити посилання'}>
      <div className="lp-field">
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Введіть пошуковий запит або адресу"
          aria-label="Пошук сторінки або адреса посилання"
          role="combobox"
          aria-expanded={options.length > 0}
          aria-controls="lp-results"
          aria-activedescendant={options.length ? `lp-opt-${active}` : undefined}
        />
        <button type="button" className="lp-submit" title="Вставити (Enter)" aria-label="Вставити посилання" disabled={!options.length} onClick={() => choose(options[active])}>
          ↵
        </button>
      </div>

      {options.length > 0 ? (
        <ul className="lp-results" id="lp-results" role="listbox">
          {options.map((r, i) => (
            <li
              key={r.url + i}
              id={`lp-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : undefined}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(r)}
            >
              <span className="lp-ico">{r.kind === 'Адреса' ? <Icons.link /> : <Icons.page />}</span>
              <span className="lp-text">
                <span className="lp-title">{r.title}</span>
                {r.kind !== 'Адреса' && <span className="lp-url">{prettyUrl(r.url)}</span>}
              </span>
              <span className="lp-kind">{r.kind}</span>
            </li>
          ))}
        </ul>
      ) : (
        q.trim() && results && <div className="lp-empty">Нічого не знайдено. Вставте повну адресу, напр. https://minre.gov.ua</div>
      )}

      <div className="lp-foot">
        <label className="lp-check">
          <input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} />
          Відкривати в новій вкладці
        </label>
        {!initial.isNew && (
          <button type="button" className="lp-remove" onClick={onRemove}>
            Прибрати посилання
          </button>
        )}
      </div>
    </div>
  )
}

// Картка посилання під курсором: адреса + змінити / прибрати / копіювати
export const LinkPreview = ({
  url,
  pos,
  onEdit,
  onRemove,
}: {
  url: string
  pos: { top: number; left: number }
  onEdit: () => void
  onRemove: () => void
}) => {
  const [copied, setCopied] = useState(false)
  const full = url.startsWith('/') ? window.location.origin + url : url
  return (
    <div className="lp lp-preview" style={{ top: pos.top, left: pos.left }} onMouseDown={(e) => e.preventDefault()}>
      <span className="lp-ico">
        <Icons.link />
      </span>
      <a className="lp-preview-url" href={full} target="_blank" rel="noopener noreferrer" title={full}>
        {prettyUrl(url)}
      </a>
      <button type="button" className="bt-btn" title="Змінити посилання" aria-label="Змінити посилання" onClick={onEdit}>
        <Icons.edit />
      </button>
      <button type="button" className="bt-btn" title="Прибрати посилання" aria-label="Прибрати посилання" onClick={onRemove}>
        <Icons.unlink />
      </button>
      <button
        type="button"
        className="bt-btn"
        title={copied ? 'Скопійовано' : 'Копіювати адресу'}
        aria-label="Копіювати адресу"
        onClick={() => {
          navigator.clipboard?.writeText(full).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1400)
          })
        }}
      >
        {copied ? <Icons.check /> : <Icons.copy />}
      </button>
    </div>
  )
}

export const LINK_CSS = `
.lp { position: absolute; z-index: 62; width: 380px; max-width: calc(100vw - 32px); background: var(--theme-elevation-0); color: var(--theme-elevation-900);
  border: 1px solid var(--theme-elevation-200); border-radius: 4px; box-shadow: 0 8px 28px rgba(0,0,0,.2);
  font-family: var(--font-body, system-ui, -apple-system, "Segoe UI", sans-serif); font-size: 13px; line-height: 1.35; }
.lp-field { display: flex; align-items: center; margin: 16px; border: 1.5px solid #3858e9; border-radius: 3px; }
.lp-field input { flex: 1; min-width: 0; height: 40px; padding: 0 12px; border: 0; outline: 0; background: transparent; color: inherit; font: inherit; font-size: 14px; }
.lp-submit { width: 40px; height: 40px; border: 0; background: none; color: var(--theme-elevation-600); font-size: 18px; cursor: pointer; }
.lp-submit:disabled { opacity: .35; cursor: default; }
.lp-results { list-style: none; margin: 0; padding: 0 8px 8px; max-height: 280px; overflow: auto; }
.lp-results li { display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: 3px; cursor: pointer; }
.lp-results li.active { background: var(--theme-elevation-100); }
.lp-ico { flex: none; display: inline-grid; place-items: center; width: 24px; color: var(--theme-elevation-700); }
.lp-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.lp-title { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lp-url { color: var(--theme-elevation-500); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lp-kind { flex: none; color: var(--theme-elevation-600); font-size: 12px; }
.lp-empty { padding: 0 18px 14px; color: var(--theme-elevation-600); }
.lp-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px; border-top: 1px solid var(--theme-elevation-150); }
.lp-check { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
.lp-remove { border: 0; background: none; color: #cc1818; font: inherit; cursor: pointer; padding: 4px 0; }
.lp-preview { width: auto; display: flex; align-items: center; gap: 4px; padding: 6px 6px 6px 12px; }
.lp-preview-url { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #3858e9; margin-right: 6px; }
html[data-theme='dark'] .lp-preview-url { color: #9db0ff; }
html[data-theme='dark'] .lp-field { border-color: #7b8cff; }
.lp-sel { position: absolute; z-index: 1; background: rgba(56, 88, 233, .22); pointer-events: none; border-radius: 2px; }
/* стандартна картка посилання редактора — замінена нашою */
.link-editor { display: none !important; }
`
