import React, { useRef, useEffect } from 'react'
import { useEditor } from '../context/EditorContext.tsx'

export default function Modal(): React.ReactElement | null {
  const { modal, closeModal } = useEditor()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return

    el.showModal()

    const onCancel = (e: Event): void => { e.preventDefault(); closeModal() }
    const onClick  = (e: MouseEvent): void => { if (e.target === el) closeModal() }

    el.addEventListener('cancel', onCancel)
    el.addEventListener('click',  onClick)
    return () => {
      el.removeEventListener('cancel', onCancel)
      el.removeEventListener('click',  onClick)
    }
  }, [modal, closeModal])

  if (!modal) return null

  const isConfirm = modal.type === 'confirm'

  const handleOk = (): void => {
    closeModal()
    if (isConfirm && modal.onYes) modal.onYes()
  }

  return (
    <dialog ref={dialogRef} className="modal-overlay">
      <div className="modal-box">
        <div className="modal-message">{modal.message}</div>
        <div className="modal-actions">
          {isConfirm && (
            <button className="btn btn-ghost btn-small" onClick={closeModal}>Cancelar</button>
          )}
          <button className="btn btn-primary btn-small" onClick={handleOk}>
            {isConfirm ? 'Confirmar' : 'Aceptar'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
