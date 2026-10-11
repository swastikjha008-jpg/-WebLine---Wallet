import type { AsciiConfig, CurvePoint } from './config'
import { paintEmpty, paintSource, type MakeCanvas } from './source'

const defaultMake: MakeCanvas = (w, h) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

type Img = CanvasImageSource & { width: number; height: number }

const RAMPS = { standard: ' .:-=+*#%@', blocks: ' ░▒▓█', binary: ' 01' } as const
const BG = '#050507'
const GEOMETRIC = new Set(['lines', 'dots', 'diagonal', 'cross', 'pixel', 'mosaic', 'diamond', 'hatch', 'halfblocks', 'dither', 'voxel', 'lego'])

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

function hash(n: number): number {
  n = (n ^ 61) ^ (n >>> 16)
  n = (n + (n << 3)) | 0
  n = n ^ (n >>> 4)
  n = Math.imul(n, 0x27d4eb2d)
  n = n ^ (n >>> 15)
  return (n >>> 0) / 4294967296
}

function evalCurve(points: CurvePoint[], x: number): number {
  const p = [...points].sort((a, b) => a.x - b.x)
  if (p.length === 0) return x
  const first = p[0]!
  const last = p[p.length - 1]!
  if (x <= first.x) return first.y
  if (x >= last.x) return last.y
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i]!
    const b = p[i + 1]!
    if (x >= a.x && x <= b.x) return a.y + (b.y - a.y) * ((x - a.x) / Math.max(1e-6, b.x - a.x))
  }
  return x
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return [255, 255, 255]
  const n = parseInt(m[1]!, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Per-channel blend of source `s` over backdrop `b` (both 0..1). */
function blendChannel(mode: string, b: number, s: number): number {
  switch (mode) {
    case 'multiply': return b * s
    case 'screen': return b + s - b * s
    case 'overlay': return b <= 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s)
    case 'soft-light': {
      if (s <= 0.5) return b - (1 - 2 * s) * b * (1 - b)
      const d = b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b)
      return b + (2 * s - 1) * (d - b)
    }
    default: return s
  }
}

/**
 * Canvas2D ASCII renderer. Owns all raster work; React only mounts/unmounts it.
 * Pipeline: source photo -> per-cell average colour/luminance -> brightness, contrast, saturation,
 * grayscale, tint (overlay blend) -> tone curve / invert / edges / coverage -> cell primitives on a layer
 * -> optional blur, mask -> blend over the dimmed original -> glow points -> post effects.
 */
export class AsciiEngine {
  private readonly ctx: CanvasRenderingContext2D
  private readonly layer: HTMLCanvasElement
  private readonly lctx: CanvasRenderingContext2D
  private bg: HTMLCanvasElement | null = null
  private readonly grains: HTMLCanvasElement[] = []
  private image: Img | null = null
  private scratches: (HTMLCanvasElement | undefined)[] = []
  private masked: HTMLCanvasElement | null = null
  private maskCanvas: HTMLCanvasElement | null = null
  private maskImg: HTMLImageElement | null = null
  private halftone: CanvasPattern | null = null

