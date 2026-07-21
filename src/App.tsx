import React from 'react'
import { EditorProvider } from './context/EditorContext.tsx'
import TopBar from './components/TopBar.tsx'
import TreePanel from './components/TreePanel.tsx'
import PreviewPanel from './components/PreviewPanel.tsx'
import InspectorPanel from './components/InspectorPanel.tsx'
import Modal from './components/Modal.tsx'

export default function App(): React.ReactElement {
  return (
    <EditorProvider>
      <TopBar />
      <div className="workspace">
        <TreePanel />
        <PreviewPanel />
        <InspectorPanel />
      </div>
      <Modal />
    </EditorProvider>
  )
}
