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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Вмикаємо збережені налаштування доступності ще до показу сторінки — без блимання.
            next/script (beforeInteractive) виконує його до «оживлення» сторінки й не викликає попереджень React */}
        <Script id="a11y-init" strategy="beforeInteractive">
          {`try{var a=JSON.parse(localStorage.getItem('a11y')||'{}'),d=document.documentElement;if(a.c)d.classList.add('contrast');if(a.fs){d.style.setProperty('--fs',a.fs+'px');d.style.setProperty('--fs-scale',String(a.fs/16))}}catch(e){}`}
        </Script>
        {children}
        <VisitTracker />
        <ScrollReset />
      </body>
    </html>
  )
}
