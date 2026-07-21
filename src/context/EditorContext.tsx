import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode, useReducer,
} from 'react'
import { DEFAULT_SVG, parseSVGString, serializeSVG, naturalSize, SVG_NS } from '../utils/svgUtils.ts'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HighlightStyle {
  left:   number
  top:    number
  width:  number
  height: number
}

export interface ModalState {
  type:    'alert' | 'confirm'
  message: string
  onYes?:  () => void
}

export interface EditorContextType {
  svgHostRef:           React.RefObject<HTMLButtonElement | null>
  previewViewportRef:   React.RefObject<HTMLDivElement | null>
  currentRootRef:       React.RefObject<Element | null>
  currentSelectionRef:  React.RefObject<Element | null>
  selectedNode:         Element | null
  zoomDisplay:          string
  highlightStyle:       HighlightStyle | null
  treeVersion:          number
  selectionVersion:     number
  modal:                ModalState | null
  closeModal:           () => void
  showAlert:            (msg: string) => void
  showConfirm:          (msg: string, onYes: () => void) => void
  loadSVGString:        (text: string) => void
  mountSVG:             (svgEl: Element) => void
  selectNode:           (node: Element) => void
  updateHighlight:      (node: Element) => void
  setAttrOnSelected:    (name: string, value: string) => void
  removeAttrFromSelected: (name: string) => void
  addAttrToSelected:    (name: string, value: string) => boolean
  applyRawXML:          (text: string) => { error: string | null }
  deleteSelected:       () => void
  downloadSVG:          () => void
  zoomIn:               () => void
  zoomOut:              () => void
  fitZoom:              () => void
  addDashAnimation:     (from: string, to: string, dur: string) => void
  removeDashAnimation:  () => void
  DEFAULT_SVG:          string
  serializeSVG:         (node: Node) => string
}

// ─── Context ─────────────────────────────────────────────────────────────────

const EditorContext = createContext<EditorContextType | null>(null)

