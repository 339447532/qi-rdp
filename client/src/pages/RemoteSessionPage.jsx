export function RemoteSessionPage({ remoteControl }) {
  const {
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
    currentUser,
  } = remoteControl

  return (
    <div className="remote-view controller-view">
      <div className="remote-header remote-header--controller">
        <div>
          <strong>{statusText}</strong>
          <span>
            正在控制 {sessionMeta?.controlledUser?.name || '--'}，本机账号 {currentUser?.name || '--'}
          </span>
        </div>
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
        onContextMenu={(event) => event.preventDefault()}
      />
    </div>
  )
}
