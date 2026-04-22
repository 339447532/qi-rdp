import { useRemoteControl } from './hooks/useRemoteControl'
import { DashboardPage } from './pages/DashboardPage'
import { RemoteSessionPage } from './pages/RemoteSessionPage'
import { SESSION_STATES, ROLES } from './lib/protocol'
import { useEffect, useState } from 'react'

function ControlledOverlayApp() {
  const [overlayState, setOverlayState] = useState({
    collapsed: false,
    statusText: '屏幕共享中',
    currentUser: '--',
    displayText: '-- × --',
  })

  useEffect(() => {
    document.body.classList.add('overlay-window-body')
    return () => document.body.classList.remove('overlay-window-body')
  }, [])

  useEffect(() => {
    const off = window.electron?.window?.onOverlayState?.((payload) => {
      setOverlayState((previous) => ({ ...previous, ...payload }))
    })

    return () => off?.()
  }, [])

  return (
    <div className={`controlled-overlay ${overlayState.collapsed ? 'collapsed' : ''}`}>
      <button
        className="controlled-overlay__toggle"
        onClick={() => setOverlayState((previous) => ({ ...previous, collapsed: !previous.collapsed }))}
      >
        {overlayState.collapsed ? '展开' : '折叠'}
      </button>

      {overlayState.collapsed ? (
        <div className="controlled-overlay__summary">
          <span className="status-indicator"></span>
          <strong>共享中</strong>
        </div>
      ) : (
        <>
          <div className="controlled-overlay__status">
            <span className="status-indicator"></span>
            <div>
              <strong>{overlayState.statusText}</strong>
              <span>{overlayState.currentUser}</span>
            </div>
          </div>
          <div className="controlled-overlay__meta">
            <span>账号 {overlayState.currentUser}</span>
            <span>{overlayState.displayText}</span>
          </div>
          <button
            className="controlled-overlay__stop"
            onClick={() => window.electron?.window?.requestDisconnectFromOverlay?.()}
          >
            停止共享
          </button>
        </>
      )}
    </div>
  )
}

function MainApp() {
  const remoteControl = useRemoteControl()

  const showRemoteSession =
    remoteControl.role === ROLES.CONTROLLER &&
    (remoteControl.state === SESSION_STATES.CONNECTED ||
      remoteControl.state === SESSION_STATES.CONTROLLING ||
      remoteControl.state === SESSION_STATES.CONNECTING)

  if (showRemoteSession) {
    return <RemoteSessionPage remoteControl={remoteControl} />
  }

  return <DashboardPage remoteControl={remoteControl} />
}

function App() {
  const windowMode = new URLSearchParams(window.location.search).get('window') || 'main'
  return windowMode === 'controlled-overlay' ? <ControlledOverlayApp /> : <MainApp />
}

export default App
