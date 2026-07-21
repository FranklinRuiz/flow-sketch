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
  }, [svgHostRef, selectNode])

  const handleCanvasKey = useCallback((e: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key === 'Escape') e.currentTarget.blur()
  }, [])

  return (
    <section className="preview-panel">
      <div className="preview-toolbar">
        <div className="zoom-group">
          <button className="zoom-btn" onClick={zoomOut} title="Reducir zoom">−</button>
          <span className="zoom-label">{zoomDisplay}</span>
          <button className="zoom-btn" onClick={zoomIn}  title="Aumentar zoom">+</button>
        </div>
        <div className="toolbar-sep" />
        <button className="btn btn-small btn-ghost" onClick={fitZoom}>Ajustar</button>
        <span className="hint">Clic sobre el dibujo para seleccionar un elemento</span>
      </div>

      <div
        className="preview-viewport"
        ref={previewViewportRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
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
