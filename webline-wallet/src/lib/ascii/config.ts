export type RenderMode =
  | 'characters' | 'dither' | 'mosaic' | 'pixel' | 'dots' | 'cross' | 'diamond' | 'voxel' | 'lego'
  | 'mixed' | 'lines' | 'diagonal' | 'braille' | 'disco' | 'hexdump' | 'matrix' | 'rings' | 'hearts'
  | 'stars' | 'hexagons' | 'triangles' | 'bubbles' | 'hatch' | 'contour' | 'halfblocks'

export type AnimStyle = 'wave' | 'pulse' | 'shimmer' | 'ripple' | 'flicker'
export type CharSet = 'standard' | 'blocks' | 'binary' | 'custom'
export type BlurType = 'off' | 'uniform' | 'directional' | 'tilt' | 'lens' | 'progressive'

/** x/y are viewport fractions (0..1); radius is a fraction of the shorter viewport side; intensity 0..1. */
export interface LightPoint { x: number; y: number; radius: number; intensity: number; color: string }
export interface MaskShape { type: 'rect' | 'ellipse'; x: number; y: number; w: number; h: number }
export interface MaskConfig {
  enabled: boolean
  tool: 'freehand' | 'rect' | 'ellipse'
  brushSize: number
  showOverlay: boolean
  invert: boolean
  dataUrl: string | null
  shapes: MaskShape[]
}

export interface Fx { enabled: boolean; intensity: number }
export interface CurvePoint { x: number; y: number }

export interface AsciiConfig {
  renderMode: RenderMode
  bgMode: 'original' | 'black'
  bgBlur: number
  bgOpacity: number
  cellSize: number
  coverage: number
  invert: boolean
  styleBlend: GlobalCompositeOperation
  charSet: CharSet
  customChars: string
  brightness: number
  contrast: number
  edgeEmphasis: number
  density: number
  toneCurve: CurvePoint[]
  tint: string
  tintOpacity: number
  overlayBlend: GlobalCompositeOperation
  saturation: number
  grayscale: number
  blurType: BlurType
  blurAmount: number
  blurAngle: number
  directionalBothSides: boolean
  tiltFocus: number
  tiltPosition: number
  tiltFeather: number
  lensFocus: number
  blurCenterX: number
  blurCenterY: number
  progressivePosition: number
  progressiveReverse: boolean
  pfx: {
    vignette: Fx
    scanLines: Fx
    chromatic: Fx
    bloom: Fx
    filmGrain: Fx
    glitch: Fx
    pixelate: Fx
    halftone: Fx
    filmDust: Fx
  }
  animated: boolean
  animStyle: AnimStyle
  animSpeed: Fx
  animIntensity: Fx
  lights: { enabled: boolean; points: LightPoint[] }
  mask: MaskConfig
  /** Upper bound for devicePixelRatio to keep fill-rate sane. */
  maxDpr: number
  /** Animation frame cap. */
  fps: number
}

/** Spider Man ASCII preset, transcribed from the design spec. Source of truth: do not tweak values here silently. */
export const SPIDERMAN_ASCII_CONFIG: AsciiConfig = {
  renderMode: 'lines',
  bgMode: 'original',
  bgBlur: 6,
  bgOpacity: 50,
  cellSize: 10,
  coverage: 50,
  invert: true,
  styleBlend: 'color-dodge',
  charSet: 'standard',
  customChars: '',
  brightness: 64,
  contrast: 115,
  edgeEmphasis: 72,
  density: 16,
  toneCurve: [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 0.640732312907961, y: 0.3202480397974414 },
  ],
  tint: '#8b5a2b',
  tintOpacity: 0,
  overlayBlend: 'soft-light',
  saturation: 100,
  grayscale: 0,
  blurType: 'off',
  blurAmount: 35,
  blurAngle: 0,
  directionalBothSides: false,
  tiltFocus: 35,
  tiltPosition: 50,
  tiltFeather: 15,
  lensFocus: 40,
  blurCenterX: 50,
  blurCenterY: 50,
  progressivePosition: 55,
  progressiveReverse: false,
  pfx: {
    vignette: { enabled: true, intensity: 38 },
    scanLines: { enabled: false, intensity: 40 },
    chromatic: { enabled: false, intensity: 15 },
    bloom: { enabled: false, intensity: 25 },
    filmGrain: { enabled: true, intensity: 30 },
    glitch: { enabled: true, intensity: 20 },
    pixelate: { enabled: false, intensity: 15 },
    halftone: { enabled: false, intensity: 20 },
    filmDust: { enabled: false, intensity: 20 },
  },
  animated: true,
  animStyle: 'flicker',
  animSpeed: { enabled: true, intensity: 163 },
  animIntensity: { enabled: true, intensity: 77 },
  lights: { enabled: false, points: [] },
  mask: { enabled: false, tool: 'freehand', brushSize: 30, showOverlay: false, invert: false, dataUrl: null, shapes: [] },
  maxDpr: 2,
  fps: 24,
}
