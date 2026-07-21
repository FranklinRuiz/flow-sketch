export const SVG_NS = 'http://www.w3.org/2000/svg'

export const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#e3ab49"></path>
    </marker>
  </defs>
  <rect x="20" y="70" width="110" height="60" rx="8" fill="#1e1d29" stroke="#5cb8a4" stroke-width="2"></rect>
  <text x="75" y="105" fill="#1a1a1a" font-family="monospace" font-size="14" text-anchor="middle" fill-opacity="0">Origen</text>
  <text x="75" y="105" fill="#e8e7f1" font-family="monospace" font-size="14" text-anchor="middle">Origen</text>
  <rect x="270" y="70" width="110" height="60" rx="8" fill="#1e1d29" stroke="#5cb8a4" stroke-width="2"></rect>
  <text x="325" y="105" fill="#e8e7f1" font-family="monospace" font-size="14" text-anchor="middle">Destino</text>
  <path id="demoArrow" d="M130 100 L265 100" stroke="#e3ab49" stroke-width="2.5" fill="none" stroke-dasharray="6 6" marker-end="url(#arrowhead)"></path>
</svg>`

export type ParseResult =
  | { ok: true;  root: Element }
  | { ok: false; error: string }

export interface NaturalSize {
  w: number
  h: number
}

export function parseSVGString(text: string): ParseResult {
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  } catch {
    return { ok: false, error: 'No se pudo interpretar el archivo como XML.' }
  }
  if (doc.querySelector('parsererror')) {
    return { ok: false, error: 'El archivo no es un SVG/XML válido.' }
  }
  const root = doc.documentElement
  if (root?.nodeName.toLowerCase() !== 'svg') {
    return { ok: false, error: 'El archivo no tiene un elemento <svg> raíz.' }
  }
  return { ok: true, root }
}

export function serializeSVG(node: Node): string {
  return new XMLSerializer().serializeToString(node)
}

export function naturalSize(svg: Element): NaturalSize {
  const vb = svg.getAttribute('viewBox')
  if (vb) {
    const parts = vb.trim().split(/[\s,]+/).map(Number)
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { w: parts[2], h: parts[3] }
    }
  }
  const w = Number.parseFloat(svg.getAttribute('width') ?? '300') || 300
  const h = Number.parseFloat(svg.getAttribute('height') ?? '150') || 150
  return { w, h }
}

export function pickElementNear(x: number, y: number, container: Element): Element | null {
  const candidates = new Set<Element>()

  const check = (px: number, py: number): void => {
    const el = document.elementFromPoint(px, py)
    if (el && el !== container && container.contains(el)) candidates.add(el)
  }

  check(x, y)
  const radii = [2, 4, 6, 8, 10, 14, 18]
  for (const r of radii) {
    const pts: [number, number][] = [
      [x - r, y], [x + r, y], [x, y - r], [x, y + r],
      [x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r],
    ]
    for (const [px, py] of pts) check(px, py)
  }

  if (candidates.size === 0) return null

  let best: Element | null = null
  let bestArea = Infinity
  candidates.forEach(el => {
    const r = el.getBoundingClientRect()
    const area = Math.max(r.width * r.height, 1)
    if (area < bestArea) { bestArea = area; best = el }
  })
  return best
}
