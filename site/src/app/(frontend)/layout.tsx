import React from 'react'
import Script from 'next/script'
import './styles.css'
import { getLocale } from '@/lib/i18n'
import { VisitTracker } from '@/components/VisitTracker'
import { ScrollReset } from '@/components/ScrollReset'
import { getSeo, SITE_URL } from '@/lib/seo'

// Загальні дані для пошуковиків; кожна сторінка доповнює їх своїми (див. src/lib/seo.ts)
export async function generateMetadata() {
  const seo = await getSeo(await getLocale())
  return {
    metadataBase: new URL(SITE_URL),
    title: seo.siteTitle,
    description: seo.description,
    robots: seo.allowIndexing ? undefined : { index: false, follow: false },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Шрифт Manrope — зі свого сервера (public/fonts, @font-face у styles.css): без запитів до Google.
            Кирилицю й латиницю підвантажуємо заздалегідь, щоб текст одразу показувався своїм шрифтом. */}
        <link rel="preload" href="/fonts/manrope-v23-cyrillic.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/manrope-v23-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        {/* Вмикаємо збережені налаштування доступності ще до показу сторінки — без блимання.
            next/script (beforeInteractive) виконує його до «оживлення» сторінки й не викликає попереджень React */}
        <Script id="a11y-init" strategy="beforeInteractive">
          {/* тема: збережений вибір (☾/☀ у шапці) або налаштування пристрою */}
          {/* версія для людей з порушенням зору (див. A11yPanel.applyA11y): схема кольорів, інтервали, зображення, розмір тексту */}
          {`try{var a=JSON.parse(localStorage.getItem('a11y')||'{}'),d=document.documentElement,k=d.classList;if(a.c){k.add('contrast');if(a.c==='light')k.add('hc-light');if(a.c==='blue')k.add('hc-blue')}if(a.sp)k.add('a11y-spacing');if(a.img==='gray')k.add('a11y-img-gray');if(a.img==='hide')k.add('a11y-img-hide');if(a.fs){d.style.setProperty('--fs',a.fs+'px');d.style.setProperty('--fs-scale',String(a.fs/16))}var t=localStorage.getItem('nartu-theme');d.setAttribute('data-theme',t==='dark'||t==='light'?t:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'))}catch(e){}`}
        </Script>
        {children}
        <VisitTracker />
        <ScrollReset />
      </body>
    </html>
  )
}
