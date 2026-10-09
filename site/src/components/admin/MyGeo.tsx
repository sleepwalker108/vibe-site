'use client'
import { useEffect, useState } from 'react'

const UA_TZ = /^Europe\/(Kyiv|Kiev|Zaporozhye|Uzhgorod|Simferopol)$/

// «Статистика» → під таблицею країн: як сайт бачить пристрій, з якого відкрито адмінку.
// Допомагає зрозуміти «дивні» країни: напр. адреса з Австрії (VPN), але київський час — рахується Україною.
export const MyGeo = ({ ip, byIp }: { ip: string; byIp: string }) => {
  const [tz, setTz] = useState('')
  useEffect(() => {
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || '')
    } catch {}
  }, [])
  const ukTime = UA_TZ.test(tz)
  return (
    <p className="st-mygeo">
      <b>Ваш пристрій зараз:</b> адреса {ip || 'невідома'} — {byIp}
      {tz && (
        <>
          ; часовий пояс {tz}
          {ukTime ? ' — тож відвідування рахується як Україна' : ''}
        </>
      )}
      .
    </p>
  )
}
