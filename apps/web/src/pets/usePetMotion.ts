import { useEffect, useRef, useState } from 'react'

// Both the banner behavior and sprite frames use the same visibility rules.
export function usePetMotion<T extends Element>(identity?: string) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(typeof IntersectionObserver === 'undefined')
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden)
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(media.matches)
    const updateVisibility = () => setVisible(!document.hidden)
    updateMotion()
    updateVisibility()
    media.addEventListener('change', updateMotion)
    document.addEventListener('visibilitychange', updateVisibility)
    return () => {
      media.removeEventListener('change', updateMotion)
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    setInView(false)
    const observer = new IntersectionObserver(entries => {
      if (entries[0]) setInView(entries[0].isIntersecting)
    }, { threshold: 0.05 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [identity])

  return { ref, reducedMotion, active: inView && visible && !reducedMotion }
}
