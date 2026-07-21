import React, { useRef } from 'react'
import { useEditor } from '../context/EditorContext.tsx'

function BrandIcon(): React.ReactElement {
  return (
    <div className="brand-icon">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <rect x="1" y="1" width="4" height="4" rx="1" stroke="#e3ab49" strokeWidth="1.2"/>
        <rect x="8" y="1" width="4" height="4" rx="1" stroke="#5cb8a4" strokeWidth="1.2"/>
        <rect x="1" y="8" width="4" height="4" rx="1" stroke="#5cb8a4" strokeWidth="1.2"/>
        <rect x="8" y="8" width="4" height="4" rx="1" stroke="#e3ab49" strokeWidth="1.2"/>
      </svg>
    </div>
  )
}

export default function TopBar(): React.ReactElement {
  const { loadSVGString, downloadSVG, showConfirm, DEFAULT_SVG } = useEditor()
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
        <button className="btn btn-ghost" onClick={handleReset}>Nuevo</button>
        <div className="topbar-sep" />
        <button className="btn btn-primary" onClick={downloadSVG}>Descargar SVG</button>
      </div>
    </div>
  )
}
