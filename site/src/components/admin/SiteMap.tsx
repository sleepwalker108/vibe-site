import type { Payload } from 'payload'

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

type Row = { label: string; url?: string | null; edit?: string; hint?: string }

// Головна сторінка адмінки: «Структура сайту» — меню сайту з кнопками «Редагувати» для кожного розділу
export const SiteMap = async ({ payload }: { payload: Payload }) => {
  const [nav, pages] = await Promise.all([
    payload.findGlobal({ slug: 'navigation', depth: 0, locale: 'uk' }),
    payload.find({ collection: 'pages', limit: 500, depth: 0, locale: 'uk', select: { title: true, slug: true }, sort: 'title' }),
  ])
  const bySlug = new Map(pages.docs.map((p) => [p.slug, p]))
  const used = new Set<string>()

  // Куди вести кнопку «Редагувати» для адреси з меню
  const target = (url?: string | null): Pick<Row, 'edit' | 'hint'> => {
    if (!url) return {}
    const path = decode(url)
    if (path === '/') return { edit: '/admin/globals/home', hint: 'Головна сторінка' }
    if (path === '/news' || path.startsWith('/news/')) return { edit: '/admin/collections/news', hint: 'Новини' }
    if (path === '/video') return { edit: '/admin/collections/videos', hint: 'Відео' }
    if (/^https?:/.test(path)) return { hint: 'Зовнішній сайт' }
    const page = bySlug.get(path.replace(/^\//, ''))
    if (!page) return { hint: 'Сторінку не знайдено' }
    used.add(page.slug!)
    return { edit: `/admin/collections/pages/${page.id}` }
  }

  const sections = (nav.items || []).map((i) => ({
    label: i.label,
    self: { label: i.label, url: i.url, ...target(i.url) } as Row,
    children: (i.children || []).map((c) => ({ label: c.label, url: c.url, ...target(c.url) }) as Row),
  }))

  // Сторінки, на які меню не веде (напр. «Фінансова звітність 2025» — на них ведуть посилання з тексту розділу)
  const others = pages.docs.filter((p) => p.slug && !used.has(p.slug))

  const RowView = ({ r }: { r: Row }) => (
    <li className="sm-row">
      <span className="sm-label">{r.label}</span>
      {r.hint && <span className="sm-hint">{r.hint}</span>}
      <span className="sm-actions">
        {r.edit && (
          <a className="sm-btn sm-edit" href={r.edit}>
            Редагувати
          </a>
        )}
        {r.url && (
          <a className="sm-btn" href={r.url} target="_blank" rel="noopener noreferrer">
            На сайті ↗
          </a>
        )}
      </span>
    </li>
  )

  return (
    <section className="sitemap">
      <style>{CSS}</style>
      <div className="sm-head">
        <h2>Структура сайту</h2>
        <p>Усі розділи — як у меню сайту. Натисніть «Редагувати», щоб відкрити потрібну сторінку.</p>
      </div>

      <div className="sm-grid">
        <div className="sm-card sm-main">
          <h3>Головне</h3>
          <ul>
            <RowView r={{ label: 'Головна сторінка (перший екран, картки, евакуація, ресурси)', url: '/', edit: '/admin/globals/home' }} />
            <RowView r={{ label: 'Меню сайту', edit: '/admin/globals/navigation' }} />
            <RowView r={{ label: 'Статистика гарячих ліній', url: '/#stats', edit: '/admin/globals/stats' }} />
            <RowView r={{ label: 'Річний звіт гарячих ліній', url: '/#report', edit: '/admin/globals/annual-report' }} />
            <RowView r={{ label: 'Мапа: статуси територій', url: '/#territories', edit: '/admin/globals/territories' }} />
            <RowView r={{ label: 'Контакти й підвал, логотип', edit: '/admin/globals/contacts' }} />
            <RowView r={{ label: 'Новини', url: '/news', edit: '/admin/collections/news' }} />
            <RowView r={{ label: 'Відеоматеріали', url: '/video', edit: '/admin/collections/videos' }} />
          </ul>
        </div>

        {sections.map((s) => (
          <div className="sm-card" key={s.label}>
            <h3>{s.label}</h3>
            <ul>
              {s.self.url && <RowView r={s.self} />}
              {s.children.map((c) => (
                <RowView r={c} key={c.label} />
              ))}
            </ul>
          </div>
        ))}

        {others.length > 0 && (
          <div className="sm-card">
            <h3>Інші сторінки</h3>
            <p className="sm-note">Їх немає в меню — на них ведуть посилання з тексту інших сторінок.</p>
            <ul>
              {others.map((p) => (
                <RowView key={p.id} r={{ label: p.title, url: `/${p.slug}`, edit: `/admin/collections/pages/${p.id}` }} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

const CSS = `
.sitemap { margin: 0 0 40px; }
.sm-head h2 { margin: 0 0 4px; }
.sm-head p { margin: 0 0 18px; color: var(--theme-elevation-600); }
.sm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; }
.sm-card { border: 1px solid var(--theme-elevation-150); border-radius: 12px; padding: 16px 18px; background: var(--theme-elevation-0); }
.sm-main { border-color: #ffd500; }
.sm-card h3 { margin: 0 0 10px; font-size: 1rem; }
.sm-card ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.sm-note { margin: -4px 0 10px; font-size: .85rem; color: var(--theme-elevation-500); }
.sm-row { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 8px; }
.sm-row:hover { background: var(--theme-elevation-50); }
.sm-label { flex: 1; min-width: 0; line-height: 1.3; }
.sm-hint { font-size: .75rem; color: var(--theme-elevation-500); white-space: nowrap; }
.sm-actions { display: flex; gap: 6px; flex: none; }
.sm-btn { font-size: .78rem; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--theme-elevation-200); text-decoration: none; color: inherit; white-space: nowrap; }
.sm-btn:hover { border-color: var(--theme-elevation-500); }
.sm-edit { background: #ffd500; border-color: #ffd500; color: #0a2440; font-weight: 600; }
.sm-edit:hover { background: #ffe14d; border-color: #ffe14d; }
`
