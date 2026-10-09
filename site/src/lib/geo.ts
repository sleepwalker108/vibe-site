import geoip from 'geoip-country'

// Країна за IP-адресою — з локальної бази (пакет geoip-country, дані GeoLite2 від MaxMind).
// Нікуди не звертаємось: адреса не залишає сервер і не зберігається, записується лише код країни (UA, PL…).
// Внутрішні адреси (локальна мережа, сам сервер) країни не мають — повертаємо ''.
export const countryOf = (ip: string): string => {
  try {
    const clean = ip.replace(/^::ffff:/, '').trim()
    if (!clean) return ''
    return geoip.lookup(clean)?.country || ''
  } catch {
    return ''
  }
}
