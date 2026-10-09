import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import { getReport, type Item, type Lang, type Report } from '@/lib/visitStats'
import { STATS_CSS } from './statsStyles'
import { MyGeo } from './MyGeo'
import { visitorCountry } from '@/lib/geo'

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
// перемикач мовної версії: увесь сайт / лише українська / лише англійська
const LANGS: { value: Lang; label: string }[] = [
  { value: 'all', label: 'Усі мови' },
  { value: 'uk', label: 'Українська' },
  { value: 'en', label: 'English' },
]
// назви країн українською: UA → «Україна», PL → «Польща»
const regionNames = new Intl.DisplayNames(['uk'], { type: 'region' })
const countryName = (code: string) => {
  if (!code) return 'Не визначено'
  if (code === 'LAN') return 'Внутрішня мережа'
  if (code === 'OLD') return 'Без країни (до оновлення)'
  try {
    return regionNames.of(code) || code
  } catch {
    return code
  }
}
const COUNTRY_HINT: Record<string, string> = {
  LAN: 'Сайт відкрили з внутрішньої мережі (Wi-Fi чи мережа установи) — у таких адрес немає країни',
  OLD: 'Відвідування до того, як статистика почала визначати країну',
  '': 'Країну за цією адресою не знайдено в базі',
}
const statsUrl = (days: number, lang: Lang) => `/admin/stats?days=${days}${lang === 'all' ? '' : `&lang=${lang}`}`
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
  const lang: Lang = searchParams?.lang === 'en' || searchParams?.lang === 'uk' ? searchParams.lang : 'all'
  const report = await getReport(req.payload, days, lang)
  // назви сторінок — мовою вибраної версії (англійська — якщо вона є, інакше українська)
  const titleLocale = lang === 'en' ? 'en' : 'uk'

  // Назви сторінок і новин замість адрес
  const slugs = report.pages.map((p) => decode(p.label))
  const [pages, news] = await Promise.all([
    req.payload.find({
      collection: 'pages',
      where: { slug: { in: slugs.map((s) => s.replace(/^\//, '')) } },
      limit: 50,
      depth: 0,
      locale: titleLocale,
      select: { title: true, slug: true },
    }),
    req.payload.find({
      collection: 'news',
      where: { slug: { in: slugs.filter((s) => s.startsWith('/news/')).map((s) => s.slice(6)) } },
      limit: 50,
      depth: 0,
      locale: titleLocale,
      select: { title: true, slug: true },
    }),
  ])
  const titles = new Map<string, string>([
    ['/', 'Головна сторінка'],
    ['/news', 'Новини (список)'],
    ['/video', 'Відеоматеріали'],
    ['/search', 'Пошук по сайту'],
    ...pages.docs.map((p) => [`/${p.slug}`, p.title] as [string, string]),
    ...news.docs.map((n) => [`/news/${n.slug}`, `Новина: ${n.title}`] as [string, string]),
  ])
  const total = report.current.views
  const me = visitorCountry(req.headers)
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
            <h1>
              Статистика відвідувань
              {lang !== 'all' && <span className="st-badge">{lang === 'en' ? 'англійська версія' : 'українська версія'}</span>}
            </h1>
            <p className="st-sub">
              Рахуються лише відвідувачі сайту — без ботів і без працівників, які увійшли в адмінку. Без файлів cookie та
              збору особистих даних.
            </p>
          </div>
          <div className="st-controls">
            <nav className="st-periods" aria-label="Версія сайту">
              {LANGS.map((l) => (
                <a key={l.value} href={statsUrl(days, l.value)} className={l.value === lang ? 'active' : undefined} aria-current={l.value === lang ? 'page' : undefined}>
                  {l.label}
                </a>
              ))}
            </nav>
            <nav className="st-periods" aria-label="Період">
              {PERIODS.map((p) => (
                <a key={p} href={statsUrl(p, lang)} className={p === days ? 'active' : undefined} aria-current={p === days ? 'page' : undefined}>
                  {p} днів
                </a>
              ))}
            </nav>
          </div>
        </div>

        {empty && (
          <div className="st-note">
            {lang === 'all'
              ? 'Статистика збирається з моменту ввімкнення. Перші цифри з’являться, щойно хтось відкриє сайт.'
              : `За цей період ${lang === 'en' ? 'англійську' : 'українську'} версію сайту ще не відкривали.`}
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
            <div className="st-stack-item">
              <Table
                title="Країни"
                items={report.countries}
                total={total}
                label={(it) => (
                  <span title={COUNTRY_HINT[it.label]}>
                    {/^[A-Z]{2}$/.test(it.label) && <span className="st-code">{it.label}</span>}
                    {countryName(it.label)}
                  </span>
                )}
              />
              <MyGeo ip={me.ip} byIp={countryName(me.byIp)} />
            </div>
            <Table title="Пристрої" items={report.devices} total={total} label={(it) => DEVICE[it.label] || it.label} />
            <Table
              title="Мова сайту (весь сайт)"
              items={report.langs}
              total={report.langs.reduce((n, it) => n + it.views, 0)}
              label={(it) =>
                it.label === 'uk' || it.label === 'en' ? (
                  <a href={statsUrl(days, it.label)} title="Показати статистику лише цієї версії">
                    {LANG[it.label]}
                  </a>
                ) : (
                  it.label
                )
              }
            />
          </div>
        </div>
      </div>
    </DefaultTemplate>
  )
}
