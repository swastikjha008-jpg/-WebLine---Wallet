/**
 * Source image for the ASCII pipeline.
 *
 * The effect renders ONLY from a local photo at /public/spiderman.jpg (a close-up of the masked face).
 * There is deliberately no built-in artwork: if the file is missing the page stays dark and a
 * warning is logged in development.
 */

export const SOURCE_URL = '/spiderman.jpg'

/** Framing of the subject inside the source photo and inside the viewport. */
export const SUBJECT_FRAMING = {
  /** Centre of the face inside the photo, as fractions of its width/height. */
  centerX: 0.5,
  centerY: 0.5,
  /**
   * How far past "contain" the photo may be zoomed to fill the viewport.
   * 1 = never crop (always the whole photo), large = full cover. Keeps the eyes from being cropped away.
   */
  maxZoom: 1.35,
  /** Vertical anchor of the face centre in the viewport (portrait leaves room for the wallet card). */
  anchorYLandscape: 0.5,
  anchorYPortrait: 0.42,
  /** Fade (fraction of the photo size) applied only to photo edges that sit inside the viewport. */
  feather: 0.06,
} as const

export type MakeCanvas = (w: number, h: number) => HTMLCanvasElement

export function loadSourceImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img.naturalWidth > 0 ? img : null)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export const BACKDROP = '#050507'

/** Aspect-preserving, subject-aware placement. Never stretches; never leaves gaps along an axis it overfills. */
export function paintSource(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  w: number,
  h: number,
  make: MakeCanvas,
): void {
  const F = SUBJECT_FRAMING
  ctx.fillStyle = BACKDROP
  ctx.fillRect(0, 0, w, h)

  const iw = (img as HTMLImageElement).naturalWidth || img.width
  const ih = (img as HTMLImageElement).naturalHeight || img.height
  const cover = Math.max(w / iw, h / ih)
  const contain = Math.min(w / iw, h / ih)
  const s = Math.min(cover, contain * F.maxZoom)
  const dw = iw * s
  const dh = ih * s
  const anchorY = h > w ? F.anchorYPortrait : F.anchorYLandscape

  let dx = w / 2 - F.centerX * dw
  let dy = h * anchorY - F.centerY * dh
  if (dw >= w) dx = clamp(dx, w - dw, 0)
  if (dh >= h) dy = clamp(dy, h - dh, 0)

  // Feather only the photo edges that are visible inside the viewport, so there is no hard seam.
  const fx = dw * F.feather
  const fy = dh * F.feather
  const left = dx > 0.5, right = dx + dw < w - 0.5, top = dy > 0.5, bottom = dy + dh < h - 0.5
  if (!(left || right || top || bottom)) {
    ctx.drawImage(img, dx, dy, dw, dh)
    return
  }
  const tw = Math.max(1, Math.round(dw)), th = Math.max(1, Math.round(dh))
  const tmp = make(tw, th)
  const t = tmp.getContext('2d')!
  t.drawImage(img, 0, 0, tw, th)
  t.globalCompositeOperation = 'destination-in'
  const hg = t.createLinearGradient(0, 0, tw, 0)
  hg.addColorStop(0, left ? 'rgba(0,0,0,0)' : '#000')
  hg.addColorStop(Math.min(0.49, left ? fx / tw : 0), '#000')
  hg.addColorStop(Math.max(0.51, right ? 1 - fx / tw : 1), '#000')
  hg.addColorStop(1, right ? 'rgba(0,0,0,0)' : '#000')
  t.fillStyle = hg
  t.fillRect(0, 0, tw, th)
  const vg = t.createLinearGradient(0, 0, 0, th)
  vg.addColorStop(0, top ? 'rgba(0,0,0,0)' : '#000')
  vg.addColorStop(Math.min(0.49, top ? fy / th : 0), '#000')
  vg.addColorStop(Math.max(0.51, bottom ? 1 - fy / th : 1), '#000')
  vg.addColorStop(1, bottom ? 'rgba(0,0,0,0)' : '#000')
  t.fillStyle = vg
  t.fillRect(0, 0, tw, th)
  ctx.drawImage(tmp, dx, dy, dw, dh)
}

/** No photo available: a plain dark field. Nothing is drawn in the character's place. */
export function paintEmpty(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = BACKDROP
  ctx.fillRect(0, 0, w, h)
}
