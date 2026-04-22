import { ChevronDown, ChevronUp, Copy, Eye, EyeOff } from 'lucide-react'

const passcodeLabels = {
  single: '单次验证码',
  daily: '今日验证码',
  permanent: '长期验证码',
}

export function AllowControlCard({
  myCode,
  myPassword,
  passcodeType,
  requireAuth,
  showPasscodeMenu,
  showPassword,
  onCopyCode,
  onPasswordChange,
  onRequireAuthChange,
  onTogglePasscodeMenu,
  onSelectPasscodeType,
  onTogglePassword,
}) {
  return (
    <div className="card-section">
      <h2>允许控制本设备</h2>

      <div className="id-container">
        <div className="id-group">
          <label>本机识别码</label>
          <div className="code-display">
            {myCode}
            <Copy size={18} className="copy-icon" onClick={onCopyCode} />
          </div>
        </div>

        <div className="pass-group" style={{ position: 'relative' }}>
          <div
            className="pass-label-row"
            onClick={onTogglePasscodeMenu}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <label>{passcodeLabels[passcodeType]}</label>
            {showPasscodeMenu ? <ChevronUp size={12} color="#999" /> : <ChevronDown size={12} color="#999" />}
          </div>

          {showPasscodeMenu && (
            <div className="passcode-menu">
              <div className="menu-item" onClick={() => onSelectPasscodeType('permanent')}>长期验证码</div>
              <div className="menu-item" onClick={() => onSelectPasscodeType('daily')}>今日验证码</div>
              <div className="menu-item" onClick={() => onSelectPasscodeType('single')}>单次验证码</div>
            </div>
          )}

          <div className="pass-display">
            <input
              type={showPassword ? 'text' : 'password'}
              value={myPassword}
              onChange={(event) => onPasswordChange(event.target.value)}
              className="pass-input"
            />
            <div className="pass-actions">
              {showPassword ? (
                <EyeOff size={16} onClick={onTogglePassword} />
              ) : (
                <Eye size={16} onClick={onTogglePassword} />
              )}
            </div>
          </div>
        </div>
      </div>

      <label className="audio-toggle">
        <input
          type="checkbox"
          checked={requireAuth}
          onChange={(event) => onRequireAuthChange(event.target.checked)}
        />
        <span>仅允许已登录账号发起连接</span>
      </label>
    </div>
  )
}
