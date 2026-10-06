import type { Territory } from '@/payload-types'
import { UA_MAP_VIEWBOX, UA_REGIONS } from '@/data/ukraineMap'
import { StatsAnimator } from './StatsAnimator'
import { REGION_NAMES_EN, type Dict, type Locale } from '@/lib/dictionary'
import { TerrPicker } from './TerrPicker'

// Від «можливих бойових дій» до «окуповано» — одна шкала від світлого до темного
// (перевірено: сусідні кольори розрізняються і при нормальному зорі, і при дальтонізмі)
const STATUSES = [
  { key: 'possible', color: '#fad6ce', dictKey: 'statusPossible' },
  { key: 'eres', color: '#ef8a74', dictKey: 'statusEres' },
  { key: 'active', color: '#d63f1e', dictKey: 'statusActive' },
  { key: 'occupied', color: '#861a08', dictKey: 'statusOccupied' },
] as const
type StatusKey = (typeof STATUSES)[number]['key']
// короткі назви статусів (ті самі, що в заголовках таблиці)
const COL_KEY = { possible: 'colPossible', eres: 'colEres', active: 'colActive', occupied: 'colOccupied' } as const

// Розкладка кружечків на мапі (одиниці — пікселі мапи шириною 1000):
//   at   — зсув кружечка від центру області, щоб сусідні не налазили;
//   rot  — поворот кружечка (частка кола), щоб дрібні сегменти з підписами дивились у вільне місце;
//   name — де стоїть назва області відносно кружечка: [dx, dy, вирівнювання]
type Layout = { at?: [number, number]; rot?: number; name?: [number, number, 'start' | 'middle' | 'end'] }
const LAYOUT: Record<string, Layout> = {
  'UA-74': { name: [0, -56, 'middle'] }, // Чернігівська
  'UA-59': { at: [6, 0], name: [56, 4, 'start'] }, // Сумська
  'UA-63': { at: [-4, -6], rot: 0.25, name: [-52, 2, 'end'] }, // Харківська
  'UA-09': { at: [0, -10], name: [-50, 22, 'end'] }, // Луганська
  'UA-14': { at: [6, 10], rot: 0.358, name: [52, 0, 'start'] }, // Донецька: дрібні сегменти — донизу
  'UA-12': { at: [-22, -10], rot: 0.25, name: [-52, 0, 'end'] }, // Дніпропетровська
  'UA-23': { at: [-8, 8], rot: 0.25, name: [0, 74, 'middle'] }, // Запорізька
  'UA-48': { at: [-6, -8], name: [-52, 0, 'end'] }, // Миколаївська
  'UA-65': { at: [-16, -4], name: [0, 62, 'middle'] }, // Херсонська
  'UA-51': { at: [8, 30], name: [-48, 0, 'end'] }, // Одеська
  'UA-43': { at: [6, 6], name: [-52, 0, 'end'] }, // АР Крим
}

// Підпис області на мапі: «Харківська обл.» / «Kharkiv Oblast»
const shortName = (id: string, name: string, locale: Locale, d: Dict) => {
  if (locale === 'en') return id === 'UA-43' ? 'AR Crimea' : `${REGION_NAMES_EN[id] || name} ${d.oblastSuffix}`
  return name === 'Автономна Республіка Крим' ? 'АР Крим' : name.startsWith('м.') ? name : `${name} ${d.oblastSuffix}`
}

const fmt = (n?: number | null) => (n || 0).toLocaleString('uk-UA')

const R = 30 // радіус кільця
const SW = 17 // товщина кільця
const C = 2 * Math.PI * R

