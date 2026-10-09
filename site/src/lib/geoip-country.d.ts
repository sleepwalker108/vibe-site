// пакет geoip-country не має власних описів типів — описуємо те, чим користуємось
declare module 'geoip-country' {
  const geoip: { lookup(ip: string): { country: string } | null }
  export default geoip
}
