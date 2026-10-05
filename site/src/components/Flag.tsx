'use client'
import { useEffect, useRef, useState, type MutableRefObject } from 'react'

const VS = `attribute vec2 a; void main(){ gl_Position = vec4(a,0.,1.); }`
const FS = `
  precision highp float;
  uniform vec2 R; uniform float T;
  float h(vec2 p, float t){
    float v = 0.0;
    v += 0.50*sin(p.x*2.1 + p.y*1.1 - t*1.00);
    v += 0.32*sin(p.x*3.4 - p.y*1.9 - t*1.35 + 1.7);
    v += 0.18*sin(p.x*5.8 + p.y*2.9 - t*2.00 + 0.4);
    v += 0.09*sin(p.x*8.7 - p.y*4.6 - t*2.70 + 2.3);
    v += 0.28*sin(p.y*1.6 + p.x*0.6 + t*0.45);
    return v;
  }
  void main(){
    vec2 uv = gl_FragCoord.xy / R;
    float asp = R.x / R.y;
    vec2 p = vec2(uv.x * asp, uv.y) * 1.6;
    float t = T;
    float e = 0.003;
    float h0 = h(p, t);
    float hx = (h(p + vec2(e,0.), t) - h0) / e;
    float hy = (h(p + vec2(0.,e), t) - h0) / e;
    vec3 n = normalize(vec3(-hx*0.32, -hy*0.32, 1.0));
    float border = 0.30 + 0.38*uv.x + h0*0.055 + 0.03*sin(uv.x*5.0 - t*0.8);
    float aa = 2.5 / R.y;
    float isBlue = smoothstep(border - aa, border + aa, uv.y);
    vec3 blue = vec3(0.00, 0.36, 0.72);
    vec3 yel  = vec3(1.00, 0.80, 0.00);
    vec3 base = mix(yel, blue, isBlue);
    vec3 tint = mix(vec3(1.0, 0.93, 0.55), vec3(0.45, 0.88, 1.0), isBlue);
    vec3 L = normalize(vec3(-0.45, 0.65, 0.65));
    vec3 H = normalize(L + vec3(0.,0.,1.));
    float diff = max(dot(n, L), 0.0);
    float spec = pow(max(dot(n, H), 0.0), 60.0);
    float sheen = pow(max(dot(n, H), 0.0), 9.0);
    vec3 col = base * (0.18 + 0.95*diff);
    col += tint * (spec*0.55 + sheen*0.22);
    col *= mix(vec3(0.62, 0.45, 0.10), vec3(1.0), smoothstep(-0.9, 0.6, h0) * (1.0 - isBlue) + isBlue);
    float vig = smoothstep(1.25, 0.35, length(uv - 0.5));
    col *= 0.75 + 0.25*vig;
    gl_FragColor = vec4(col, 1.0);
  }`

// Відео прапора: зациклене, без звуку, з налаштовуваною швидкістю
const FlagVideo = ({ src, rate, paused }: { src: string; rate: number; paused: boolean }) => {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    const apply = () => {
      v.playbackRate = rate
      if (paused) v.pause()
      else void v.play().catch(() => {})
    }
    apply()
    v.addEventListener('loadedmetadata', apply)
    return () => v.removeEventListener('loadedmetadata', apply)
  }, [rate, src, paused])
  return (
    <video
      id="flag"
      className="flag-video"
      ref={ref}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  )
}

type FlagProps = {
  speed?: number | null
  videoUrl?: string | null
  videoSpeed?: number | null
  labels: { pause: string; play: string }
}
const PAUSE_KEY = 'flagPaused'

// Прапор + кнопка «зупинити анімацію» (стандарт доступності WCAG 2.2.2: рух довше 5 секунд має зупинятися).
// Вибір запам’ятовується; якщо в системі ввімкнено «менше руху» — прапор одразу нерухомий.
export const Flag = ({ speed = 0.32, videoUrl, videoSpeed, labels }: FlagProps) => {
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  useEffect(() => {
    let p = matchMedia('(prefers-reduced-motion: reduce)').matches
    try {
      const saved = localStorage.getItem(PAUSE_KEY)
      if (saved !== null) p = saved === '1'
    } catch {}
    setPaused(p)
  }, [])
  pausedRef.current = paused
  const toggle = () => {
    setPaused((v) => {
      try {
        localStorage.setItem(PAUSE_KEY, v ? '0' : '1')
      } catch {}
      return !v
    })
  }
  const moving = videoUrl || Number(speed ?? 0.32) > 0
  return (
    <>
      {videoUrl ? <FlagVideo src={videoUrl} rate={Number(videoSpeed ?? 0.6)} paused={paused} /> : <FlagCanvas speed={speed} pausedRef={pausedRef} />}
      {moving && (
        <button type="button" className="flag-toggle" onClick={toggle} aria-pressed={paused} aria-label={paused ? labels.play : labels.pause} title={paused ? labels.play : labels.pause}>
          {paused ? (
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z" fill="currentColor" /></svg>
          )}
        </button>
      )}
    </>
  )
}

// Шовковий прапор, що розвівається (WebGL). speed: 0 — нерухомий
const FlagCanvas = ({ speed = 0.32, pausedRef }: { speed?: number | null; pausedRef: MutableRefObject<boolean> }) => {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const gl = cv.getContext('webgl', { antialias: false })
    if (!gl) {
      cv.style.background = 'linear-gradient(160deg,#0057b8 0 48%,#ffd500 52% 100%)'
      return
    }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const pr = gl.createProgram()!
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS))
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(pr)
    gl.useProgram(pr)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(pr, 'a')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const uR = gl.getUniformLocation(pr, 'R')
    const uT = gl.getUniformLocation(pr, 'T')

    const s = Number(speed ?? 0.32)
    // на паузі прапор застигає там, де був
    let t = 0
    let last = performance.now()
    const draw = (sec: number) => {
      gl.uniform2f(uR, cv.width, cv.height)
      gl.uniform1f(uT, sec * s + 4)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.25)
      cv.width = cv.clientWidth * dpr
      cv.height = cv.clientHeight * dpr
      gl.viewport(0, 0, cv.width, cv.height)
      draw(t)
    }
    resize()
    addEventListener('resize', resize)

    let raf = 0
    let visible = true
    const io = new IntersectionObserver((e) => (visible = e[0].isIntersecting))
    io.observe(cv)
    if (s > 0) {
      const loop = (now: number) => {
        if (!pausedRef.current) t += (now - last) / 1000
        last = now
        if (visible) draw(t)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      removeEventListener('resize', resize)
    }
  }, [speed])

  return <canvas id="flag" ref={ref} aria-hidden="true" />
}
