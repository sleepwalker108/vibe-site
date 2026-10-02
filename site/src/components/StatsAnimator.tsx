'use client'
import { useEffect } from 'react'

// Анімація блоку статистики: щоразу, коли блок з'являється на екрані,
// смуги виростають, кругова діаграма «малюється», а числа «набігають».
// Коли блок зникає — непомітно скидаємо, щоб наступного разу анімація повторилась.
//   .fill[data-w]                — смуга, ширина у %
//   .donut-seg[data-dash]        — сегмент діаграми, "довжина пробіл"
//   [data-target]                — число
export const StatsAnimator = ({ sectionId, version }: { sectionId: string; version: string }) => {
  useEffect(() => {
    const sec = document.getElementById(sectionId)
    if (!sec) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return // одразу готові цифри

    const fmt = (n: number) => n.toLocaleString('uk-UA')
    const bars = () => sec.querySelectorAll<HTMLElement>('.fill[data-w]')
    const segs = () => sec.querySelectorAll<SVGCircleElement>('.donut-seg')
    const nums = () => sec.querySelectorAll<HTMLElement>('[data-target]')
    let frames: number[] = []
    let shown = false

    const reset = () => {
      frames.forEach(cancelAnimationFrame)
      frames = []
      bars().forEach((f) => {
        f.style.transition = 'none'
        f.style.width = '0'
      })
      segs().forEach((s) => {
        s.style.transition = 'none'
        s.style.strokeDasharray = `0 ${s.dataset.circ}`
      })
      nums().forEach((el) => (el.textContent = '0'))
    }

    const run = () => {
      bars().forEach((f, i) => {
        f.style.transition = ''
        f.style.transitionDelay = `${i * 40}ms` // смуги виростають «хвилею»
        void f.offsetWidth // щоб браузер помітив скидання перед анімацією
        f.style.width = f.dataset.w + '%'
      })
      segs().forEach((s, i) => {
        s.style.transition = ''
        s.style.transitionDelay = `${s.dataset.delay ?? i * 180}ms` // data-delay — власна затримка сегмента
        void s.getBoundingClientRect()
        s.style.strokeDasharray = s.dataset.dash || ''
      })
      nums().forEach((el) => {
        const target = Number(el.dataset.target)
        const t0 = performance.now()
        const step = (now: number) => {
          // час кадру буває трохи раніший за t0 — тоді p був би від'ємним
          const p = Math.min(1, Math.max(0, (now - t0) / 1400))
          el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3))))
          if (p < 1) frames.push(requestAnimationFrame(step))
        }
        frames.push(requestAnimationFrame(step))
      })
    }

    // Запуск — коли верх блоку заходить на екран хоча б на 15% висоти вікна (працює й для дуже високих блоків)
    const enter = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !shown) {
          shown = true
          run()
        }
      },
      { rootMargin: '0px 0px -15% 0px' },
    )
    // Скидання — лише коли блок повністю зник з екрана, щоб не було видно стрибка
    const leave = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting && shown) {
        shown = false
        reset()
      }
    })

    reset()
    enter.observe(sec)
    leave.observe(sec)
    return () => {
      enter.disconnect()
      leave.disconnect()
      frames.forEach(cancelAnimationFrame)
    }
  }, [sectionId, version])
  return null
}
