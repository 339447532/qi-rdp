const ERROR_CODES = {
  INVALID_CODE: 'INVALID_CODE',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_OCCUPIED: 'SESSION_OCCUPIED',
  SESSION_TIMEOUT: 'SESSION_TIMEOUT',
  SESSION_NOT_READY: 'SESSION_NOT_READY',
  INVALID_PASSCODE: 'INVALID_PASSCODE',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_CODE]: '连接码无效，请检查后重试。',
  [ERROR_CODES.SESSION_NOT_FOUND]: '会话不存在或已过期，请重新创建。',
  [ERROR_CODES.SESSION_OCCUPIED]: '当前会话已有主控端正在连接。',
  [ERROR_CODES.SESSION_TIMEOUT]: '当前会话已超时，请重新创建。',
  [ERROR_CODES.SESSION_NOT_READY]: '当前会话尚未准备好，请稍后重试。',
  [ERROR_CODES.INVALID_PASSCODE]: '验证码错误或已失效，请确认后重试。',
  [ERROR_CODES.AUTH_REQUIRED]: '该设备仅允许已登录账号发起连接。',
  [ERROR_CODES.ACCESS_DENIED]: '受控端拒绝了本次连接请求。',
  [ERROR_CODES.UNKNOWN_ERROR]: '发生未知错误，请稍后重试。',
}

function createError(code, message, details = {}) {
  return {
    code,
    message: message || ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
    details,
  }
}

function errorResponse(code, message, details) {
  return {
    success: false,
    error: createError(code, message, details),
  }
}

function successResponse(extra = {}) {
  return {
    success: true,
    ...extra,
  }
}

module.exports = {
  ERROR_CODES,
  ERROR_MESSAGES,
  createError,
  errorResponse,
  successResponse,
}
