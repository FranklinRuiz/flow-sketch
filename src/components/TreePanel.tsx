import React, { useState, useCallback } from 'react'
import { useEditor } from '../context/EditorContext.tsx'

interface TreeNodeProps {
  readonly node:         Element
  readonly depth:        number
  readonly selectedNode: Element | null
  readonly onSelect:     (node: Element) => void
  readonly collapsed:    Set<Element>
  readonly onToggle:     (node: Element) => void
}

function TreeNode({ node, depth, selectedNode, onSelect, collapsed, onToggle }: TreeNodeProps): React.ReactElement {
  const elementChildren = Array.from(node.children)
  const hasChildren = elementChildren.length > 0
  const isSelected  = node === selectedNode
  const isCollapsed = collapsed.has(node)

  const tagName = node.tagName
  const id      = node.getAttribute('id')
  const cls     = node.getAttribute('class')

  return (
    <>
      <div
        className={`tree-row${isSelected ? ' active' : ''}`}
        style={{ paddingLeft: (depth * 14 + 8) + 'px' }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="tree-toggle"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); onToggle(node) }}
          >
            {isCollapsed ? '▸' : '▾'}
          </button>
        ) : (
          <span className="tree-toggle" aria-hidden="true" />
        )}
        <button
          type="button"
          className="tree-label"
          onClick={() => onSelect(node)}
        >
          <span className="tag-name">{tagName}</span>
          {id  && <span className="tag-id">#{id}</span>}
          {cls && <span className="tag-class">.{cls.trim().split(/\s+/).join('.')}</span>}
        </button>
      </div>

      {hasChildren && !isCollapsed && (
        <div>
          {elementChildren.map((child, i) => (
            <TreeNode
              key={`${child.tagName}-${i}`}
              node={child}
              depth={depth + 1}
              selectedNode={selectedNode}
              onSelect={onSelect}
              collapsed={collapsed}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </>
  )
}

export default function TreePanel(): React.ReactElement {
  const { currentRootRef, selectedNode, selectNode, treeVersion } = useEditor()
  const [collapsed, setCollapsed] = useState<Set<Element>>(new Set())

  const handleToggle = useCallback((node: Element): void => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(node)) next.delete(node)
      else next.add(node)
      return next
    })
  }, [])

  const root = currentRootRef.current

  return (
    <aside className="tree-panel">
      <div className="panel-header">
        <span className="panel-header-group">
          <svg width="10.5" height="10.5" viewBox="0 0 13 13" fill="none">
            <path d="M2 2.5h9M2 6.5h6M2 10.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="panel-title">Elementos</span>
        </span>
      </div>
      <div className="tree">
        {root && (
          <TreeNode
            key={treeVersion}
            node={root}
            depth={0}
            selectedNode={selectedNode}
            onSelect={selectNode}
            collapsed={collapsed}
            onToggle={handleToggle}
          />
        )}
      </div>
    </aside>
  )
}
