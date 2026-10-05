import type { Payload } from 'payload'
import { getSummary } from '@/lib/visitStats'
import { STATS_CSS } from './statsStyles'

const fmt = (n: number) => n.toLocaleString('uk-UA')

// Коротка статистика вгорі головної сторінки адмінки
export const StatsSummary = async ({ payload }: { payload: Payload }) => {
  const s = await getSummary(payload)
  return (
    <div className="st-summary">
      <style>{STATS_CSS}</style>
      <h3>Відвідування</h3>
      <div className="st-s">
        <b>
          <span className={`st-live${s.online ? ' on' : ''}`} /> {fmt(s.online)}
        </b>
        <span>зараз на сайті</span>
      </div>
      <div className="st-s">
        <b>{fmt(s.today.visitors)}</b>
        <span>відвідувачів сьогодні</span>
      </div>
      <div className="st-s">
        <b>{fmt(s.week.visitors)}</b>
        <span>за 7 днів</span>
      </div>
      <div className="st-s">
        <b>{fmt(s.week.views)}</b>
        <span>переглядів за 7 днів</span>
      </div>
      <a className="st-more" href="/admin/stats">
        Детальна статистика →
      </a>
    </div>
  )
}
