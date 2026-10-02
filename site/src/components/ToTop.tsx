'use client'

// Кнопка «Нагору» в підвалі: плавно прокручує на початок сторінки
export const ToTop = ({ label }: { label: string }) => (
  <button
    type="button"
    className="to-top"
    onClick={() => {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    }}
  >
    {label}
  </button>
)
