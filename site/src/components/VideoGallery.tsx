'use client'
import { useEffect, useRef, useState } from 'react'

export type GalleryVideo = {
  id: string | number
  title: string
  description?: string | null
  src: string // посилання на MP4 або YouTube
  poster?: string | null
  date?: string
}

const youtubeId = (url: string) =>
  url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)?.[1] || null

// Обкладинка картки: власна → YouTube → перший кадр самого MP4
const Thumb = ({ v }: { v: GalleryVideo }) => {
  const yt = youtubeId(v.src)
  const poster = v.poster || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null)
  if (poster) return <img src={poster} alt="" loading="lazy" />
  return <video src={`${v.src}#t=1.5`} preload="metadata" muted playsInline tabIndex={-1} aria-hidden="true" />
}

type Labels = { playVideo: string; close: string }

export const VideoGallery = ({ videos, labels }: { videos: GalleryVideo[]; labels: Labels }) => {
  const [active, setActive] = useState<GalleryVideo | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (active && !d.open) d.showModal()
    if (!active && d.open) d.close()
  }, [active])

  const yt = active ? youtubeId(active.src) : null

  return (
    <>
      <div className="video-grid">
        {videos.map((v) => (
          <button
            key={v.id}
            type="button"
            className="video-card"
            onClick={() => setActive(v)}
            aria-label={`${labels.playVideo}: ${v.title}`}
          >
            <span className="video-thumb">
              <Thumb v={v} />
              <span className="video-play" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28">
                  <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
                </svg>
              </span>
            </span>
            <span className="video-body">
              {v.date && <time>{v.date}</time>}
              <span className="video-title">{v.title}</span>
              {v.description && <span className="video-desc">{v.description}</span>}
            </span>
          </button>
        ))}
      </div>

      {/* Плеєр у модальному вікні: закривається кнопкою, клавішею Esc або кліком поза відео */}
      <dialog
        ref={dialog}
        className="video-dialog"
        onClose={() => setActive(null)}
        onClick={(e) => e.target === e.currentTarget && setActive(null)}
        aria-label={active?.title}
      >
        {active && (
          <div className="video-dialog-inner">
            <div className="video-dialog-head">
              <h2>{active.title}</h2>
              <button type="button" className="video-close" onClick={() => setActive(null)} aria-label={labels.close}>
                ✕
              </button>
            </div>
            <div className="video-frame">
              {yt ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`}
                  title={active.title}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <video src={active.src} controls autoPlay playsInline poster={active.poster || undefined} />
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
