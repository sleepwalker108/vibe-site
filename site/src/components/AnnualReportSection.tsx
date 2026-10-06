import type { AnnualReport } from '@/payload-types'
import { formatDate } from '@/lib/payload'
import type { Dict } from '@/lib/dictionary'
import { StatsAnimator } from './StatsAnimator'
import { RCard } from './RCard'

// Кольори каналів ідуть строго по черзі (перевірено на розрізнення при дальтонізмі)
const CHANNEL_COLORS = ['#0057b8', '#5aa9e6', '#e0a400', '#7a8ca3']

const fmt = (n?: number | null) => (n || 0).toLocaleString('uk-UA')
const sum = (rows?: { value?: number | null }[] | null) => (rows || []).reduce((s, r) => s + (r.value || 0), 0)

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)
const PHONE = 'M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z'
const IN = 'M14 4h6v6M20 4l-7 7M10 20H4v-6'
const OUT = 'M20 14v6h-6M4 4l7 7M4 10V4h6'
const MSG = 'M4 5h16v11H8l-4 4V5Z'

export const AnnualReportSection = ({ r, t }: { r: AnnualReport; t: Dict }) => {
  const channels = (r.channels || []).slice(0, 4)
  const incoming = sum(channels)
  const outgoing = sum(r.outgoing)
  const total = incoming + outgoing + (r.line1648 || 0)
  const topMax = Math.max(1, ...(r.topQuestions || []).map((q) => q.value || 0))
  const outMax = Math.max(1, ...(r.outgoing || []).map((q) => q.value || 0))

  // Кругова діаграма: коло r=70, між сегментами — проміжок 3px кольору фону
  const R = 70
  const C = 2 * Math.PI * R
  const GAP = channels.length > 1 ? 3 : 0
  let acc = 0
  const segs = channels.map((c, i) => {
    const len = incoming ? ((c.value || 0) / incoming) * C : 0
    const seg = { ...c, color: CHANNEL_COLORS[i], len: Math.max(0, len - GAP), offset: -acc }
    acc += len
    return seg
  })

  return (
    <section className="report-sec" id="report">
      <div className="wrap">
        <div className="sec-head report-head">
          <div>
            <h2>{r.title}</h2>
            {r.subtitle && <p>{r.subtitle}</p>}
          </div>
          {r.periodFrom && r.periodTo && (
            <div className="period">
              {t.period}: {formatDate(r.periodFrom)} — {formatDate(r.periodTo)}
            </div>
          )}
        </div>

        <div className="report-kpis">
          <div className="rk rk-main">
            <div className="rk-label">{t.totalCalls}</div>
            <div className="rk-num" data-target={total}>{fmt(total)}</div>
          </div>
          <div className="rk">
            <span className="rk-ico"><Icon d={IN} /></span>
            <div className="rk-num" data-target={incoming}>{fmt(incoming)}</div>
            <div className="rk-label">{t.incoming}</div>
          </div>
          <div className="rk">
            <span className="rk-ico"><Icon d={OUT} /></span>
            <div className="rk-num" data-target={outgoing}>{fmt(outgoing)}</div>
            <div className="rk-label">{t.outgoing}</div>
          </div>
          <div className="rk">
            <span className="rk-ico"><Icon d={PHONE} /></span>
            <div className="rk-num" data-target={r.line1648 || 0}>{fmt(r.line1648)}</div>
            <div className="rk-label">{t.line1648}</div>
          </div>
        </div>

        <div className="report-grid">
          {channels.length > 0 && (
            <div className="rcard">
              <h3>{t.byChannel}</h3>
              <div className="donut-wrap">
                <svg viewBox="0 0 180 180" className="donut" role="img" aria-label={`${t.byChannel}: ${fmt(incoming)}`}>
                  <circle cx="90" cy="90" r={R} fill="none" stroke="var(--sky)" strokeWidth="22" />
                  {segs.map((s) => (
                    <circle
                      key={s.id}
                      className="donut-seg"
                      cx="90"
                      cy="90"
                      r={R}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="22"
                      strokeDashoffset={s.offset}
                      data-circ={C.toFixed(2)}
                      data-dash={`${s.len.toFixed(2)} ${C.toFixed(2)}`}
                      style={{ strokeDasharray: `${s.len.toFixed(2)} ${C.toFixed(2)}` }}
                      transform="rotate(-90 90 90)"
                    >
                      <title>{`${s.name}: ${fmt(s.value)} (${incoming ? Math.round(((s.value || 0) / incoming) * 100) : 0}%)`}</title>
                    </circle>
                  ))}
                </svg>
                <div className="donut-center">
                  <div className="dc-num" data-target={incoming}>{fmt(incoming)}</div>
                  <div className="dc-label">{t.incomingShort}</div>
                </div>
              </div>
              <ul className="legend">
                {segs.map((s) => (
                  <li key={s.id}>
                    <span className="sw" style={{ background: s.color }} />
                    <span className="lg-name">{s.name}</span>
                    <span className="lg-val">
                      {fmt(s.value)}
                      <small>{incoming ? Math.round(((s.value || 0) / incoming) * 100) : 0}%</small>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!!r.topQuestions?.length && (
            <RCard title={t.topQuestions.replace('{n}', String(r.topQuestions.length))} summary={fmt(sum(r.topQuestions))}>
              <ol className="rank">
                {r.topQuestions.map((q, i) => (
                  <li key={q.id} className="rank-item">
                    <div className="rank-row">
                      <span className="rank-n">{i + 1}</span>
                      <span className="rank-name">{q.name}</span>
                      <span className="rank-val">{fmt(q.value)}</span>
                    </div>
                    <div className="rank-track">
                      <div className="fill" data-w={(((q.value || 0) / topMax) * 100).toFixed(2)} />
                    </div>
                  </li>
                ))}
              </ol>
            </RCard>
          )}

          <div className="rcol">
            {!!r.outgoing?.length && (
              <RCard title={t.outgoing} summary={fmt(outgoing)}>
                <ul className="rank">
                  {r.outgoing.map((q) => (
                    <li key={q.id} className="rank-item">
                      <div className="rank-row">
                        <span className="rank-name">{q.name}</span>
                        <span className="rank-val">{fmt(q.value)}</span>
                      </div>
                      <div className="rank-track">
                        <div className="fill fill-yellow" data-w={(((q.value || 0) / outMax) * 100).toFixed(2)} />
                      </div>
                    </li>
                  ))}
                </ul>
              </RCard>
            )}
            {r.sms != null && (
              <div className="rcard rcard-sms">
                <span className="rk-ico"><Icon d={MSG} /></span>
                <div>
                  <div className="rk-num" data-target={r.sms}>{fmt(r.sms)}</div>
                  <div className="rk-label">{t.sms}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <StatsAnimator sectionId="report" version={JSON.stringify([channels, r.topQuestions, r.outgoing, r.line1648, r.sms])} />
    </section>
  )
}
