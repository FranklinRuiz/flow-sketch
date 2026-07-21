import React, { useState, useEffect, useMemo, useId } from 'react'
import { useEditor } from '../context/EditorContext.tsx'
import { serializeSVG } from '../utils/svgUtils.ts'

// ─── AttrRow ─────────────────────────────────────────────────────────────────

interface AttrRowProps {
  readonly attrName:  string
  readonly attrValue: string
  readonly onSet:     (name: string, value: string) => void
  readonly onDelete:  (name: string) => void
}

function AttrRow({ attrName, attrValue, onSet, onDelete }: AttrRowProps): React.ReactElement {
  const [localValue, setLocalValue] = useState(attrValue)

  useEffect(() => { setLocalValue(attrValue) }, [attrValue])

  const commit = (): void => {
    if (localValue !== attrValue) onSet(attrName, localValue)
  }

  return (
    <tr>
      <td className="attr-name">{attrName}</td>
      <td>
        <input
          className="attr-value-input"
          value={localValue}
          aria-label={attrName}
          onChange={e => setLocalValue(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        />
      </td>
      <td>
        <button className="attr-del" title={`Eliminar atributo ${attrName}`} onClick={() => onDelete(attrName)}>
          ×
        </button>
      </td>
    </tr>
  )
}

// ─── AttributeTable ──────────────────────────────────────────────────────────

function AttributeTable({ node }: { readonly node: Element }): React.ReactElement {
  const { setAttrOnSelected, removeAttrFromSelected, addAttrToSelected } = useEditor()
  const [newName,  setNewName]  = useState('')
  const [newValue, setNewValue] = useState('')
  const nameId  = useId()
  const valueId = useId()

  const attrs = Array.from(node.attributes)

  const handleAdd = (): void => {
    const name = newName.trim()
    if (!name) return
    const ok = addAttrToSelected(name, newValue)
    if (ok) { setNewName(''); setNewValue('') }
  }

  return (
    <>
      <table className="attr-table">
        <tbody>
          {attrs.map(attr => (
            <AttrRow
              key={attr.name}
              attrName={attr.name}
              attrValue={attr.value}
              onSet={setAttrOnSelected}
              onDelete={removeAttrFromSelected}
            />
          ))}
        </tbody>
      </table>
      <div className="attr-add">
        <label htmlFor={nameId} className="sr-only">Nombre del atributo</label>
        <input
          id={nameId}
          className="attr-add-input attr-add-name"
          placeholder="atributo"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
        />
        <label htmlFor={valueId} className="sr-only">Valor del atributo</label>
        <input
          id={valueId}
          className="attr-add-input attr-add-value"
          placeholder="valor"
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
        />
        <button className="btn btn-small" onClick={handleAdd}>+</button>
      </div>
    </>
  )
}

// ─── RawXMLEditor ────────────────────────────────────────────────────────────

function RawXMLEditor({ node }: { readonly node: Element }): React.ReactElement {
  const { applyRawXML, deleteSelected, treeVersion } = useEditor()
  const [rawText, setRawText] = useState(() => serializeSVG(node))
  const [error,   setError]   = useState('')

  useEffect(() => {
    setRawText(serializeSVG(node))
    setError('')
  }, [node, treeVersion])

  const handleApply = (): void => {
    const result = applyRawXML(rawText)
    setError(result.error ?? '')
  }

  return (
    <>
      <textarea
        className="raw-xml"
        spellCheck={false}
        value={rawText}
        aria-label="XML del elemento"
        onChange={e => setRawText(e.target.value)}
      />
      <div className="raw-actions">
        <button className="btn btn-primary btn-small" onClick={handleApply}>Aplicar cambios</button>
        <button className="btn btn-danger  btn-small" onClick={deleteSelected}>Eliminar</button>
      </div>
      {error && <div className="raw-error" role="alert">{error}</div>}
    </>
  )
}

// ─── AnimationSection ────────────────────────────────────────────────────────

function AnimationSection({ node }: { readonly node: Element }): React.ReactElement | null {
  const { addDashAnimation, removeDashAnimation } = useEditor()
  const fromId = useId()
  const toId   = useId()
  const durId  = useId()

  const hasDashArray = !!node.getAttribute('stroke-dasharray')

  const existing = useMemo(() =>
    Array.from(node.children).find(
      ch => ch.tagName === 'animate' && ch.getAttribute('attributeName') === 'stroke-dashoffset'
    ) ?? null,
    [node],
  )

  const defaultTo = useMemo((): string => {
    const da  = node.getAttribute('stroke-dasharray') ?? ''
    const sum = da.trim().split(/[\s,]+/).map(Number).filter(n => !Number.isNaN(n) && n > 0).reduce((a, b) => a + b, 0)
    return sum > 0 ? String(-sum) : '-17'
  }, [node])

  const [from, setFrom] = useState('0')
  const [to,   setTo]   = useState(defaultTo)
  const [dur,  setDur]  = useState('0.6s')

  useEffect(() => {
    if (existing) {
      setFrom(existing.getAttribute('from') ?? '0')
      setTo(existing.getAttribute('to')     ?? defaultTo)
      setDur(existing.getAttribute('dur')   ?? '0.6s')
    } else {
      setFrom('0')
      setTo(defaultTo)
      setDur('0.6s')
    }
  }, [existing, defaultTo])

  if (!hasDashArray) return null

  return (
    <div className="section">
      <div className="section-title">Animación de marcha</div>
      <div className="anim-status-row">
        <span className={`anim-badge ${existing ? 'anim-badge--on' : ''}`}>
          {existing ? '● animando' : '○ sin animación'}
        </span>
      </div>
      <div className="anim-fields">
        <div className="anim-field">
          <label htmlFor={fromId}>from</label>
          <input id={fromId} className="attr-value-input" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="anim-field">
          <label htmlFor={toId}>to</label>
          <input id={toId} className="attr-value-input" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div className="anim-field">
          <label htmlFor={durId}>dur</label>
          <input id={durId} className="attr-value-input" value={dur} onChange={e => setDur(e.target.value)} />
        </div>
      </div>
      <div className="anim-actions">
        <button className="btn btn-primary btn-small" onClick={() => addDashAnimation(from, to, dur)}>
          {existing ? 'Actualizar' : 'Agregar animación'}
        </button>
        {existing && (
          <button className="btn btn-danger btn-small" onClick={removeDashAnimation}>Quitar</button>
        )}
      </div>
    </div>
  )
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

function EmptyState(): React.ReactElement {
  return (
    <div className="empty-state">
      <svg className="empty-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <rect x="4"  y="4"  width="14" height="14" rx="2"/>
        <rect x="22" y="4"  width="14" height="14" rx="2"/>
        <rect x="4"  y="22" width="14" height="14" rx="2"/>
        <rect x="22" y="22" width="14" height="14" rx="2"/>
        <circle cx="20" cy="20" r="3" fill="currentColor" stroke="none"/>
      </svg>
      <p>Seleccioná un elemento del árbol o hacé clic directamente sobre el dibujo.</p>
    </div>
  )
}

// ─── InspectorPanel ──────────────────────────────────────────────────────────

export default function InspectorPanel(): React.ReactElement {
  const { selectedNode, treeVersion, selectionVersion } = useEditor()

  return (
    <aside className="inspector-panel">
      <div className="panel-header">
        <span className="panel-title">Inspector</span>
      </div>

      {!selectedNode ? (
        <EmptyState />
      ) : (
        <div className="inspector-body">
          <div className="tag-badge">&lt;{selectedNode.tagName}&gt;</div>

          <div className="section">
            <div className="section-title">Atributos</div>
            <AttributeTable key={selectionVersion} node={selectedNode} />
          </div>

          <AnimationSection key={`${selectionVersion}-${treeVersion}`} node={selectedNode} />

          <div className="section">
            <div className="section-title">XML del elemento</div>
            <RawXMLEditor key={selectionVersion} node={selectedNode} />
          </div>
        </div>
      )}
    </aside>
  )
}
