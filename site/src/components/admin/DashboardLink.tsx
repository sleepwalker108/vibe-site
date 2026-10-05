'use client'
import { usePathname } from 'next/navigation'

// Звичайний пункт лівого меню адмінки (такий самий вигляд, як «Новини», «Сторінки»…), з позначкою активного
export const NavItem = ({ href, label, style }: { href: string; label: string; style?: React.CSSProperties }) => {
  const active = usePathname() === href
  return (
    <a className="nav__link" href={href} aria-current={active ? 'page' : undefined} style={style}>
      {active && <div className="nav__link-indicator" />}
      <span className="nav__link-label">{label}</span>
    </a>
  )
}

// «Головне меню» — одразу під жовтою кнопкою «Відкрити сайт»: повертає на головну сторінку адмінки
export const DashboardLink = () => <NavItem href="/admin" label="Головне меню" style={{ fontWeight: 600, margin: '8px 0 12px' }} />
