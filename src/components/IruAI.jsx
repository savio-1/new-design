import { useEffect, useRef, useState } from 'react'
import { Play, Pause } from './icons.jsx'

/**
 * Full-bleed AI video panel. As the panel scrolls toward the vertical center
 * of the viewport it grows from 1616px to the full container width while its
 * border-radius collapses 16px -> 0 — the exact center-weighted effect on iru.com.
 */
export default function IruAI() {
  const wrapRef = useRef(null)
  const innerRef = useRef(null)
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    const BASE = 1616
    const MIN = 320
    const wrap = wrapRef.current
    const inner = innerRef.current
    if (!wrap || !inner) return

    let raf = 0
    const compute = () => {
      raf = 0
      const rect = inner.getBoundingClientRect()
      const full = wrap.clientWidth || window.innerWidth
      const vpH = window.innerHeight || document.documentElement.clientHeight
      const elemCenter = rect.top + (rect.height || 0) / 2
      const viewportCenter = vpH / 2
      const range = Math.max(240, Math.min(vpH / 2, (rect.height || vpH) / 2))
      const progress = Math.max(0, Math.min(1, 1 - Math.abs(elemCenter - viewportCenter) / range))
      const desired = BASE + (full - BASE) * progress
      const maxW = Math.max(MIN, Math.min(full, desired))
      inner.style.maxWidth = `${Math.round(maxW)}px`
      inner.style.borderRadius = `${Math.round(16 * (1 - progress))}px`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(compute) }

    compute()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) }
  }

  return (
    <div ref={wrapRef} className="w-full">
      <div
        ref={innerRef}
        className="relative overflow-hidden flex items-center justify-center bg-terminal text-cursor min-h-screen mx-auto my-10"
        style={{ maxWidth: 1616, borderRadius: 16 }}
      >
        <div className="group absolute inset-0 flex items-center justify-center">
          <video ref={videoRef} autoPlay loop muted playsInline className="w-full h-full object-cover">
            <source src="/assets/video/iru-ai.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-terminal/30" />
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? 'Pause video' : 'Play video'}
            className="opacity-0 group-hover:opacity-100 absolute bottom-5 right-5 transition-all cursor-pointer text-white/90"
          >
            {playing ? <Pause className="size-6" /> : <Play className="size-6" />}
          </button>
        </div>

        <div className="text-center relative z-10 mx-auto px-8 py-16 md:py-32" style={{ maxWidth: 502 }}>
          <h3>Unified by design. Built for the AI era.</h3>
          <p className="mt-6 mb-0">
            Iru AI is designed from the ground up to connect a grid of agents behind the
            scenes&mdash;across identity, endpoint, and compliance. Powered by the Iru Context
            Model, it understands your users, apps, and devices to act safely, intelligently,
            and in context across your organization.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <a className="btn btn--secondary" href="https://www.iru.com/iru-ai">Explore Iru AI</a>
          </div>
        </div>
      </div>
    </div>
  )
}
