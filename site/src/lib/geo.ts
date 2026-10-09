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
