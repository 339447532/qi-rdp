export function RemoteControlCard({
  controlMode,
  recentConnections,
  remoteCheckCode,
  remoteCode,
  shareAudio,
  isAuthenticated,
  onChangeMode,
  onSelectRecentConnection,
  onToggleFavoriteConnection,
  onRemoteCheckCodeChange,
  onRemoteCodeChange,
  onToggleShareAudio,
  onStartConnection,
}) {
  return (
    <div className="card-section">
      <h2>远程控制设备</h2>

      <div className="control-input-group">
        <input
          type="text"
          placeholder="伙伴识别码"
          value={remoteCode}
          onChange={onRemoteCodeChange}
          className="remote-id-input"
        />
        <div className="input-divider">-</div>
        <input
          type="text"
          placeholder="验证码 (选填)"
          value={remoteCheckCode}
          onChange={(event) => onRemoteCheckCodeChange(event.target.value)}
          className="remote-pass-input"
        />
        <button className="connect-btn" onClick={onStartConnection}>连接</button>
      </div>

      <div className="mode-selection">
        <label className={`radio-label ${controlMode === 'desktop' ? 'selected' : ''}`}>
          <input
            type="radio"
            name="mode"
            checked={controlMode === 'desktop'}
            onChange={() => onChangeMode('desktop')}
          />
          <span>远程桌面</span>
        </label>
      </div>

      <label className="audio-toggle">
        <input type="checkbox" checked={shareAudio} onChange={(event) => onToggleShareAudio(event.target.checked)} />
        <span>建立会话时同时开启语音通话</span>
      </label>

      <div className="recent-devices">
        <span className="recent-tag">{isAuthenticated ? '账号已登录' : '当前为访客模式'}</span>
        <span className="recent-tag">支持验证码校验</span>
        <span className="recent-tag">支持剪贴板同步</span>
        <span className="recent-tag">支持文件直传</span>
      </div>

      {recentConnections?.length ? (
        <div className="recent-connection-list">
          {recentConnections.map((item) => (
            <div
              key={`${item.targetUserId || item.targetEmail || item.code}-${item.lastConnectedAt}`}
              className="recent-connection-card"
            >
              <button className="recent-connection-pick" onClick={() => onSelectRecentConnection(item)}>
                <strong>{item.targetName}</strong>
                <span>上次连接码：{item.code}</span>
                <span>{item.online ? '当前在线' : '当前离线'}</span>
                <span>{item.requireAuth ? '仅登录可连' : '开放连接'}</span>
              </button>
              <button
                className={`favorite-btn ${item.favorite ? 'favorite-btn--active' : ''}`}
                onClick={() => onToggleFavoriteConnection(item)}
                disabled={!isAuthenticated || !item.targetUserId}
              >
                {item.favorite ? '已收藏' : '收藏'}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
