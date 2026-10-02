// Кнопка в лівому меню адмінки: відкриває сайт у новій вкладці
export const ViewSiteLink = () => (
  <a
    href="/"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      margin: '16px 0 4px',
      padding: '10px 14px',
      borderRadius: 8,
      background: '#ffd500',
      color: '#0a2440',
      fontWeight: 700,
      textDecoration: 'none',
    }}
  >
    Відкрити сайт ↗
  </a>
)
