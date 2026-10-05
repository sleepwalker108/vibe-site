import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import { getReport, type Item, type Report } from '@/lib/visitStats'
import { STATS_CSS } from './statsStyles'

const PERIODS = [7, 30, 90] as const
const fmt = (n: number) => n.toLocaleString('uk-UA')
// 1 перегляд, 2 перегляди, 5 переглядів
const plural = (n: number, [one, few, many]: [string, string, string]) => {
  const m10 = n % 10
  const m100 = n % 100
  const word = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many
  return `${fmt(n)} ${word}`
}
const DEVICE: Record<string, string> = { desktop: "Комп'ютер", mobile: 'Телефон', tablet: 'Планшет' }
const LANG: Record<string, string> = { uk: 'Українська', en: 'English' }
const MONTHS = ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд']
const dayLabel = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

// «Гарна» верхня межа шкали: 1, 2, 5 × 10ⁿ
const niceMax = (v: number) => {
  if (v <= 4) return 4
  const p = 10 ** Math.floor(Math.log10(v))
  return ([1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v) as number) || v
}

const Trend = ({ now, before }: { now: number; before: number }) => {
  if (!before) return <span className="st-trend">{now ? 'нові дані' : '—'}</span>
  const pct = Math.round(((now - before) / before) * 100)
  return (
    <span className={`st-trend ${pct > 0 ? 'up' : pct < 0 ? 'down' : ''}`}>
      {pct > 0 ? '▲' : pct < 0 ? '▼' : '•'} {Math.abs(pct)}% <small>до попередніх днів</small>
    </span>
  )
}