export const TerritoriesSection = ({ t, d, locale }: { t: Territory; d: Dict; locale: Locale }) => {
  const regions = (t.regions || [])
    .map((row) => {
      const geo = UA_REGIONS.find((g) => g.id === row.region)
      if (!geo) return null
      const values = STATUSES.map((s) => ({ ...s, label: d[s.dictKey], value: (row[s.key as StatusKey] as number) || 0 }))
      const title = locale === 'en' ? REGION_NAMES_EN[geo.id] || geo.name : geo.name
      const total = values.reduce((a, v) => a + v.value, 0)
      const lay = LAYOUT[geo.id] || {}
      const [dx, dy] = lay.at || [0, 0]
      return {
        id: row.id,
        geo,
        title,
        values,
        total,
        x: geo.cx + dx,
        y: geo.cy + dy,
        rot: lay.rot || 0,
        name: lay.name || ([0, 60, 'middle'] as const),
      }
    })
    .filter((r): r is NonNullable<typeof r> => !!r && r.total > 0)

  const withData = new Set(regions.map((r) => r.geo.id))
  // Севастополь і Київ підсвічуємо разом з АР Крим і Київською областю
  if (withData.has('UA-43')) withData.add('UA-40')
  if (withData.has('UA-32')) withData.add('UA-30')

  const totals = Object.fromEntries(
    STATUSES.map((s) => [s.key, regions.reduce((a, r) => a + (r.values.find((v) => v.key === s.key)?.value || 0), 0)]),
  ) as Record<StatusKey, number>
  const tg = (t.communities || {}) as Partial<Record<StatusKey, number | null>>
  const combatNp = totals.possible + totals.eres + totals.active
  const combatTg = (tg.possible || 0) + (tg.eres || 0) + (tg.active || 0)
  const allNp = combatNp + totals.occupied
  const allTg = combatTg + (tg.occupied || 0)

  return (
    <section className="terr-sec" id="territories">
      <div className="wrap">
        <div className="sec-head terr-head">
          <div>
            <h2>{t.title}</h2>
            {t.subtitle && <p>{t.subtitle}</p>}
          </div>
        </div>

        <div className="terr-grid">
          <aside className="terr-panel">
            <div className="tp-total">
              <div>
                <div className="tp-num" data-target={allNp}>{fmt(allNp)}</div>
                <div className="tp-label">{d.settlements}</div>
              </div>
              <div>
                <div className="tp-num" data-target={allTg}>{fmt(allTg)}</div>
                <div className="tp-label">{d.communities}</div>
              </div>
            </div>

            <div className="tp-group">
              <div className="tp-title">
                {d.combatLead}{' '}
                <b>
                  {fmt(combatNp)} {d.np} {d.by} {fmt(combatTg)} {d.tg}
                </b>
                {d.ofThem}
              </div>
              <ul className="tp-list">
                {STATUSES.slice(0, 3).map((s) => (
                  <li key={s.key}>
                    <span className="tp-sw" style={{ background: s.color }} />
                    <span>
                      {d[s.dictKey]} — <b>{fmt(totals[s.key])} {d.np}</b> {d.by} {fmt(tg[s.key])} {d.tg}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="tp-group tp-occupied">
              <span className="tp-sw" style={{ background: STATUSES[3].color }} />
              <span>
                {d.occupiedLead} <b>{fmt(totals.occupied)} {d.np}</b> {d.by} {fmt(tg.occupied)} {d.tg}
              </span>
            </div>

            {t.source && <p className="tp-source">{t.source}</p>}

            {/* Телефон: коротко — смужка часток і чотири рядки замість довгого тексту */}
            <div className="tp-compact">
              <div className="tpc-bar" aria-hidden="true">
                {STATUSES.map((s) => (totals[s.key] ? <span key={s.key} style={{ flexGrow: totals[s.key], background: s.color }} /> : null))}
              </div>
              <ul className="tpc-list">
                {STATUSES.map((s) => (
                  <li key={s.key}>
                    <i style={{ background: s.color }} />
                    <span className="tpc-name">{d[COL_KEY[s.key]]}</span>
                    <b>
                      {fmt(totals[s.key])} {d.np}
                    </b>
                    <small>
                      {fmt(tg[s.key])} {d.tg}
                    </small>
                  </li>
                ))}
              </ul>
              {t.source && (
                <details className="tpc-source">
                  <summary>{d.dataSource}</summary>
                  <p>{t.source}</p>
                </details>
              )}
            </div>
          </aside>

          <figure className="terr-map">
            <svg viewBox={UA_MAP_VIEWBOX} role="img" aria-label={d.mapAria}>
              <g className="ua-regions">
                {UA_REGIONS.map((g) => (
                  <path
                    key={g.id}
                    d={g.d}
                    className={withData.has(g.id) ? 'has-data' : undefined}
                    data-geo={g.id === 'UA-40' ? 'UA-43' : g.id === 'UA-30' ? 'UA-32' : g.id}
                  >
                    <title>{g.name}</title>
                  </path>
                ))}
              </g>
              {regions.map((r, ri) => {
                let acc = 0
                let si = 0
                const nonZero = r.values.filter((v) => v.value > 0)
                const gap = nonZero.length > 1 ? 2.5 : 0
                return (
                  <g key={r.id} className="ua-donut" data-geo={r.geo.id}>
                    <title>
                      {`${r.title}: ${fmt(r.total)} ${d.np}\n` +
                        r.values
                          .filter((v) => v.value > 0)
                          .map((v) => `• ${v.label} — ${fmt(v.value)}`)
                          .join('\n')}
                    </title>
                    <circle cx={r.x} cy={r.y} r={R + SW / 2 + 1.5} className="donut-halo" />
                    <circle cx={r.x} cy={r.y} r={R - SW / 2} className="donut-hole" />
                    {r.values.map((v) => {
                      if (!v.value) return null
                      const len = (v.value / r.total) * C
                      const start = acc
                      acc += len
                      const dash = Math.max(len - gap, 1.2)
                      const mid = ((start + len / 2) / C + r.rot) * 2 * Math.PI - Math.PI / 2
                      const lr = R + SW / 2 + 13
                      const lx = r.x + Math.cos(mid) * lr
                      const ly = r.y + Math.sin(mid) * lr
                      return (
                        <g key={v.key}>
                          <circle
                            className="donut-seg"
                            cx={r.x}
                            cy={r.y}
                            r={R}
                            fill="none"
                            stroke={v.color}
                            strokeWidth={SW}
                            strokeDashoffset={-start}
                            transform={`rotate(${-90 + r.rot * 360} ${r.x} ${r.y})`}
                            data-circ={C.toFixed(2)}
                            data-delay={ri * 70 + si++ * 140}
                            data-dash={`${dash.toFixed(2)} ${C.toFixed(2)}`}
                            style={{ strokeDasharray: `${dash.toFixed(2)} ${C.toFixed(2)}` }}
                          />
                          <text
                            x={lx}
                            y={ly}
                            className="seg-label"
                            textAnchor={Math.abs(Math.cos(mid)) < 0.3 ? 'middle' : Math.cos(mid) > 0 ? 'start' : 'end'}
                            dominantBaseline="middle"
                          >
                            {fmt(v.value)}
                          </text>
                        </g>
                      )
                    })}
                    <text x={r.x} y={r.y} className="donut-total" textAnchor="middle" dominantBaseline="central" data-target={r.total}>
                      {fmt(r.total)}
                    </text>
                    <text
                      x={r.x + r.name[0]}
                      y={r.y + r.name[1]}
                      className="donut-name"
                      textAnchor={r.name[2]}
                      dominantBaseline="middle"
                    >
                      {shortName(r.geo.id, r.geo.name, locale, d)}
                    </text>
                  </g>
                )
              })}
            </svg>
            <figcaption>{d.mapCredit}</figcaption>
            <TerrPicker
              regions={[...regions]
                .sort((a, b) => b.total - a.total)
                .map((r) => ({ geo: r.geo.id, title: r.title, total: r.total, values: r.values.map(({ key, label, color, value }) => ({ key, label, color, value })) }))}
              labels={{ np: d.np, hint: d.mapHint, prev: d.prevRegion, next: d.nextRegion, of: d.ofTotal }}
            />
          </figure>
        </div>

        {/* На телефоні підписи на мапі задрібні — показуємо області списком */}

        <details className="terr-table">
          <summary>{d.showTable}</summary>
          <div className="tt-scroll">
            <table>
              <thead>
                <tr>
                  <th>{d.region}</th>
                  <th>{d.colPossible}</th>
                  <th>{d.colEres}</th>
                  <th>{d.colActive}</th>
                  <th>{d.colOccupied}</th>
                  <th>{d.colTotal}</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">{r.title}</th>
                    {r.values.map((v) => (
                      <td key={v.key}>{v.value ? fmt(v.value) : '—'}</td>
                    ))}
                    <td>
                      <b>{fmt(r.total)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
      <StatsAnimator sectionId="territories" version={JSON.stringify([t.regions, t.communities])} />
    </section>
  )
}
