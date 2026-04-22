import { useState } from 'react'

export function LoginModal({ open, onClose, onSubmit, currentUser }) {
  const [name, setName] = useState(currentUser?.name || '')
  const [email, setEmail] = useState(currentUser?.email || '')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <h2>用户身份</h2>
        <div className="mode-selection">
          <label className={`radio-label ${mode === 'login' ? 'selected' : ''}`}>
            <input type="radio" checked={mode === 'login'} onChange={() => setMode('login')} />
            <span>登录</span>
          </label>
          <label className={`radio-label ${mode === 'register' ? 'selected' : ''}`}>
            <input type="radio" checked={mode === 'register'} onChange={() => setMode('register')} />
            <span>注册</span>
          </label>
        </div>
        <div className="input-group">
          {mode === 'register' ? (
            <input
              type="text"
              placeholder="姓名 / 设备名称"
              className="modal-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          ) : null}
          <input
            type="email"
            placeholder="邮箱或账号"
            className="modal-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            type="password"
            placeholder="密码"
            className="modal-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <button
          className="login-btn"
          onClick={() => onSubmit?.({ mode, name, email, password })}
        >
          {mode === 'register' ? '注册并登录' : '登录并同步'}
        </button>
      </div>
    </div>
  )
}
