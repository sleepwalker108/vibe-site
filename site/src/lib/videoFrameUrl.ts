// Адреса кадру-картинки для відео з медіатеки (/api/media/file/… → /api/media-frame/…); для інших адрес — null.
// Окремий файл без серверних залежностей — його використовують і компоненти в браузері.
export const videoFrameUrl = (url?: string | null) => {
  const m = String(url || '').match(/\/api\/media\/file\/([^?#]+)/)
  return m ? `/api/media-frame/${m[1]}` : null
}
