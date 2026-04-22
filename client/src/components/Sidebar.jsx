import { Lock, Monitor, ShieldCheck, User } from 'lucide-react'

export function Sidebar({ onOpenLogin, onLogout, currentUser, isAuthenticated }) {
  return (
    <div className="sidebar">
      <div className="user-info">
        <div className="avatar" onClick={onOpenLogin} style={{ cursor: 'pointer' }}>
          <User size={24} color="#ff4d6a" />
        </div>
        <div className="user-details">
          <div className="username">{currentUser?.name || '访客用户'}</div>
          {currentUser?.email ? <div className="user-badge">{currentUser.email}</div> : null}
        </div>
      </div>

      <div className="nav-menu">
        <div className="nav-item active">
          <Monitor size={18} />
          <span>远程协助</span>
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="secondary-btn" onClick={isAuthenticated ? onLogout : onOpenLogin}>
          {isAuthenticated ? '退出登录' : '登录账号'}
        </button>
        <div className="security-status">
          <ShieldCheck size={14} color="#52c41a" />
          <span>已连接安全加密链路</span>
          <Lock size={14} className="lock-icon" />
        </div>
      </div>
    </div>
  )
}
