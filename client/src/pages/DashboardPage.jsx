import { AllowControlCard } from '../components/AllowControlCard'
import { LoginModal } from '../components/LoginModal'
import { RemoteControlCard } from '../components/RemoteControlCard'
import { Sidebar } from '../components/Sidebar'

export function DashboardPage({ remoteControl }) {
  const showStopButton = [
    'requesting',
    'connecting',
    'connected',
    'controlling',
    'pending_accept',
  ].includes(remoteControl.state)

  return (
    <div className="app-container">
      <LoginModal
        key={`${remoteControl.showLogin}-${remoteControl.currentUser?.email || 'guest'}-${remoteControl.currentUser?.name || 'guest'}`}
        open={remoteControl.showLogin}
        onClose={() => remoteControl.setShowLogin(false)}
        onSubmit={remoteControl.handleLogin}
        currentUser={remoteControl.currentUser}
      />

      <Sidebar
        onOpenLogin={() => remoteControl.setShowLogin(true)}
        onLogout={remoteControl.handleLogout}
        currentUser={remoteControl.currentUser}
        isAuthenticated={remoteControl.isAuthenticated}
      />

      <div className="main-content">
        <div className="session-banner">
          <div>
            <strong>{remoteControl.statusText}</strong>
            {remoteControl.error?.message ? <span>{remoteControl.error.message}</span> : null}
          </div>
          {showStopButton ? (
            <button className="disconnect-btn" onClick={remoteControl.disconnect}>
              停止连接
            </button>
          ) : null}
          {remoteControl.state === 'disconnected' ? (
            <button className="secondary-btn" onClick={remoteControl.resetForNextSession}>
              恢复待连接状态
            </button>
          ) : null}
        </div>

        <AllowControlCard
          myCode={remoteControl.myCode}
          myPassword={remoteControl.myPassword}
          passcodeType={remoteControl.passcodeType}
          requireAuth={remoteControl.requireAuth}
          showPasscodeMenu={remoteControl.showPasscodeMenu}
          showPassword={remoteControl.showPassword}
          onCopyCode={remoteControl.copyMyCode}
          onPasswordChange={remoteControl.setMyPassword}
          onRequireAuthChange={remoteControl.setRequireAuth}
          onTogglePasscodeMenu={() => remoteControl.setShowPasscodeMenu(!remoteControl.showPasscodeMenu)}
          onSelectPasscodeType={(type) => {
            remoteControl.setPasscodeType(type)
            remoteControl.setShowPasscodeMenu(false)
          }}
          onTogglePassword={() => remoteControl.setShowPassword(!remoteControl.showPassword)}
        />

        {remoteControl.incomingRequest ? (
          <div className="request-card">
            <div className="request-card__copy">
              <h3>收到远程协助请求</h3>
              <p>连接码 {remoteControl.myCode} 正在被请求连接，请确认是否允许对方查看并控制当前设备。</p>
              <div className="request-meta">
                <span>请求方：{remoteControl.incomingRequest.controllerUser?.name || remoteControl.incomingRequest.controllerId}</span>
                <span>模式：远程桌面控制</span>
              </div>
            </div>
            <div className="request-card__actions">
              <button className="ghost-btn" onClick={remoteControl.rejectIncomingRequest}>
                拒绝
              </button>
              <button className="connect-btn" onClick={remoteControl.acceptIncomingRequest}>
                接受并开始共享
              </button>
            </div>
          </div>
        ) : null}

        <RemoteControlCard
          controlMode={remoteControl.controlMode}
          recentConnections={remoteControl.recentConnections}
          remoteCheckCode={remoteControl.remoteCheckCode}
          remoteCode={remoteControl.remoteCode}
          shareAudio={remoteControl.shareAudio}
          isAuthenticated={remoteControl.isAuthenticated}
          onChangeMode={remoteControl.setControlMode}
          onSelectRecentConnection={remoteControl.selectRecentConnection}
          onToggleFavoriteConnection={remoteControl.toggleFavoriteConnection}
          onRemoteCheckCodeChange={remoteControl.setRemoteCheckCode}
          onRemoteCodeChange={remoteControl.handleRemoteCodeChange}
          onToggleShareAudio={remoteControl.setShareAudio}
          onStartConnection={remoteControl.startConnection}
        />
      </div>
    </div>
  )
}
