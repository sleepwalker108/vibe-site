import React from 'react'
import './styles.css'
import { getLocale } from '@/lib/i18n'

export async function generateMetadata() {
  const locale = await getLocale()
  return locale === 'en'
    ? {
        title: 'National Agency for Territorial Development of Ukraine',
        description: 'State non-profit company “National Agency for Territorial Development of Ukraine”. Hotlines 1548 and 1648.',
      }
    : {
        title: 'Національна агенція розвитку територій України',
        description:
          'Державне некомерційне товариство «Національна агенція розвитку територій України». Гарячі лінії 1548 та 1648.',
      }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Вмикаємо збережені налаштування доступності ще до показу сторінки — без блимання */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var a=JSON.parse(localStorage.getItem('a11y')||'{}'),d=document.documentElement;if(a.c)d.classList.add('contrast');if(a.fs){d.style.setProperty('--fs',a.fs+'px');d.style.setProperty('--fs-scale',String(a.fs/16))}}catch(e){}`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
