// Логотипи месенджерів (блок «Через месенджери» в статистиці): квадратні значки із заокругленими кутами у фірмових кольорах.
// Назва — у підказці при наведенні й прихованим текстом для програм екранного доступу.
import type { Messenger } from './Linkify'

// трубка Viber, координати 0–24
const HANDSET =
  'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z'

// знак WhatsApp (трубка в «бульбашці»), координати 0–24
const WHATSAPP =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'

const LOGOS = [
  {
    key: 'tg',
    name: 'Telegram' as Messenger,
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
    name: 'WhatsApp' as Messenger,
    icon: (
      <>
        <rect width="100" height="100" fill="#00bd37" />
        <path d={WHATSAPP} fill="#fff" transform="translate(21.5 21.5) scale(2.4)" />
      </>
    ),
  },
  {
    key: 'vb',
    name: 'Viber' as Messenger,
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

// links — посилання з контактів у підвалі (messengerLinks); значок без посилання показується просто картинкою
export const MessengerLogos = ({ label, links = {} }: { label?: string; links?: Partial<Record<Messenger, string>> }) => (
  <ul className="msgr" aria-label={label}>
    {LOGOS.map((m) => {
      const href = links[m.name]
      const body = (
        <>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            {m.icon}
          </svg>
          <span className="sr-only">{m.name}</span>
        </>
      )
      return (
        <li key={m.key} className="msgr-ico" title={m.name}>
          {href ? (
            <a href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              {body}
            </a>
          ) : (
            body
          )}
        </li>
      )
    })}
  </ul>
)
