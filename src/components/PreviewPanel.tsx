import React, { useEffect, useCallback } from 'react'
import { useEditor } from '../context/EditorContext.tsx'
import { pickElementNear } from '../utils/svgUtils.ts'

export default function PreviewPanel(): React.ReactElement {
  const {
    svgHostRef,
    previewViewportRef,
    loadSVGString,
    DEFAULT_SVG,
    selectNode,
    clearSelection,
    updateHighlight,
    currentSelectionRef,
    zoomDisplay,
    highlightStyle,
    zoomIn,
    zoomOut,
    fitZoom,
  } = useEditor()

  useEffect(() => {
    loadSVGString(DEFAULT_SVG)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onResize = (): void => {
      if (currentSelectionRef.current) updateHighlight(currentSelectionRef.current)
    }
    const onScroll = (): void => {
      if (currentSelectionRef.current) updateHighlight(currentSelectionRef.current)
    }
    window.addEventListener('resize', onResize)
    const vp = previewViewportRef.current
    if (vp) vp.addEventListener('scroll', onScroll)
    return () => {
      window.removeEventListener('resize', onResize)
      if (vp) vp.removeEventListener('scroll', onScroll)
    }
  }, [currentSelectionRef, previewViewportRef, updateHighlight])

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => e.preventDefault()

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    void file.text().then(text => loadSVGString(text))
  }

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation()
    const host = svgHostRef.current
    if (!host) return
    const el = pickElementNear(e.clientX, e.clientY, host)
    if (el?.nodeType === 1) selectNode(el)
    else clearSelection()
  }, [svgHostRef, selectNode, clearSelection])

  // Clic en el área vacía del lienzo, fuera del dibujo (el clic sobre el
  // dibujo en sí frena la propagación en handleCanvasClick, así que esto
  // solo dispara cuando el clic cae fuera de él).
  const handleViewportClick = useCallback((): void => {
    clearSelection()
  }, [clearSelection])

  const handleCanvasKey = useCallback((e: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key === 'Escape') e.currentTarget.blur()
  }, [])

  return (
    <section className="preview-panel">
      <div className="preview-toolbar">
        <div className="zoom-group">
          <button className="zoom-btn" onClick={zoomOut} title="Reducir zoom">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </button>
          <span className="zoom-label">{zoomDisplay}</span>
          <button className="zoom-btn" onClick={zoomIn}  title="Aumentar zoom">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2.5v7M2.5 6h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="toolbar-sep" />
        <button className="btn btn-small btn-ghost" onClick={fitZoom}>
          <svg width="11" height="11" viewBox="0 0 13 13" fill="none">
            <path d="M1.5 4.5v-3h3M11.5 4.5v-3h-3M1.5 8.5v3h3M11.5 8.5v3h-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Ajustar
        </button>
        <span className="hint">
          <svg width="10.5" height="10.5" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M6 5.3v3M6 3.7v.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          Clic sobre el dibujo para seleccionar un elemento
        </span>
      </div>

      <div
        className="preview-viewport"
        ref={previewViewportRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleViewportClick}
      >
        <button
          type="button"
          className="preview-stage"
          ref={svgHostRef}
          aria-label="Lienzo SVG. Clic para seleccionar un elemento."
          onClick={handleCanvasClick}
          onKeyDown={handleCanvasKey}
        />
        {highlightStyle && (
          <div
            className="highlight-box"
            style={{
              left:   highlightStyle.left,
              top:    highlightStyle.top,
              width:  highlightStyle.width,
              height: highlightStyle.height,
            }}
          />
        )}
      </div>
    </section>
  )
}
