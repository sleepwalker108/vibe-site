import type { Home } from '@/payload-types'

// «Подзвоніть зараз та дізнайтеся все, що вас хвилює про виїзд» — кроки евакуації (редагується в адмінці)
export const Evacuation = ({ e }: { e: NonNullable<Home['evacuation']> }) => (
  <div className="card evac" id="evacuation">
    {(e.highlight || e.title) && (
      <h3>
        {e.highlight && <span className="hl">{e.highlight}</span>}
        {e.highlight && e.title && <br />}
        {e.title}
      </h3>
    )}
    <ol className="steps">
      {e.steps?.map((s, i) => (
        <li key={s.id}>
          <div className="n">{i + 1}</div>
          <h4>{s.title}</h4>
          {s.text
            ?.split('\n')
            .filter((l) => l.trim())
            .map((l, j) => <p key={j}>{l}</p>)}
        </li>
      ))}
    </ol>
    {(e.footer || e.footerHighlight) && (
      <div className="evac-foot">
        {e.footer}
        {e.footer && e.footerHighlight && <br />}
        {e.footerHighlight && <span className="hl">{e.footerHighlight}</span>}
      </div>
    )}
  </div>
)
