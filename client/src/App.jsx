import { useRemoteControl } from './hooks/useRemoteControl'
import { DashboardPage } from './pages/DashboardPage'
import { RemoteSessionPage } from './pages/RemoteSessionPage'
import { SESSION_STATES, ROLES } from './lib/protocol'
import { useEffect, useState } from 'react'

function StopIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="5.5" y="5.5" width="9" height="9" rx="2.2" fill="currentColor" />
    </svg>
  )
}

function ControlledOverlayApp() {
  const [overlayState, setOverlayState] = useState({
    statusText: '屏幕共享中',
    currentUser: '--',
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
    <div className="controlled-overlay">
      <div className="controlled-overlay__row">
        <div className="controlled-overlay__status">
          <span className="status-indicator"></span>
          <strong>{String(overlayState.statusText || '共享中').replace('屏幕共享中', '共享中')}</strong>
        </div>
        <div className="controlled-overlay__meta">
          <span className="controlled-overlay__user">{overlayState.currentUser}</span>
        </div>
        <div className="controlled-overlay__actions">
          <button
            className="controlled-overlay__stop"
            onClick={() => window.electron?.window?.requestDisconnectFromOverlay?.()}
            aria-label="停止共享"
            title="停止共享"
          >
            <StopIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

function MainApp() {
  const remoteControl = useRemoteControl()
  const isControllerWindow = remoteControl.windowMode === 'controller'

  const showRemoteSession =
    remoteControl.role === ROLES.CONTROLLER &&
    (remoteControl.state === SESSION_STATES.CONNECTED ||
      remoteControl.state === SESSION_STATES.CONTROLLING)

  if (showRemoteSession) {
    return <RemoteSessionPage remoteControl={remoteControl} />
  }

  if (isControllerWindow) {
    return (
      <div className="controller-pending">
        <div className="controller-pending__card">
          <span className="controller-pending__eyebrow">控制窗口</span>
          <strong>{remoteControl.statusText}</strong>
          <p>
            {remoteControl.controllerRequestPending
              ? '连接请求已发出，正在等待远端设备响应并建立远程画面。'
              : '正在准备控制窗口，连接成功后会自动显示远程桌面。'}
          </p>
          <div className="controller-pending__actions">
            <button className="disconnect-btn" onClick={remoteControl.disconnect}>
              停止连接
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <DashboardPage remoteControl={remoteControl} />
}

function App() {
  const windowMode = new URLSearchParams(window.location.search).get('window') || 'main'
  return windowMode === 'controlled-overlay' ? <ControlledOverlayApp /> : <MainApp />
}

export default App
