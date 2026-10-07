import { withParams } from '@/lib/newsFilters'
import { NavLink } from './ListNav'

type SP = Record<string, string | string[] | undefined>

// Номери сторінок списку. Наступну сторінку браузер завантажує заздалегідь — «далі» відкривається миттєво.
export const Pager = ({ path, sp, page, totalPages, label }: { path: string; sp: SP; page: number; totalPages: number; label: string }) => {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
  return (
    <nav className="pager" aria-label={label}>
      {pages.map((p, i) => (
        <span key={p} className="pager-item">
          {i > 0 && p - pages[i - 1] > 1 && <span className="pager-gap" aria-hidden>…</span>}
          <NavLink
            href={withParams(path, sp, { page: p > 1 ? p : undefined })}
            className={p === page ? 'on' : undefined}
            aria-current={p === page ? 'page' : undefined}
            prefetch={p === page + 1 ? true : undefined}
            toTop
          >
            {p}
          </NavLink>
        </span>
      ))}
    </nav>
  )
}