  private W = 0
  private H = 0
  private dpr = 1
  private cell = 10
  private cols = 0
  private rows = 0
  private dens = new Float32Array(0)
  private angle = new Float32Array(0)
  private keep = new Uint8Array(0)
  private colors: string[] = []

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly cfg: AsciiConfig,
    private readonly make: MakeCanvas = defaultMake,
  ) {
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('Canvas2D unavailable')
    this.ctx = ctx
    this.layer = make(1, 1)
    this.lctx = this.layer.getContext('2d')!
    for (let g = 0; g < 4; g++) {
      const c = make(128, 128)
      const gc = c.getContext('2d')!
      const id = gc.createImageData(128, 128)
      for (let i = 0; i < id.data.length; i += 4) {
        const v = (hash(i * 7 + g * 99991) * 255) | 0
        id.data[i] = id.data[i + 1] = id.data[i + 2] = v
        id.data[i + 3] = 255
      }
      gc.putImageData(id, 0, 0)
      this.grains.push(c)
    }
    if (cfg.mask.enabled && cfg.mask.dataUrl) {
      const m = new Image()
      m.onload = () => { this.maskImg = m; if (this.W > 0) this.rebuildMask() }
      m.src = cfg.mask.dataUrl
    }
  }

  /** `null` means "no photo": the page stays dark, nothing is drawn in its place. */
  setImage(img: Img | null): void {
    this.image = img
    if (this.W > 0) this.resize(this.W, this.H, this.dpr)
  }

  resize(cssW: number, cssH: number, devicePixelRatio: number): void {
    const cfg = this.cfg
    const W = Math.max(1, Math.ceil(cssW))
    const H = Math.max(1, Math.ceil(cssH))
    const dpr = Math.min(Math.max(1, devicePixelRatio), cfg.maxDpr)
    this.W = W
    this.H = H
    this.dpr = dpr
    this.canvas.width = Math.round(W * dpr)
    this.canvas.height = Math.round(H * dpr)
    this.layer.width = this.canvas.width
    this.layer.height = this.canvas.height
    this.halftone = null

    this.cell = Math.max(6, Math.round(cfg.cellSize * (W < 640 ? 0.8 : 1)))
    this.cols = Math.ceil(W / this.cell)
    this.rows = Math.ceil(H / this.cell)

    // 1. Draw the source at viewport resolution.
    const src = this.make(W, H)
    const sctx = src.getContext('2d', { willReadFrequently: true })!
    if (this.image) paintSource(sctx, this.image, W, H, this.make)
    else paintEmpty(sctx, W, H)
    this.buildGrid(sctx)
    this.buildBackground(src)
    this.rebuildMask()
  }

  private buildGrid(sctx: CanvasRenderingContext2D): void {
    const { cfg, cell, cols, rows, W, H } = this
    const data = sctx.getImageData(0, 0, W, H).data
    const n = cols * rows
    const lumRaw = new Float32Array(n)
    const rgb = new Float32Array(n * 3)

    const bright = ((cfg.brightness - 50) / 100) * 0.5
    const con = cfg.contrast / 100
    const sat = cfg.saturation / 100
    const gs = cfg.grayscale / 100
    const [tr, tg, tb] = hexToRgb(cfg.tint)
    const tintK = cfg.tintOpacity / 100

    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        // 2. Average colour and luminance of the cell.
        let r = 0, g = 0, b = 0, c = 0
        const x1 = Math.min(W, (cx + 1) * cell)
        const y1 = Math.min(H, (cy + 1) * cell)
        for (let y = cy * cell; y < y1; y += 2) {
          for (let x = cx * cell; x < x1; x += 2) {
            const p = (y * W + x) * 4
            r += data[p]!; g += data[p + 1]!; b += data[p + 2]!; c++
          }
        }
        const i = cy * cols + cx
        c = Math.max(1, c)
        r = r / c / 255; g = g / c / 255; b = b / c / 255
        lumRaw[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b

        // 3. Colour adjustments, in spec order: brightness, contrast, saturation, grayscale, tint + overlay blend.
        r = clamp01((r - 0.5) * con + 0.5 + bright)
        g = clamp01((g - 0.5) * con + 0.5 + bright)
        b = clamp01((b - 0.5) * con + 0.5 + bright)
        let l = 0.2126 * r + 0.7152 * g + 0.0722 * b
        r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat
        r += (l - r) * gs; g += (l - g) * gs; b += (l - b) * gs
        if (tintK > 0) {
          r += (blendChannel(cfg.overlayBlend, clamp01(r), tr / 255) - r) * tintK
          g += (blendChannel(cfg.overlayBlend, clamp01(g), tg / 255) - g) * tintK
          b += (blendChannel(cfg.overlayBlend, clamp01(b), tb / 255) - b) * tintK
        }
        r = clamp01(r); g = clamp01(g); b = clamp01(b)
        rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b
      }
    }

    // Tone: curve on the adjusted luminance, then invert.
    const tone = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const l = 0.2126 * rgb[i * 3]! + 0.7152 * rgb[i * 3 + 1]! + 0.0722 * rgb[i * 3 + 2]!
      const t = clamp01(evalCurve(cfg.toneCurve, l))
      tone[i] = cfg.invert ? 1 - t : t
    }

    // Edges (Sobel on the untouched luminance) feed density and stroke direction.
    this.angle = new Float32Array(n)
    const dens = new Float32Array(n)
    const at = (x: number, y: number) => lumRaw[Math.min(rows - 1, Math.max(0, y)) * cols + Math.min(cols - 1, Math.max(0, x))]!
    const edgeK = cfg.edgeEmphasis / 100
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)
        const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)
        const i = y * cols + x
        const mag = Math.min(1, Math.hypot(gx, gy) * 0.9)
        this.angle[i] = Math.atan2(gy, gx) + Math.PI / 2
        dens[i] = clamp01(tone[i]! * (1 - 0.35 * edgeK) + mag * edgeK * 0.9)
      }
    }
    this.dens = dens

    // Coverage: keep the densest `coverage`% of cells.
    const sorted = Float32Array.from(dens).sort()
    const th = sorted[Math.min(n - 1, Math.floor((1 - cfg.coverage / 100) * n))] ?? 0
    this.keep = new Uint8Array(n)
    for (let i = 0; i < n; i++) this.keep[i] = dens[i]! >= th && dens[i]! > 0.03 ? 1 : 0

    // Stroke colours; dark cells are lifted so colour-dodge keeps them visible while hue is preserved.
    this.colors = new Array<string>(n)
    for (let i = 0; i < n; i++) {
      let r = rgb[i * 3]! * 255, g = rgb[i * 3 + 1]! * 255, b = rgb[i * 3 + 2]! * 255
      const m = Math.max(r, g, b)
      const lift = m < 150 ? (150 - m) / 150 : 0
      r += (230 - r) * lift * 0.75
      g += (230 - g) * lift * 0.75
      b += (230 - b) * lift * 0.75
      this.colors[i] = `rgb(${r | 0},${g | 0},${b | 0})`
    }
  }

  private buildBackground(src: HTMLCanvasElement): void {
    const { W, H, cfg } = this
    const bg = this.make(W, H)
    const b = bg.getContext('2d')!
    b.fillStyle = BG
    b.fillRect(0, 0, W, H)
    if (cfg.bgMode === 'original') {
      const f = Math.max(1, cfg.bgBlur)
      const small = this.make(Math.ceil(W / f), Math.ceil(H / f))
      small.getContext('2d')!.drawImage(src, 0, 0, small.width, small.height)
      b.imageSmoothingEnabled = true
      b.imageSmoothingQuality = 'high'
      b.globalAlpha = cfg.bgOpacity / 100
      b.drawImage(small, 0, 0, W, H)
    }
    this.bg = bg
  }

  private rebuildMask(): void {
    const m = this.cfg.mask
    if (!m.enabled) { this.maskCanvas = null; return }
    const c = this.make(this.canvas.width, this.canvas.height)
    const x = c.getContext('2d')!
    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    x.fillStyle = '#fff'
    for (const s of m.shapes) {
      if (s.type === 'rect') x.fillRect(s.x * this.W, s.y * this.H, s.w * this.W, s.h * this.H)
      else {
        x.beginPath()
        x.ellipse((s.x + s.w / 2) * this.W, (s.y + s.h / 2) * this.H, (s.w * this.W) / 2, (s.h * this.H) / 2, 0, 0, Math.PI * 2)
        x.fill()
      }
    }
    if (this.maskImg) x.drawImage(this.maskImg, 0, 0, this.W, this.H)
    this.maskCanvas = c
  }

  /** Alpha multiplier for a cell. Flicker is interpolated between steps so details fade instead of popping. */
  private animAlpha(i: number, cx: number, cy: number, t: number): number {
    const cfg = this.cfg
    if (!cfg.animated) return 1
    const I = cfg.animIntensity.enabled ? cfg.animIntensity.intensity / 100 : 0.5
    const sp = cfg.animSpeed.enabled ? cfg.animSpeed.intensity / 100 : 1
    const time = t * sp
    switch (cfg.animStyle) {
      case 'flicker': {
        const tt = time * 5
        const k = Math.floor(tt)
        const f = tt - k
        const s = f * f * (3 - 2 * f)
        const h0 = hash(i * 31 + k * 977)
        const h1 = hash(i * 31 + (k + 1) * 977)
        const h = h0 + (h1 - h0) * s
        return 1 - I * h * h
      }
      case 'wave':
        return 1 - I * (0.5 - 0.5 * Math.sin(cx * 0.22 + cy * 0.12 - time * 3))
      case 'pulse':
        return 1 - I * 0.6 * (0.5 + 0.5 * Math.sin(time * 2.4 + cy * 0.05))
      case 'shimmer':
        return 1 - I * (0.5 + 0.5 * Math.sin(cx * 0.9 + time * 4) * Math.sin(cy * 0.7 - time * 3))
      case 'ripple': {
        const d = Math.hypot(cx - this.cols / 2, (cy - this.rows / 2) * 1.2)
        return 1 - I * (0.5 - 0.5 * Math.sin(d * 0.45 - time * 4))
      }
    }
  }

  /** Draws one frame. `t` is seconds. Safe to call at any rate. */
  render(t: number): void {
    const { ctx, lctx, cfg, W, H, dpr, cell, cols, rows } = this
    if (W === 0) return

    lctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    lctx.clearRect(0, 0, W, H)
    const scale = 0.5 + cfg.density / 32
    const ramp = cfg.charSet === 'custom' && cfg.customChars ? cfg.customChars : RAMPS[cfg.charSet === 'custom' ? 'standard' : cfg.charSet]
    const mode = cfg.renderMode
    if (!GEOMETRIC.has(mode)) {
      lctx.font = `${Math.round(cell * 1.15)}px ui-monospace, Menlo, Consolas, monospace`
      lctx.textAlign = 'center'
      lctx.textBaseline = 'middle'
    }
    lctx.lineCap = 'butt'

    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const i = cy * cols + cx
        if (!this.keep[i]) continue
        const d = this.dens[i]!
        const a = this.animAlpha(i, cx, cy, t)
        if (a <= 0.02) continue
        const x = cx * cell
        const y = cy * cell
        const mx = x + cell / 2
        const my = y + cell / 2
        const color = this.colors[i]!
        lctx.globalAlpha = clamp01(a * (0.35 + 0.65 * d))
        lctx.fillStyle = color
        lctx.strokeStyle = color

        switch (mode) {
          case 'lines': {
            const th = Math.max(1, cell * scale * d * 0.6)
            lctx.fillRect(x, my - th / 2, cell, th)
            break
          }
          case 'diagonal':
            lctx.lineWidth = Math.max(1, cell * 0.16 * scale * d + 0.5)
            lctx.beginPath(); lctx.moveTo(x, y + cell); lctx.lineTo(x + cell, y); lctx.stroke()
            break
          case 'cross':
            lctx.lineWidth = Math.max(1, cell * 0.12 * scale * (0.5 + d))
            lctx.beginPath(); lctx.moveTo(x + 1, my); lctx.lineTo(x + cell - 1, my); lctx.moveTo(mx, y + 1); lctx.lineTo(mx, y + cell - 1); lctx.stroke()
            break
          case 'dots':
            lctx.beginPath(); lctx.arc(mx, my, Math.max(0.6, cell * 0.5 * scale * Math.sqrt(d)), 0, Math.PI * 2); lctx.fill()
            break
          case 'pixel':
            lctx.fillRect(x, y, cell, cell)
            break
          case 'mosaic': case 'dither': case 'voxel': case 'lego':
            lctx.fillRect(x + 1, y + 1, cell - 2, cell - 2)
            break
          case 'diamond': {
            const r = cell * 0.5 * scale * (0.4 + 0.6 * d)
            lctx.beginPath(); lctx.moveTo(mx, my - r); lctx.lineTo(mx + r, my); lctx.lineTo(mx, my + r); lctx.lineTo(mx - r, my); lctx.closePath(); lctx.fill()
            break
          }
          case 'hatch': {
            lctx.lineWidth = 1
            const ang = this.angle[i]!
            const dx = Math.cos(ang) * cell * 0.5, dy = Math.sin(ang) * cell * 0.5
            lctx.beginPath(); lctx.moveTo(mx - dx, my - dy); lctx.lineTo(mx + dx, my + dy)
            if (d > 0.6) { lctx.moveTo(mx - dy, my + dx); lctx.lineTo(mx + dy, my - dx) }
            lctx.stroke()
            break
          }
          case 'halfblocks':
            if (d > 0.5) lctx.fillRect(x, y, cell, cell)
            else lctx.fillRect(x, y + cell / 2, cell, cell / 2)
            break
          default: {
            const ch = ramp[Math.min(ramp.length - 1, Math.floor(d * ramp.length))] ?? ' '
            lctx.fillText(ch, mx, my)
          }
        }
      }
    }
    lctx.globalAlpha = 1

    // Optional reveal mask: keep the layer only where the mask is painted (or only outside, if inverted).
    let layer: HTMLCanvasElement = this.layer
    if (this.maskCanvas) {
      const m = (this.masked ??= this.make(this.layer.width, this.layer.height))
      if (m.width !== this.layer.width || m.height !== this.layer.height) { m.width = this.layer.width; m.height = this.layer.height }
      const mc = m.getContext('2d')!
      mc.setTransform(1, 0, 0, 1, 0, 0)
      mc.globalCompositeOperation = 'source-over'
      mc.clearRect(0, 0, m.width, m.height)
      mc.drawImage(this.layer, 0, 0)
      mc.globalCompositeOperation = cfg.mask.invert ? 'destination-out' : 'destination-in'
      mc.drawImage(this.maskCanvas, 0, 0)
      mc.globalCompositeOperation = 'source-over'
      layer = m
    }

    // Composite: dimmed original, then the ASCII layer with the configured blend (after the optional blur).
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, H)
    if (this.bg) ctx.drawImage(this.bg, 0, 0, W, H)
    ctx.globalCompositeOperation = cfg.styleBlend
    if (cfg.blurType !== 'off') ctx.filter = `blur(${Math.max(0, cfg.blurAmount / 10)}px)`
    ctx.drawImage(layer, 0, 0, W, H)
    ctx.filter = 'none'
    ctx.globalCompositeOperation = 'source-over'

    if (cfg.lights.enabled) this.drawLights()
    this.postFx(t, layer)
  }

  private drawLights(): void {
    const { ctx, W, H, cfg } = this
    const base = Math.min(W, H)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const p of cfg.lights.points) {
      const [r, g, b] = hexToRgb(p.color)
      const cx = p.x * W, cy = p.y * H, rad = Math.max(1, p.radius * base)
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
      grad.addColorStop(0, `rgba(${r},${g},${b},${clamp01(p.intensity)})`)
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = grad
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2)
    }
    ctx.restore()
  }

  private scratch(i: 0 | 1): HTMLCanvasElement {
    const c = (this.scratches[i] ??= this.make(this.canvas.width, this.canvas.height))
    if (c.width !== this.canvas.width || c.height !== this.canvas.height) { c.width = this.canvas.width; c.height = this.canvas.height }
    return c
  }

  private copyFrame(): HTMLCanvasElement {
    const s = this.scratch(0)
    const sc = s.getContext('2d')!
    sc.setTransform(1, 0, 0, 1, 0, 0)
    sc.globalCompositeOperation = 'source-over'
    sc.clearRect(0, 0, s.width, s.height)
    sc.drawImage(this.canvas, 0, 0)
    return s
  }

  private postFx(t: number, layer: HTMLCanvasElement): void {
    const { ctx, cfg, W, H, dpr } = this
    const fx = cfg.pfx
    const cw = this.canvas.width
    const ch = this.canvas.height

    if (fx.bloom.enabled) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = (fx.bloom.intensity / 100) * 0.5
      ctx.filter = 'blur(6px)'
      ctx.drawImage(layer, 0, 0, W, H)
      ctx.restore()
    }

    if (fx.pixelate.enabled) {
      const src = this.copyFrame()
      const f = Math.max(2, Math.round(1 + (fx.pixelate.intensity / 100) * 8 * dpr))
      const sw = Math.max(1, Math.ceil(cw / f)), sh = Math.max(1, Math.ceil(ch / f))
      const tmp = this.scratch(1)
      const tc = tmp.getContext('2d')!
      tc.setTransform(1, 0, 0, 1, 0, 0)
      tc.clearRect(0, 0, tmp.width, tmp.height)
      tc.drawImage(src, 0, 0, cw, ch, 0, 0, sw, sh)
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(tmp, 0, 0, sw, sh, 0, 0, cw, ch)
      ctx.restore()
    }

    if (fx.chromatic.enabled) {
      const src = this.copyFrame()
      const off = Math.max(1, Math.round((fx.chromatic.intensity / 100) * 8 * dpr))
      const tmp = this.scratch(1)
      const tc = tmp.getContext('2d')!
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, cw, ch)
      ctx.globalCompositeOperation = 'lighter'
      const channels: [string, number][] = [['#ff0000', -off], ['#00ff00', 0], ['#0000ff', off]]
      for (const [color, dx] of channels) {
        tc.setTransform(1, 0, 0, 1, 0, 0)
        tc.globalCompositeOperation = 'source-over'
        tc.clearRect(0, 0, cw, ch)
        tc.drawImage(src, 0, 0)
        tc.globalCompositeOperation = 'multiply'
        tc.fillStyle = color
        tc.fillRect(0, 0, cw, ch)
        ctx.drawImage(tmp, dx, 0)
      }
      ctx.restore()
    }

    if (fx.halftone.enabled) {
      if (!this.halftone) {
        const s = Math.max(4, Math.round(5 * dpr))
        const tile = this.make(s, s)
        const tcx = tile.getContext('2d')!
        tcx.fillStyle = '#000'
        tcx.fillRect(0, 0, s, s)
        tcx.fillStyle = '#fff'
        tcx.beginPath(); tcx.arc(s / 2, s / 2, s * 0.36, 0, Math.PI * 2); tcx.fill()
        this.halftone = ctx.createPattern(tile, 'repeat')
      }
      if (this.halftone) {
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.globalCompositeOperation = 'multiply'
        ctx.globalAlpha = (fx.halftone.intensity / 100) * 0.8
        ctx.fillStyle = this.halftone
        ctx.fillRect(0, 0, cw, ch)
        ctx.restore()
      }
    }

    if (fx.glitch.enabled && cfg.animated) {
      // A short horizontal-slice burst about every 3.5 s, deterministic rather than random.
      const phase = t % 3.5
      if (phase < 0.14) {
        const k = fx.glitch.intensity / 100
        const step = Math.floor(t * 30)
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        for (let s = 0; s < 3; s++) {
          const sh = Math.max(4, Math.floor(ch * (0.01 + hash(step * 13 + s) * 0.04)))
          const sy = Math.floor(hash(step * 7 + s * 101) * (ch - sh))
          const dx = Math.round((hash(step * 3 + s * 17) - 0.5) * cw * 0.12 * k * 2)
          ctx.drawImage(this.canvas, 0, sy, cw, sh, dx, sy, cw, sh)
        }
        ctx.restore()
      }
    }

    if (fx.scanLines.enabled) {
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = `rgba(0,0,0,${(fx.scanLines.intensity / 100) * 0.35})`
      const step = Math.max(2, Math.round(3 * dpr))
      for (let y = 0; y < ch; y += step) ctx.fillRect(0, y, cw, Math.max(1, Math.round(dpr)))
      ctx.restore()
    }

    if (fx.filmDust.enabled) {
      ctx.save()
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      const n = Math.round(fx.filmDust.intensity / 4)
      const step = Math.floor(t * 12)
      for (let i = 0; i < n; i++) ctx.fillRect(hash(step * 5 + i) * W, hash(step * 11 + i * 3) * H, 1.2, 1.2)
      ctx.restore()
    }

    if (fx.filmGrain.enabled) {
      const tile = this.grains[Math.floor(t * 12) % this.grains.length]!
      ctx.save()
      ctx.globalCompositeOperation = 'overlay'
      ctx.globalAlpha = (fx.filmGrain.intensity / 100) * 0.22
      const ox = -hash(Math.floor(t * 12) * 3) * 128
      const oy = -hash(Math.floor(t * 12) * 5 + 1) * 128
      for (let y = oy; y < H; y += 128) for (let x = ox; x < W; x += 128) ctx.drawImage(tile, x, y)
      ctx.restore()
    }

    if (fx.vignette.enabled) {
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.55)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(1, `rgba(0,0,0,${Math.min(0.95, (fx.vignette.intensity / 100) * 1.6)})`)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    }
  }
}
