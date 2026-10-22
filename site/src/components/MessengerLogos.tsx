// Логотипи месенджерів (блок «Через месенджери» в статистиці): квадратні значки із заокругленими кутами у фірмових кольорах.
// Назва — у підказці при наведенні й прихованим текстом для програм екранного доступу.

// трубка (однакова у WhatsApp і Viber), координати 0–24
const HANDSET =
  'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z'

const LOGOS = [
  {
    key: 'tg',
    name: 'Telegram',
    icon: (
      <>
        <defs>
          <linearGradient id="msgr-tg-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#37aee2" />
            <stop offset="1" stopColor="#1e93d2" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#msgr-tg-bg)" />
        <g strokeLinejoin="round" strokeWidth="1.5">
          <path d="M34.2 54 64.5 36 41.8 58.2 40.5 71.5z" fill="#c8daea" stroke="#c8daea" />
          <path d="M41.8 58.2 40.5 71.5 48.2 64.5z" fill="#a9c9dd" stroke="#a9c9dd" />
          <path d="M21 48 74.5 28.5 34.2 54z" fill="#fff" stroke="#fff" />
          <path d="M74.5 28.5 64.2 72.2 41.8 58.2z" fill="#fff" stroke="#fff" />
        </g>
      </>
    ),
  },
  {
    key: 'wa',
    name: 'WhatsApp',
    icon: (
      <>
        <rect width="100" height="100" fill="#00bd37" />
        <path d="M22.5 77.5 27.7 62.9A25.8 25.8 0 1 1 39.1 73.4z" fill="none" stroke="#fff" strokeWidth="4.6" strokeLinejoin="round" />
        <path d={HANDSET} fill="#fff" transform="translate(37.4 37.4) scale(1.05)" />
      </>
    ),
  },
  {
    key: 'vb',
    name: 'Viber',
    icon: (
      <>
        <rect width="100" height="100" fill="#7b3dae" />
        <path
          d="M50 18C30 18 21 24 21 44c0 14 4 21 13 25v15l11-13h5c20 0 29-7 29-27S70 18 50 18z"
          fill="none"
          stroke="#fff"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d={HANDSET} fill="#fff" transform="translate(28.5 26.5) scale(1.6)" />
        <g fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round">
          <path d="M51 29a15 15 0 0 1 15 15" />
          <path d="M51 34.5a9.5 9.5 0 0 1 9.5 9.5" />
          <path d="M51 40a4 4 0 0 1 4 4" />
        </g>
      </>
    ),
  },
]

export const MessengerLogos = ({ label }: { label?: string }) => (
  <ul className="msgr" aria-label={label}>
    {LOGOS.map((m) => (
      <li key={m.key} className="msgr-ico" title={m.name}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          {m.icon}
        </svg>
        <span className="sr-only">{m.name}</span>
      </li>
    ))}
  </ul>
)
