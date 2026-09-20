import GIF from 'gif.js'
import gifWorkerUrl from 'gif.js/dist/gif.worker.js?url'
import { naturalSize } from './svgUtils.ts'

// ─── Detección de duración de la animación ────────────────────────────────

export interface DetectedAnimation {
  durationMs: number
  hasAnimation: boolean
}

const DEFAULT_DURATION_MS = 2000

export function detectAnimationDuration(root: Element): DetectedAnimation {
  const nodes = Array.from(root.querySelectorAll('animate, animateTransform, animateColor, animateMotion'))
  let max = 0
  for (const node of nodes) {
    const dur = node.getAttribute('dur')
    if (!dur) continue
    max = Math.max(max, parseDurationToMs(dur))
  }
  return { durationMs: max > 0 ? max : DEFAULT_DURATION_MS, hasAnimation: nodes.length > 0 }
}

function parseDurationToMs(raw: string): number {
  const match = raw.trim().match(/^([\d.]+)\s*(ms|s|min|h)?$/i)
  if (!match) return 0
  const num = parseFloat(match[1])
  if (!Number.isFinite(num)) return 0
  switch ((match[2] ?? 's').toLowerCase()) {
    case 'ms':  return num
    case 'min': return num * 60000
    case 'h':   return num * 3600000
    default:    return num * 1000
  }
}

// ─── Exportación a GIF ──────────────────────────────────────────────────────

export interface GifExportOptions {
  durationMs: number
  fps: number
  scale: number
  onProgress?: (ratio: number) => void
}

export async function exportAnimatedSVGAsGIF(root: Element, options: GifExportOptions): Promise<Blob> {
  const { durationMs, fps, scale, onProgress } = options
  const { w, h } = naturalSize(root)
  const width  = Math.max(1, Math.round(w * scale))
  const height = Math.max(1, Math.round(h * scale))

  const liveHost = document.createElement('div')
  liveHost.style.position = 'fixed'
  liveHost.style.left = '-99999px'
  liveHost.style.top = '0'
  liveHost.style.width = `${w}px`
  liveHost.style.height = `${h}px`
  liveHost.setAttribute('aria-hidden', 'true')

  const liveClone = document.importNode(root, true) as SVGSVGElement
  liveClone.setAttribute('width', String(w))
  liveClone.setAttribute('height', String(h))
  liveHost.appendChild(liveClone)
  document.body.appendChild(liveHost)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  try {
    if (!ctx) throw new Error('No se pudo crear el contexto 2D del canvas.')

    liveClone.pauseAnimations()

    const frameCount   = Math.max(1, Math.round((durationMs / 1000) * fps))
    const frameDelayMs = Math.max(20, Math.round(1000 / fps))

    const gif = new GIF({
      workers: Math.min(4, navigator.hardwareConcurrency || 2),
      quality: 8,
      width,
      height,
      workerScript: gifWorkerUrl,
      background: '#ffffff',
      repeat: 0,
    })

    for (let i = 0; i < frameCount; i++) {
      const t = (i / frameCount) * (durationMs / 1000)
      liveClone.setCurrentTime(t)
      await waitAnimationFrame()

      const bakedFrame = bakeAnimatedFrame(liveClone)
      const xml = new XMLSerializer().serializeToString(bakedFrame)
      const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
      const img = await loadImage(svgUrl)

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      gif.addFrame(ctx, { copy: true, delay: frameDelayMs })

      onProgress?.(((i + 1) / frameCount) * 0.6)
    }

    return await new Promise<Blob>((resolve, reject) => {
      gif.on('progress', (p) => onProgress?.(0.6 + p * 0.4))
      gif.on('finished', (blob) => resolve(blob))
      gif.on('abort', () => reject(new Error('La exportación fue abortada.')))
      gif.render()
    })
  } finally {
    document.body.removeChild(liveHost)
  }
}

// ─── "Horneado" de un frame ─────────────────────────────────────────────────
// Las animaciones SMIL (<animate>, <animateTransform>, ...) no modifican los
// atributos del DOM: solo afectan el valor "animado" usado al renderizar.
// XMLSerializer solo puede volcar atributos del DOM, así que antes de
// serializar cada frame copiamos el valor animado actual (leído del clon
// "vivo", con el reloj de animación detenido en el instante t) como atributo
// estático de un segundo clon, que es el que efectivamente se serializa.

const LENGTH_ANIM_PROPS = new Set([
  'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2',
])

function bakeAnimatedFrame(liveRoot: Element): Element {
  const liveAll = Array.from(liveRoot.querySelectorAll('*'))
  const bakeClone = document.importNode(liveRoot, true) as Element
  const bakeAll = Array.from(bakeClone.querySelectorAll('*'))

  const indexOf = new Map<Element, number>()
  liveAll.forEach((el, i) => indexOf.set(el, i))

  const animEls = liveAll.filter(el =>
    el.tagName === 'animate' || el.tagName === 'animateTransform' || el.tagName === 'animateColor')

  for (const animEl of animEls) {
    const target = animEl.parentElement
    const attr   = animEl.getAttribute('attributeName')
    if (!target || !attr) continue
    const idx = indexOf.get(target)
    if (idx === undefined) continue
    const bakeTarget = bakeAll[idx]
    if (!bakeTarget) continue

    try {
      if (animEl.tagName === 'animateTransform' || attr === 'transform') {
        const matrixStr = readAnimatedTransform(target as unknown as SVGGraphicsElement)
        if (matrixStr) bakeTarget.setAttribute('transform', matrixStr)
      } else if (LENGTH_ANIM_PROPS.has(attr)) {
        const animatedLength = (target as unknown as Record<string, SVGAnimatedLength>)[attr]?.animVal
        if (animatedLength) bakeTarget.setAttribute(attr, String(animatedLength.value))
      } else {
        const computed = getComputedStyle(target).getPropertyValue(attr)
        if (computed) {
          const existingStyle = bakeTarget.getAttribute('style') ?? ''
          bakeTarget.setAttribute('style', `${existingStyle};${attr}:${computed.trim()}`)
        }
      }
    } catch {
      // Si no se puede leer el valor animado, el frame conserva el valor base.
    }
  }

  bakeClone.querySelectorAll('animate, animateTransform, animateColor').forEach(el => el.remove())
  return bakeClone
}

function readAnimatedTransform(target: SVGGraphicsElement): string | null {
  const list = target.transform?.animVal
  if (!list || list.numberOfItems === 0) return null
  let matrix = new DOMMatrix()
  for (let i = 0; i < list.numberOfItems; i++) {
    const m = list.getItem(i).matrix
    matrix = matrix.multiply(new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f]))
  }
  return `matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},${matrix.e},${matrix.f})`
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function waitAnimationFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo renderizar un frame de la animación.'))
    img.src = src
  })
}
