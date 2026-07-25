import { useEffect, useRef } from 'react'
import lottie from 'lottie-web'

/**
 * Renders the homepage hero Lottie animation (Panel_Animation_Final_v1.json),
 * autoplaying on first intersection — the exact behaviour on iru.com.
 */
export default function HeroLottie({ className = '', ariaLabel }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: true,
      autoplay: false,
      path: '/assets/video/panel-animation.json',
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) anim.play()
          else anim.pause()
        })
      },
      { threshold: 0.1 }
    )
    observer.observe(container)

    return () => {
      observer.disconnect()
      anim.destroy()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={className}
      role="img"
      aria-label={ariaLabel}
    />
  )
}
