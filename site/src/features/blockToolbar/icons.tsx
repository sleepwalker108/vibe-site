// Іконки панелі блоку (у стилі WordPress)
const I = ({ children, size = 24 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)
const T = ({ t }: { t: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <text x="12" y="16.5" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="currentColor" fontFamily="system-ui, sans-serif">
      {t}
    </text>
  </svg>
)

export const Icons = {
  paragraph: () => (
    <I>
      <path d="M13 5v14M17 5v14M18 5h-8a4 4 0 0 0 0 8h3" />
    </I>
  ),
  h2: () => <T t="H2" />,
  h3: () => <T t="H3" />,
  h4: () => <T t="H4" />,
  heading: () => <T t="H" />,
  ul: () => (
    <I>
      <circle cx="5.5" cy="7" r="1" fill="currentColor" />
      <circle cx="5.5" cy="12" r="1" fill="currentColor" />
      <circle cx="5.5" cy="17" r="1" fill="currentColor" />
      <path d="M9.5 7H19M9.5 12H19M9.5 17H19" />
    </I>
  ),
  ol: () => (
    <I>
      <path d="M9.5 7H19M9.5 12H19M9.5 17H19" />
      <path d="M4.5 5.5 5.5 5v4M4.5 14.5c0-.8 2-.9 2 0 0 .7-2 1.6-2 2.5h2" strokeWidth="1.2" />
    </I>
  ),
  quote: () => (
    <I>
      <path d="M7 17c-1.7 0-2.5-1.3-2.5-3 0-3 2-5.5 4.5-6.5M15 17c-1.7 0-2.5-1.3-2.5-3 0-3 2-5.5 4.5-6.5" />
      <circle cx="7" cy="14.5" r="2.2" />
      <circle cx="15" cy="14.5" r="2.2" />
    </I>
  ),
  image: () => (
    <I>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m20 16-4.5-4.5L7 19" />
    </I>
  ),
  table: () => (
    <I>
      <rect x="4" y="5" width="16" height="14" rx="1.5" />
      <path d="M4 10h16M4 14.5h16M10 5v14" />
    </I>
  ),
  block: () => (
    <I>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </I>
  ),
  line: () => (
    <I>
      <path d="M4 12h16" />
    </I>
  ),
  up: () => (
    <I size={18}>
      <path d="m7 14 5-5 5 5" />
    </I>
  ),
  down: () => (
    <I size={18}>
      <path d="m7 10 5 5 5-5" />
    </I>
  ),
  caret: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  left: () => (
    <I>
      <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />
    </I>
  ),
  center: () => (
    <I>
      <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />
    </I>
  ),
  right: () => (
    <I>
      <path d="M4 6h16M10 10h10M4 14h16M10 18h10" />
    </I>
  ),
  justify: () => (
    <I>
      <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </I>
  ),
  bold: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <text x="12" y="17" textAnchor="middle" fontSize="16" fontWeight="800" fill="currentColor" fontFamily="system-ui, sans-serif">
        B
      </text>
    </svg>
  ),
  italic: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <text x="12" y="17" textAnchor="middle" fontSize="16" fontStyle="italic" fontWeight="600" fill="currentColor" fontFamily="Georgia, serif">
        I
      </text>
    </svg>
  ),
  link: () => (
    <I>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </I>
  ),
  unlink: () => (
    <I>
      <path d="M15.5 13.5 18.7 10.3a4 4 0 0 0-5.7-5.7L10.5 7M8.5 10.5 5.3 13.7a4 4 0 0 0 5.7 5.7l2.5-2.5M4 4l16 16" />
    </I>
  ),
  underline: () => (
    <I>
      <path d="M7 5v6a5 5 0 0 0 10 0V5M6 20h12" />
    </I>
  ),
  strike: () => (
    <I>
      <path d="M4 12h16M16.5 7.5C16 6 14.3 5 12 5 9.5 5 7.5 6.3 7.5 8.3c0 1.4.9 2.3 2.4 2.9M8 16.5c.6 1.6 2.3 2.5 4.3 2.5 2.6 0 4.5-1.3 4.5-3.3 0-.6-.1-1.1-.4-1.5" />
    </I>
  ),
  clear: () => (
    <I>
      <path d="M6 5h12M12 5l-3 14M15 13l5 5M20 13l-5 5" />
    </I>
  ),
  more: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5.5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="18.5" r="1.6" />
    </svg>
  ),
  copy: () => (
    <I>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </I>
  ),
  before: () => (
    <I>
      <path d="M12 4v6M9 7h6M5 14h14M5 19h14" />
    </I>
  ),
  after: () => (
    <I>
      <path d="M5 5h14M5 10h14M12 14v6M9 17h6" />
    </I>
  ),
  trash: () => (
    <I>
      <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10.5 11v5M13.5 11v5" />
    </I>
  ),
  page: () => (
    <I>
      <path d="M7 4h7l4 4v12H7z" />
      <path d="M14 4v4h4M10 12h5M10 15.5h5" />
    </I>
  ),
  edit: () => (
    <I>
      <path d="M5 19h4L19 9l-4-4L5 15z" />
      <path d="m13.5 6.5 4 4" />
    </I>
  ),
  check: () => (
    <I size={18}>
      <path d="m5 12 4.5 4.5L19 7" />
    </I>
  ),
}