const Chart = ({ report }: { report: Report }) => {
  const max = niceMax(Math.max(...report.perDay.map((d) => d.views), 0))
  const step = report.days <= 7 ? 1 : report.days <= 30 ? 5 : 14
  return (
    <div className="st-card">
      <div className="st-card-head">
        <h3>Відвідування за днями</h3>
        <div className="st-legend">
          <span>
            <i className="sw views" /> Перегляди сторінок
          </span>
          <span>
            <i className="sw visitors" /> Відвідувачі
          </span>
        </div>
      </div>
      <div className="st-chart" style={{ ['--cols' as string]: report.days }}>
        <div className="st-grid">
          {[1, 0.5, 0].map((f) => (
            <div key={f} className="st-gridline" style={{ bottom: `${f * 100}%` }}>
              <span>{fmt(Math.round(max * f))}</span>
            </div>
          ))}
        </div>
        <div className="st-bars">
          {report.perDay.map((d, i) => (
            <div key={d.date} className="st-col" tabIndex={0}>
              <div className="st-bar views" style={{ height: `${(d.views / max) * 100}%` }} />
              <div className="st-bar visitors" style={{ height: `${(d.visitors / max) * 100}%` }} />
              <div className={`st-tip${i > report.days * 0.7 ? ' left' : ''}`}>
                <b>{dayLabel(d.date)}</b>
                <span>
                  <i className="sw views" /> {plural(d.views, ['перегляд', 'перегляди', 'переглядів'])}
                </span>
                <span>
                  <i className="sw visitors" /> {plural(d.visitors, ['відвідувач', 'відвідувачі', 'відвідувачів'])}
                </span>
              </div>
              {(report.days - 1 - i) % step === 0 && <div className="st-x">{dayLabel(d.date)}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const Table = ({
  title,
  items,
  total,
  label,
  empty = 'Поки немає даних',
}: {
  title: string
  items: Item[]
  total: number
  label: (i: Item) => React.ReactNode
  empty?: string
}) => (
  <div className="st-card">
    <h3>{title}</h3>
    {items.length ? (
      <table className="st-table">
        <thead>
          <tr>
            <th />
            <th>Перегляди</th>
            <th>Відвідувачі</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.label}>
              <td>
                <div className="st-name">{label(it)}</div>
                <div className="st-share">
                  <span style={{ width: `${total ? (it.views / total) * 100 : 0}%` }} />
                </div>
              </td>
              <td>{fmt(it.views)}</td>
              <td>{fmt(it.visitors)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p className="st-empty">{empty}</p>
    )}
  </div>
)

// Розділ адмінки «Статистика відвідувань»
export const StatsView = async ({ initPageResult, params, searchParams }: AdminViewServerProps) => {
  const { req, permissions, visibleEntities, locale } = initPageResult
  if (!req.user) redirect('/admin/login?redirect=%2Fadmin%2Fstats')

  const asked = Number(searchParams?.days)
  const days = (PERIODS as readonly number[]).includes(asked) ? asked : 30
  const report = await getReport(req.payload, days)

  // Назви сторінок і новин замість адрес
  const slugs = report.pages.map((p) => decode(p.label))
  const [pages, news] = await Promise.all([
    req.payload.find({
      collection: 'pages',
      where: { slug: { in: slugs.map((s) => s.replace(/^\//, '')) } },
      limit: 50,
      depth: 0,
      locale: 'uk',
      select: { title: true, slug: true },
    }),
    req.payload.find({
      collection: 'news',
      where: { slug: { in: slugs.filter((s) => s.startsWith('/news/')).map((s) => s.slice(6)) } },
      limit: 50,
      depth: 0,
      locale: 'uk',
      select: { title: true, slug: true },
    }),
  ])
  const titles = new Map<string, string>([
    ['/', 'Головна сторінка'],
    ['/news', 'Новини (список)'],
    ['/video', 'Відеоматеріали'],
    ...pages.docs.map((p) => [`/${p.slug}`, p.title] as [string, string]),
    ...news.docs.map((n) => [`/news/${n.slug}`, `Новина: ${n.title}`] as [string, string]),
  ])
  const total = report.current.views
  const empty = total === 0

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user}
      visibleEntities={visibleEntities}
    >
      <style>{STATS_CSS}</style>
      <div className="st-wrap">
        <div className="st-head">
          <div>
            <h1>Статистика відвідувань</h1>
            <p className="st-sub">
              Рахуються лише відвідувачі сайту — без ботів і без працівників, які увійшли в адмінку. Без файлів cookie та
              збору особистих даних.
            </p>
          </div>
          <nav className="st-periods" aria-label="Період">
            {PERIODS.map((p) => (
              <a key={p} href={`/admin/stats?days=${p}`} className={p === days ? 'active' : undefined}>
                {p} днів
              </a>
            ))}
          </nav>
        </div>

        {empty && (
          <div className="st-note">
            Статистика збирається з моменту ввімкнення. Перші цифри з’являться, щойно хтось відкриє сайт.
          </div>
        )}

        <div className="st-kpis">
          <div className="st-kpi">
            <div className="st-kpi-label">Відвідувачі</div>
            <div className="st-kpi-value">{fmt(report.current.visitors)}</div>
            <Trend now={report.current.visitors} before={report.previous.visitors} />
          </div>
          <div className="st-kpi">
            <div className="st-kpi-label">Перегляди сторінок</div>
            <div className="st-kpi-value">{fmt(report.current.views)}</div>
            <Trend now={report.current.views} before={report.previous.views} />
          </div>
          <div className="st-kpi">
            <div className="st-kpi-label">Сторінок на відвідувача</div>
            <div className="st-kpi-value">
              {report.current.visitors ? (report.current.views / report.current.visitors).toFixed(1).replace('.', ',') : '—'}
            </div>
            <span className="st-trend">у середньому за {days} днів</span>
          </div>
          <div className="st-kpi">
            <div className="st-kpi-label">Зараз на сайті</div>
            <div className="st-kpi-value">
              <span className={`st-live${report.online ? ' on' : ''}`} /> {fmt(report.online)}
            </div>
            <span className="st-trend">за останні 5 хвилин</span>
          </div>
        </div>

        <Chart report={report} />

        <div className="st-cols">
          <Table
            title="Найпопулярніші сторінки"
            items={report.pages}
            total={total}
            label={(it) => {
              const path = decode(it.label)
              return (
                <a href={path} target="_blank" rel="noopener noreferrer" title={path}>
                  {titles.get(path) || path}
                </a>
              )
            }}
          />
          <div className="st-stack">
            <Table
              title="Звідки приходять"
              items={report.referrers}
              total={total}
              label={(it) => it.label || 'Прямі заходи (закладки, введена адреса)'}
            />
            <Table title="Пристрої" items={report.devices} total={total} label={(it) => DEVICE[it.label] || it.label} />
            <Table title="Мова сайту" items={report.langs} total={total} label={(it) => LANG[it.label] || it.label} />
          </div>
        </div>
      </div>
    </DefaultTemplate>
  )
}
