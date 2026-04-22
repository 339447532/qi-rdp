export function RemoteSessionPage({ remoteControl }) {
  const {
    role,
    sessionMeta,
    clipboardText,
    disconnect,
    videoRef,
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    handleWheel,
    handleSendClipboard,
    handleSendFile,
    statusText,
    transferStatus,
    remoteDisplay,
    localDisplay,
  } = remoteControl
  const isControlled = role === 'controlled'

  if (isControlled) {
    return (
      <div className="remote-view controlled-view">
        <div className="remote-header">
          <span>{statusText}</span>
          <button className="disconnect-btn" onClick={disconnect}>
            停止共享
          </button>
        </div>
        <div className="sharing-panel">
          <div className="sharing-status">
            <div className="status-indicator streaming"></div>
            <span>屏幕共享中，主控端已获得操作权限</span>
          </div>
          <div className="remote-meta-grid">
            <div className="remote-meta-card">
              <span>当前状态</span>
              <strong>{statusText}</strong>
            </div>
            <div className="remote-meta-card">
              <span>主屏分辨率</span>
              <strong>
                {localDisplay?.bounds?.width || '--'} × {localDisplay?.bounds?.height || '--'}
              </strong>
            </div>
            <div className="remote-meta-card">
              <span>当前账号</span>
              <strong>{sessionMeta?.controlledUser?.name || '--'}</strong>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="remote-view">
      <div className="remote-header">
        <span>{statusText}</span>
        <button className="disconnect-btn" onClick={disconnect}>
          断开连接
        </button>
      </div>
      <div className="remote-meta-bar">
        <span>远端主屏：{remoteDisplay?.bounds?.width || '--'} × {remoteDisplay?.bounds?.height || '--'}</span>
        <span>远端用户：{sessionMeta?.controlledUser?.name || '--'}</span>
        <span>鼠标、滚轮、键盘控制已启用</span>
      </div>
      <div className="remote-toolbar">
        <button className="secondary-btn" onClick={handleSendClipboard}>
          推送本地剪贴板
        </button>
        <label className="file-upload-btn">
          发送文件
          <input type="file" hidden onChange={handleSendFile} />
        </label>
        <span className="remote-toolbar__hint">
          {transferStatus || (clipboardText ? `最近同步剪贴板：${clipboardText.slice(0, 32)}` : '剪贴板双向同步已启用')}
        </span>
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="remote-video"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />
    </div>
  )
}
