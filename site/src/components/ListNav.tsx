'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useRef, useTransition, type ComponentProps } from 'react'

// Перемикання сторінок і фільтрів у списках (новини, пошук) без перезавантаження:
//  • одразу після натискання список притьмарюється й зверху біжить смужка — видно, що сторінка вантажиться;
//  • під час перемикання сторінок список прокручується до свого початку (а не на самий верх сайту).
type Nav = { go: (href: string, toTop?: boolean) => void; pending: boolean }
const Ctx = createContext<Nav | null>(null)
export const useListNav = () => useContext(Ctx)

export const ListNav = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  const router = useRouter()
  const [pending, start] = useTransition()
  const box = useRef<HTMLDivElement>(null)
  const scrollAfter = useRef(false)

  useEffect(() => {
    if (pending || !scrollAfter.current) return
    scrollAfter.current = false
    const el = box.current
    // прокручуємо лише якщо початок списку вже прокручено за межі екрана
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [pending])

  const go = (href: string, toTop = false) => {
    scrollAfter.current = toTop
    start(() => router.push(href, { scroll: false }))
  }
  return (
    <Ctx.Provider value={{ go, pending }}>
      <div ref={box} className={className} aria-busy={pending || undefined}>
        {pending && <div className="list-progress" aria-hidden />}
        {children}
      </div>
    </Ctx.Provider>
  )
}

// Посилання всередині списку: працює через ListNav (з індикатором завантаження), а звичайним посиланням —
// якщо відкривають у новій вкладці або без JavaScript
export const NavLink = ({ href, toTop, onClick, ...rest }: ComponentProps<typeof Link> & { href: string; toTop?: boolean }) => {
  const nav = useListNav()
  return (
    <Link
      href={href}
      scroll={false}
      {...rest}
      onClick={(e) => {
        onClick?.(e)
        if (!nav || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        nav.go(href, toTop)
      }}
    />
  )
}
