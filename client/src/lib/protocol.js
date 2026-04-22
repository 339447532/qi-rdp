// Session Roles
export const ROLES = {
  CONTROLLED: 'controlled',
  CONTROLLER: 'controller',
};

// Session States
export const SESSION_STATES = {
  IDLE: 'idle',
  WAITING: 'waiting',
  REQUESTING: 'requesting',
  PENDING_ACCEPT: 'pending_accept',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  CONTROLLING: 'controlling',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
};

// Client → Server Events
export const CLIENT_EVENTS = {
  SESSION_CREATE: 'session:create',
  SESSION_JOIN: 'session:join',
  SESSION_ACCEPT: 'session:accept',
  SESSION_REJECT: 'session:reject',
  SESSION_LEAVE: 'session:leave',
  WEBRTC_SIGNAL: 'webrtc:signal',
  USER_SYNC: 'user:sync',
};

// Server → Client Events
export const SERVER_EVENTS = {
  SESSION_STATE: 'session:state',
  SESSION_REQUEST: 'session:request',
  SESSION_ACCEPTED: 'session:accepted',
  SESSION_REJECTED: 'session:rejected',
  SESSION_ENDED: 'session:ended',
  SESSION_ERROR: 'session:error',
  PEER_CONNECTED: 'peer:connected',
  PEER_DISCONNECTED: 'peer:disconnected',
  WEBRTC_SIGNAL: 'webrtc:signal',
  USER_SYNCED: 'user:synced',
};

// Control Commands (DataChannel)
export const CONTROL_COMMANDS = {
  MOUSE_MOVE: 'mouse:move',
  MOUSE_DOWN: 'mouse:down',
  MOUSE_UP: 'mouse:up',
  MOUSE_CLICK: 'mouse:click',
  MOUSE_WHEEL: 'mouse:wheel',
  KEYBOARD_DOWN: 'keyboard:down',
  KEYBOARD_UP: 'keyboard:up',
  KEYBOARD_TAP: 'keyboard:tap',
  CLIPBOARD_SYNC: 'clipboard:sync',
  FILE_TRANSFER_META: 'file:meta',
  FILE_TRANSFER_CHUNK: 'file:chunk',
  FILE_TRANSFER_COMPLETE: 'file:complete',
};

// Error Codes
export const ERROR_CODES = {
  INVALID_CODE: 'INVALID_CODE',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_OCCUPIED: 'SESSION_OCCUPIED',
  SESSION_TIMEOUT: 'SESSION_TIMEOUT',
  SESSION_NOT_READY: 'SESSION_NOT_READY',
  INVALID_PASSCODE: 'INVALID_PASSCODE',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

// Error Messages (user-facing)
export const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_CODE]: '连接码无效，请检查后重新输入',
  [ERROR_CODES.SESSION_NOT_FOUND]: '会话不存在或已过期',
  [ERROR_CODES.SESSION_OCCUPIED]: '当前会话已被其他设备占用',
  [ERROR_CODES.SESSION_TIMEOUT]: '会话超时，请重新创建',
  [ERROR_CODES.SESSION_NOT_READY]: '会话尚未准备好，请稍后重试',
  [ERROR_CODES.INVALID_PASSCODE]: '验证码错误或已失效，请重新确认',
  [ERROR_CODES.AUTH_REQUIRED]: '该设备仅允许已登录账号发起连接',
  [ERROR_CODES.ACCESS_DENIED]: '受控端拒绝了本次连接请求',
  [ERROR_CODES.PERMISSION_DENIED]: '权限被拒绝，无法完成操作',
  [ERROR_CODES.CONNECTION_FAILED]: '连接失败，请检查网络后重试',
  [ERROR_CODES.UNKNOWN_ERROR]: '发生未知错误，请重试',
};
