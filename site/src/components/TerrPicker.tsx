'use client'
import { useEffect, useRef, useState } from 'react'

export type PickerRegion = {
  geo: string
  title: string
  total: number
  values: { key: string; label: string; color: string; value: number }[]
}

const fmt = (n: number) => n.toLocaleString('uk-UA')
const MOBILE = '(max-width: 640px)'

/**
 * Телефон: мапа стає інтерактивною. Дотик до області чи кружечка → картка області під мапою
 * (кількість НП, смужка, розбивка за статусами); ‹ › — сусідні області; вибрана підсвічується на мапі.
 */
export const TerrPicker = ({
  regions,
  labels,
}: {
  regions: PickerRegion[]
  labels: { np: string; hint: string; prev: string; next: string; of: string }
}) => {
  const [idx, setIdx] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const cur = regions[idx]

  // дотики по мапі
  useEffect(() => {
    const section = box.current?.closest('.terr-sec')
    const svg = section?.querySelector('.terr-map svg')
    if (!svg) return
    const onClick = (e: Event) => {
      if (!matchMedia(MOBILE).matches) return
      const el = (e.target as Element).closest('[data-geo]')
      const geo = el?.getAttribute('data-geo')
      const i = regions.findIndex((r) => r.geo === geo)
      if (i >= 0) setIdx(i)
    }
    svg.addEventListener('click', onClick)
    return () => svg.removeEventListener('click', onClick)
  }, [regions])

  // підсвічування вибраної області на мапі
  useEffect(() => {
    const svg = box.current?.closest('.terr-sec')?.querySelector('.terr-map svg')
    if (!svg || !cur) return
    svg.classList.add('has-pick')
    svg.querySelectorAll('.is-picked').forEach((n) => n.classList.remove('is-picked'))
    svg.querySelectorAll(`[data-geo="${cur.geo}"]`).forEach((n) => n.classList.add('is-picked'))
  }, [cur])

  if (!cur) return null
  const go = (d: number) => setIdx((i) => (i + d + regions.length) % regions.length)

  return (
    <div ref={box} className="terr-pick" aria-live="polite">
      <div className="tpk-hint">{labels.hint}</div>
      <div className="tpk-card">
        <div className="tpk-head">
          <button type="button" className="tpk-nav" aria-label={labels.prev} onClick={() => go(-1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
          <div className="tpk-title">
            <strong>{cur.title}</strong>
            <span>
              {fmt(cur.total)} {labels.np} · {idx + 1} {labels.of} {regions.length}
            </span>
          </div>
          <button type="button" className="tpk-nav" aria-label={labels.next} onClick={() => go(1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>
        <div className="tpk-bar" aria-hidden="true">
          {cur.values.map((v) => (v.value ? <span key={v.key} style={{ flexGrow: v.value, background: v.color }} /> : null))}
        </div>
        <ul className="tpk-list">
          {cur.values.map((v) => (
            <li key={v.key} className={v.value ? undefined : 'is-zero'}>
              <i style={{ background: v.color }} />
              <span className="tpk-label">{v.label}</span>
              <b>{fmt(v.value)}</b>
              <small>{cur.total ? Math.round((v.value / cur.total) * 100) : 0}%</small>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
