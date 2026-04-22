import { usePermissions } from '../hooks/usePermissions'

export function PermissionGate({ children, blocking = true }) {
  const { screenRecording, accessibility, hasChecked, openSystemPreferences, lastOpenMessage, platform } = usePermissions()

  if (!hasChecked) {
    if (!blocking) {
      return (
        <>
          {children ?? null}
          <div className="permission-modal-overlay">
            <div className="permission-modal permission-modal--loading">
              <span>检查权限中...</span>
            </div>
          </div>
        </>
      )
    }

    return (
      <div className="permission-check-loading">
        <span>检查权限中...</span>
      </div>
    )
  }

  const missingPermissions = [screenRecording, accessibility].filter((permission) => !permission.granted)

  if (missingPermissions.length > 0) {
    const primaryPermission = missingPermissions[0]?.openTarget || 'privacy'
    const helperMessage =
      platform === 'darwin'
        ? `请到系统设置中为本应用开启 ${missingPermissions.map((item) => item.label).join('、')}。`
        : missingPermissions.map((item) => item.message).join(' ')

    const modal = (
      <div className="permission-modal-overlay">
        <div className="permission-modal">
          <h2>需要权限</h2>
          <p>当前环境缺少远程控制必需权限：</p>

          <div className="permission-list">
            {missingPermissions.map((permission) => (
              <div key={permission.key} className="permission-item">
                <div>
                  <span className="perm-name">{permission.label}</span>
                  <div className="perm-desc">{permission.message}</div>
                </div>
                <span className="perm-status denied">未就绪</span>
              </div>
            ))}
          </div>

          <div className="permission-instructions">
            <p>{helperMessage}</p>
            {lastOpenMessage ? <p>{lastOpenMessage}</p> : null}
          </div>

          <div className="permission-actions">
            <button className="retry-btn" onClick={() => openSystemPreferences(primaryPermission)}>
              {platform === 'darwin' ? '打开系统设置' : '查看说明'}
            </button>
          </div>
        </div>
      </div>
    )

    if (!blocking) {
      return (
        <>
          {children ?? null}
          {modal}
        </>
      )
    }

    return modal
  }

  return children
}