export function useEditor(): EditorContextType {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor debe usarse dentro de <EditorProvider>')
  return ctx
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function EditorProvider({ children }: { readonly children: ReactNode }): React.ReactElement {
  const [, rerender] = useReducer((x: number) => x + 1, 0)

  const svgHostRef          = useRef<HTMLButtonElement>(null)
  const previewViewportRef  = useRef<HTMLDivElement>(null)
  const currentRootRef      = useRef<Element | null>(null)
  const currentSelectionRef = useRef<Element | null>(null)
  const zoomRef             = useRef<number>(1)

  const [zoomDisplay,   setZoomDisplay]   = useState('100%')
  const [highlightStyle, setHighlightStyle] = useState<HighlightStyle | null>(null)
  const [selectedNode,  setSelectedNode]  = useState<Element | null>(null)
  const [modal,         setModal]         = useState<ModalState | null>(null)
  const [treeVersion,      setTreeVersion]      = useState(0)
  const [selectionVersion, setSelectionVersion] = useState(0)

  // ── Modal ──────────────────────────────────────────────────────────────────
  const showAlert   = useCallback((msg: string) => setModal({ type: 'alert',   message: msg }), [])
  const showConfirm = useCallback((msg: string, onYes: () => void) => setModal({ type: 'confirm', message: msg, onYes }), [])
  const closeModal  = useCallback(() => setModal(null), [])

  // ── Highlight ──────────────────────────────────────────────────────────────
  const updateHighlight = useCallback((node: Element) => {
    const vp = previewViewportRef.current
    if (!vp) { setHighlightStyle(null); return }
    try {
      const rect = node.getBoundingClientRect()
      if (!rect || (rect.width === 0 && rect.height === 0)) { setHighlightStyle(null); return }
      const vpRect = vp.getBoundingClientRect()
      setHighlightStyle({
        left:   rect.left - vpRect.left + vp.scrollLeft,
        top:    rect.top  - vpRect.top  + vp.scrollTop,
        width:  rect.width,
        height: rect.height,
      })
    } catch {
      setHighlightStyle(null)
    }
  }, [])

  // ── Zoom ───────────────────────────────────────────────────────────────────
  const applyZoom = useCallback(() => {
    const stage = svgHostRef.current
    if (stage) stage.style.transform = `scale(${zoomRef.current})`
    setZoomDisplay(Math.round(zoomRef.current * 100) + '%')
    if (currentSelectionRef.current) {
      requestAnimationFrame(() => {
        if (currentSelectionRef.current) updateHighlight(currentSelectionRef.current)
      })
    }
  }, [updateHighlight])

  const fitZoom = useCallback(() => {
    const vp   = previewViewportRef.current
    const root = currentRootRef.current
    if (!vp || !root) return
    const { w, h } = naturalSize(root)
    const availW = vp.clientWidth  - 96
    const availH = vp.clientHeight - 96
    const scale  = Math.min(availW / w, availH / h, 2)
    zoomRef.current = Math.max(0.05, Number.isFinite(scale) ? scale : 1)
    applyZoom()
  }, [applyZoom])

  const zoomIn  = useCallback(() => { zoomRef.current = Math.min(zoomRef.current + 0.15, 4);   applyZoom() }, [applyZoom])
  const zoomOut = useCallback(() => { zoomRef.current = Math.max(zoomRef.current - 0.15, 0.05); applyZoom() }, [applyZoom])

  // ── Árbol ──────────────────────────────────────────────────────────────────
  const refreshTree = useCallback(() => setTreeVersion(v => v + 1), [])

  // ── Selección ──────────────────────────────────────────────────────────────
  const selectNode = useCallback((node: Element) => {
    if (node?.nodeType !== 1) return
    currentSelectionRef.current = node
    setSelectedNode(node)
    setSelectionVersion(v => v + 1)
    updateHighlight(node)
  }, [updateHighlight])

  // ── Montaje SVG ────────────────────────────────────────────────────────────
  const mountSVG = useCallback((svgEl: Element) => {
    const host = svgHostRef.current
    if (!host) return
    host.innerHTML = ''
    const imported = document.importNode(svgEl, true) as Element
    host.appendChild(imported)
    currentRootRef.current     = imported
    currentSelectionRef.current = null
    setSelectedNode(null)
    setHighlightStyle(null)
    setTreeVersion(v => v + 1)
    requestAnimationFrame(fitZoom)
  }, [fitZoom])

  const loadSVGString = useCallback((text: string) => {
    const result = parseSVGString(text)
    if (!result.ok) { showAlert(result.error); return }
    mountSVG(result.root)
  }, [mountSVG, showAlert])

  // ── Edición de atributos ───────────────────────────────────────────────────
  const setAttrOnSelected = useCallback((name: string, value: string) => {
    const node = currentSelectionRef.current
    if (!node) return
    node.setAttribute(name, value)
    refreshTree()
    updateHighlight(node)
    rerender()
  }, [refreshTree, updateHighlight, rerender])

  const removeAttrFromSelected = useCallback((name: string) => {
    const node = currentSelectionRef.current
    if (!node) return
    node.removeAttribute(name)
    refreshTree()
    updateHighlight(node)
    rerender()
  }, [refreshTree, updateHighlight, rerender])

  const addAttrToSelected = useCallback((name: string, value: string): boolean => {
    const node = currentSelectionRef.current
    if (!node) return false
    try {
      node.setAttribute(name, value)
    } catch {
      showAlert('Nombre de atributo inválido.')
      return false
    }
    refreshTree()
    updateHighlight(node)
    rerender()
    return true
  }, [refreshTree, updateHighlight, rerender, showAlert])

  // ── Animación de marcha ────────────────────────────────────────────────────
  const addDashAnimation = useCallback((from: string, to: string, dur: string) => {
    const node = currentSelectionRef.current
    if (!node) return
    const existing = Array.from(node.children).find(
      ch => ch.tagName === 'animate' && ch.getAttribute('attributeName') === 'stroke-dashoffset'
    )
    existing?.remove()
    const animate = document.createElementNS(SVG_NS, 'animate')
    animate.setAttribute('attributeName', 'stroke-dashoffset')
    animate.setAttribute('from',        from)
    animate.setAttribute('to',          to)
    animate.setAttribute('dur',         dur)
    animate.setAttribute('repeatCount', 'indefinite')
    node.appendChild(animate)
    refreshTree()
    rerender()
  }, [refreshTree, rerender])

  const removeDashAnimation = useCallback(() => {
    const node = currentSelectionRef.current
    if (!node) return
    const existing = Array.from(node.children).find(
      ch => ch.tagName === 'animate' && ch.getAttribute('attributeName') === 'stroke-dashoffset'
    )
    existing?.remove()
    refreshTree()
    rerender()
  }, [refreshTree, rerender])

  // ── Aplicar XML raw ───────────────────────────────────────────────────────
  const applyRawXML = useCallback((text: string): { error: string | null } => {
    const node = currentSelectionRef.current
    const root = currentRootRef.current
    if (!node) return { error: null }
    try {
      const wrapped = `<svg xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink">${text}</svg>`
      const doc     = new DOMParser().parseFromString(wrapped, 'image/svg+xml')
      if (doc.querySelector('parsererror')) throw new Error('XML mal formado. Revisá que todas las etiquetas estén bien cerradas.')
      const children = Array.from(doc.documentElement.children)
      if (children.length !== 1) throw new Error('Debe haber exactamente un elemento en el XML.')
      const imported = document.importNode(children[0], true) as Element
      if (node === root) {
        root.replaceWith(imported)
        currentRootRef.current = imported
      } else {
        node.replaceWith(imported)
      }
      setTreeVersion(v => v + 1)
      selectNode(imported)
      return { error: null }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }, [selectNode])

  // ── Eliminar nodo ─────────────────────────────────────────────────────────
  const deleteSelected = useCallback(() => {
    const node = currentSelectionRef.current
    const root = currentRootRef.current
    if (!node) return
    if (node === root) { showAlert('No se puede eliminar el elemento raíz <svg>.'); return }
    showConfirm('¿Eliminar este elemento y todo su contenido?', () => {
      node.remove()
      currentSelectionRef.current = null
      setSelectedNode(null)
      setHighlightStyle(null)
      setTreeVersion(v => v + 1)
    })
  }, [showAlert, showConfirm])

  // ── Descargar ─────────────────────────────────────────────────────────────
  const downloadSVG = useCallback(() => {
    const root = currentRootRef.current
    if (!root) return
    let src = serializeSVG(root)
    if (!src.startsWith('<?xml')) src = '<?xml version="1.0" standalone="no"?>\n' + src
    const blob = new Blob([src], { type: 'image/svg+xml' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'editado.svg'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [])

  // ── Valor del contexto — memoizado para evitar re-renders innecesarios ────
  const value = useMemo<EditorContextType>(() => ({
    svgHostRef,
    previewViewportRef,
    currentRootRef,
    currentSelectionRef,
    selectedNode,
    zoomDisplay,
    highlightStyle,
    treeVersion,
    selectionVersion,
    modal,
    closeModal,
    showAlert,
    showConfirm,
    loadSVGString,
    mountSVG,
    selectNode,
    updateHighlight,
    setAttrOnSelected,
    removeAttrFromSelected,
    addAttrToSelected,
    applyRawXML,
    deleteSelected,
    downloadSVG,
    zoomIn,
    zoomOut,
    fitZoom,
    addDashAnimation,
    removeDashAnimation,
    DEFAULT_SVG,
    serializeSVG,
  }), [
    selectedNode, zoomDisplay, highlightStyle, treeVersion, selectionVersion, modal,
    closeModal, showAlert, showConfirm, loadSVGString, mountSVG,
    selectNode, updateHighlight, setAttrOnSelected, removeAttrFromSelected,
    addAttrToSelected, applyRawXML, deleteSelected, downloadSVG,
    zoomIn, zoomOut, fitZoom, addDashAnimation, removeDashAnimation,
  ])

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}
