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
    remoteVideoReady,
    currentUser,
    setRemoteVideoReady,
  } = remoteControl

  return (
    <div className="remote-view controller-view">
      <div className="remote-header remote-header--controller">
        <div className="remote-header__identity">
          <div>
            <strong>{sessionMeta?.controlledUser?.name || '--'}</strong>
            <span>{statusText}</span>
          </div>
          <div className="remote-header__badges">
            <span className="remote-pill">主控端 {currentUser?.name || '--'}</span>
            <span className="remote-pill">远端 {remoteDisplay?.bounds?.width || '--'} × {remoteDisplay?.bounds?.height || '--'}</span>
          </div>
        </div>
        <button className="disconnect-btn" onClick={disconnect}>
          断开连接
        </button>
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
          {transferStatus || (clipboardText ? `最近同步剪贴板：${clipboardText.slice(0, 32)}` : '键盘、鼠标、滚轮与双向剪贴板已启用')}
        </span>
      </div>
      <div className="remote-stage">
        {!remoteVideoReady ? (
          <div className="remote-stage__placeholder">
            <strong>正在接收远端画面</strong>
            <span>如果长时间仍是黑屏，请检查受控端屏幕录制权限与共享状态。</span>
          </div>
        ) : null}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="remote-video"
          onLoadedMetadata={() => setRemoteVideoReady(true)}
          onCanPlay={() => setRemoteVideoReady(true)}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(event) => event.preventDefault()}
        />
      </div>
    </div>
  )
}
