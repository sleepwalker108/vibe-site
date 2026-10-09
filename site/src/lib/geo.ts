import geoip from 'geoip-country'

// Країна за IP-адресою — з локальної бази (пакет geoip-country, дані GeoLite2 від MaxMind).
// Нікуди не звертаємось: адреса не залишає сервер і не зберігається, записується лише код країни (UA, PL…).
// Внутрішні адреси (Wi-Fi чи мережа установи, сам сервер) країни не мають — для них 'LAN'.
const PRIVATE = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|169\.254\.|::1$|f[cd][0-9a-f]{2}:|fe80:)/i

export const countryOf = (ip: string): string => {
  try {
    const clean = ip.replace(/^::ffff:/i, '').trim()
    if (!clean) return ''
    if (PRIVATE.test(clean)) return 'LAN'
    return geoip.lookup(clean)?.country || ''
  } catch {
    return ''
  }
}

// Часові пояси України. За IP людина з VPN, «Приватним ретрансляцієм» iCloud чи VPN в Opera виглядає
// як іноземець (Австрія, Польща…), а часовий пояс телефона/комп’ютера від цього не змінюється.
const UA_TZ = /^Europe\/(Kyiv|Kiev|Zaporozhye|Uzhgorod|Simferopol)$/

// Справжня адреса відвідувача — від nginx (X-Real-IP); X-Forwarded-For може підробити сам відвідувач
export const clientIp = (headers: Headers) =>
  headers.get('x-real-ip') || (headers.get('x-forwarded-for') || '').split(',').pop()?.trim() || ''

// Країна відвідувача: київський час на пристрої → Україна; інакше — за IP.
// Якщо до nginx запит прийшов через проксі установи (внутрішня адреса), справжня адреса — у ланцюжку
// X-Forwarded-For: беремо найближчу до нас зовнішню. Підробити її можна, але це вплине лише на країну в статистиці.
export const visitorCountry = (headers: Headers, timeZone = ''): { ip: string; byIp: string; country: string } => {
  const ip = clientIp(headers)
  let byIp = countryOf(ip)
  if (byIp === 'LAN') {
    const chain = (headers.get('x-forwarded-for') || '').split(',').map((s) => s.trim()).reverse()
    for (const a of chain) {
      const c = countryOf(a)
      if (c && c !== 'LAN') {
        byIp = c
        break
      }
    }
  }
  return { ip, byIp, country: UA_TZ.test(timeZone) ? 'UA' : byIp }
}
