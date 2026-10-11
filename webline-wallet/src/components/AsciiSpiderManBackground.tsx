import { useEffect, useRef } from 'react'
import { AsciiEngine } from '../lib/ascii/engine'
import { SPIDERMAN_ASCII_CONFIG } from '../lib/ascii/config'
import { loadSourceImage, SOURCE_URL } from '../lib/ascii/source'

/**
 * Fullscreen fixed Canvas2D background. All rendering lives in AsciiEngine; this component only
 * owns the canvas element and lifecycle (resize, visibility, reduced motion), so animation never
 * triggers React re-renders.
 */
export function AsciiSpiderManBackground({ imageUrl = SOURCE_URL }: { imageUrl?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    let engine: AsciiEngine
    try {
      engine = new AsciiEngine(canvas, SPIDERMAN_ASCII_CONFIG)
    } catch {
      return // Canvas2D unavailable: the CSS fallback behind the canvas stays visible.
    }

    const cfg = SPIDERMAN_ASCII_CONFIG
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    let resizeTimer = 0
    let last = 0
    let disposed = false
    const start = performance.now()
    const frameMs = 1000 / cfg.fps

    const size = () => {
      const w = window.visualViewport?.width ?? window.innerWidth
      const h = window.innerHeight
      engine.resize(w, h, window.devicePixelRatio || 1)
      engine.render((performance.now() - start) / 1000)
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (now - last < frameMs) return
      last = now
      engine.render((now - start) / 1000)
    }
    const run = () => {
      cancelAnimationFrame(raf)
      if (!disposed && cfg.animated && !reduced.matches && !document.hidden) raf = requestAnimationFrame(tick)
    }

    size()
    run()

    // The effect renders only from the local photo. Without it the page stays dark.
    void loadSourceImage(imageUrl).then((img) => {
      if (disposed) return
      if (!img) {
        if (import.meta.env.DEV) console.warn(`[ascii] ${imageUrl} was not found or is not a valid image. Add a close-up Spider-Man face photo to public/spiderman.jpg.`)
        return
      }
      engine.setImage(img)
      engine.render((performance.now() - start) / 1000)
    })

    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(size, 120)
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(canvas)
    window.addEventListener('orientationchange', onResize)
    document.addEventListener('visibilitychange', run)
    reduced.addEventListener('change', run)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      window.clearTimeout(resizeTimer)
      ro.disconnect()
      window.removeEventListener('orientationchange', onResize)
      document.removeEventListener('visibilitychange', run)
      reduced.removeEventListener('change', run)
    }
  }, [imageUrl])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-[100dvh] w-screen overflow-hidden bg-[#050507]">
      <canvas ref={ref} className="pointer-events-none block h-full w-full" />
    </div>
  )
}
