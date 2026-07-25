import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Fade + slide-up reveal for a group of children as they enter the viewport.
 * Mirrors the subtle on-scroll motion used across iru.com sections.
 */
export function useRevealGroup(selector = '[data-reveal]', options = {}) {
  const scopeRef = useRef(null)

  useEffect(() => {
    const scope = scopeRef.current
    if (!scope) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const els = scope.querySelectorAll(selector)
    const ctx = gsap.context(() => {
      els.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: options.start || 'top 88%',
              toggleActions: 'play none none none',
            },
          }
        )
      })
    }, scope)

    return () => ctx.revert()
  }, [selector])

  return scopeRef
}
