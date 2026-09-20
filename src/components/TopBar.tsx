import React, { useRef } from 'react'
import { useEditor } from '../context/EditorContext.tsx'

function BrandIcon(): React.ReactElement {
  return (
    <div className="brand-icon">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <rect x="1" y="1" width="4" height="4" rx="1" stroke="#4f8cf0" strokeWidth="1.2"/>
        <rect x="8" y="1" width="4" height="4" rx="1" stroke="#888890" strokeWidth="1.2"/>
        <rect x="1" y="8" width="4" height="4" rx="1" stroke="#888890" strokeWidth="1.2"/>
        <rect x="8" y="8" width="4" height="4" rx="1" stroke="#4f8cf0" strokeWidth="1.2"/>
      </svg>
    </div>
  )
}

export default function TopBar(): React.ReactElement {
  const { loadSVGString, downloadSVG, showConfirm, DEFAULT_SVG, openGifModal } = useEditor()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return
    void file.text().then(text => loadSVGString(text))
    e.target.value = ''
  }

  const handleReset = (): void => {
    showConfirm(
      '¿Descartar el SVG actual y volver al ejemplo por defecto?',
      () => loadSVGString(DEFAULT_SVG),
    )
  }

  return (
    <div className="topbar">
      <div className="brand">
        <BrandIcon />
        <div className="brand-text">
          <span className="brand-title">Editor SVG</span>
          <span className="brand-sub">seleccionar · editar · exportar</span>
        </div>
      </div>

      <div className="actions">
        <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M7 9.5V2M7 2L4 5M7 2l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 9.5v1.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Abrir SVG
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          aria-hidden="true"
          tabIndex={-1}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button className="btn btn-ghost" onClick={handleReset}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M3 2h5l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M7 6.5v4M5 8.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Nuevo
        </button>
        <div className="topbar-sep" />
        <button className="btn btn-ghost" onClick={openGifModal}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="3.5" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M3.7 6v2M3.7 6h1.1a.7.7 0 0 1 0 1.4H3.9M6.3 8V6h1.3M6.3 7.1h1M9 6v2M9 6h1.3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Exportar GIF
        </button>
        <button className="btn btn-primary" onClick={downloadSVG}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v7.5M7 9.5l-3-3M7 9.5l3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 9.5v1.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Descargar SVG
        </button>
      </div>
    </div>
  )
}
