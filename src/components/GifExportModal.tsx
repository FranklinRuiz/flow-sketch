import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useEditor } from '../context/EditorContext.tsx'
import { detectAnimationDuration, exportAnimatedSVGAsGIF } from '../utils/gifExport.ts'

type Status = 'idle' | 'exporting' | 'error'

export default function GifExportModal(): React.ReactElement | null {
  const { gifModalOpen, closeGifModal, currentRootRef, showAlert } = useEditor()
  const dialogRef = useRef<HTMLDialogElement>(null)

  const detected = useMemo(() => {
    const root = currentRootRef.current
    if (!root || !gifModalOpen) return { durationMs: 2000, hasAnimation: false }
    return detectAnimationDuration(root)
  }, [currentRootRef, gifModalOpen])

  const [durationS, setDurationS] = useState('2')
  const [fps,       setFps]       = useState('20')
  const [scale,     setScale]     = useState('2')
  const [status,    setStatus]    = useState<Status>('idle')
  const [progress,  setProgress]  = useState(0)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!gifModalOpen) return
    setDurationS((detected.durationMs / 1000).toFixed(2).replace(/\.?0+$/, ''))
    setStatus('idle')
    setProgress(0)
    setError(null)
  }, [gifModalOpen, detected.durationMs])

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    el.showModal()
    const onCancel = (e: Event): void => {
      if (status === 'exporting') { e.preventDefault(); return }
      closeGifModal()
    }
    const onClick = (e: MouseEvent): void => {
      if (e.target === el && status !== 'exporting') closeGifModal()
    }
    el.addEventListener('cancel', onCancel)
    el.addEventListener('click',  onClick)
    return () => {
      el.removeEventListener('cancel', onCancel)
      el.removeEventListener('click',  onClick)
    }
  }, [gifModalOpen, closeGifModal, status])

  if (!gifModalOpen) return null

  const durationMs = Math.round((parseFloat(durationS) || 0) * 1000)
  const fpsNum     = Math.round(parseFloat(fps) || 0)
  const scaleNum   = parseFloat(scale) || 0
  const estFrames  = fpsNum > 0 && durationMs > 0 ? Math.max(1, Math.round((durationMs / 1000) * fpsNum)) : 0
  const validInput = durationMs > 0 && fpsNum > 0 && fpsNum <= 60 && scaleNum > 0 && scaleNum <= 4

  const handleExport = async (): Promise<void> => {
    const root = currentRootRef.current
    if (!root || !validInput) return
    setStatus('exporting')
    setProgress(0)
    setError(null)
    try {
      const blob = await exportAnimatedSVGAsGIF(root, {
        durationMs,
        fps: fpsNum,
        scale: scaleNum,
        onProgress: setProgress,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'animacion.gif'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      closeGifModal()
    } catch (e) {
      const message = (e as Error).message || 'No se pudo exportar el GIF.'
      setError(message)
      setStatus('error')
      showAlert(message)
    }
  }

  const isExporting = status === 'exporting'

  return (
    <dialog ref={dialogRef} className="modal-overlay">
      <div className="modal-box gif-modal-box">
        <div className="gif-modal-title">Exportar como GIF</div>

        {!detected.hasAnimation && (
          <div className="gif-modal-warning">
            No se detectaron animaciones (&lt;animate&gt;) en el SVG actual — se exportará un GIF de un solo frame.
          </div>
        )}

        <div className="gif-fields">
          <div className="gif-field">
            <label htmlFor="gif-duration">Duración (s)</label>
            <input
              id="gif-duration"
              type="number"
              min="0.1"
              max="30"
              step="0.1"
              value={durationS}
              disabled={isExporting}
              onChange={e => setDurationS(e.target.value)}
            />
          </div>
          <div className="gif-field">
            <label htmlFor="gif-fps">FPS</label>
            <input
              id="gif-fps"
              type="number"
              min="1"
              max="60"
              step="1"
              value={fps}
              disabled={isExporting}
              onChange={e => setFps(e.target.value)}
            />
          </div>
          <div className="gif-field">
            <label htmlFor="gif-scale">Calidad (×)</label>
            <input
              id="gif-scale"
              type="number"
              min="0.5"
              max="4"
              step="0.5"
              value={scale}
              disabled={isExporting}
              onChange={e => setScale(e.target.value)}
            />
          </div>
        </div>

        <div className="gif-hint">
          {validInput
            ? `${estFrames} frames en total. A mayor calidad y FPS, más pesado el archivo y más lenta la exportación.`
            : 'Revisá los valores: duración y FPS deben ser mayores a 0, FPS ≤ 60 y calidad ≤ 4×.'}
        </div>

        {isExporting && (
          <div className="gif-progress">
            <div className="gif-progress-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        {error && !isExporting && <div className="raw-error">{error}</div>}

        <div className="modal-actions">
          <button className="btn btn-ghost btn-small" onClick={closeGifModal} disabled={isExporting}>
            Cancelar
          </button>
          <button
            className="btn btn-primary btn-small"
            onClick={() => void handleExport()}
            disabled={!validInput || isExporting}
          >
            {isExporting ? `Exportando… ${Math.round(progress * 100)}%` : 'Exportar GIF'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
