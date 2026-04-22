const { SESSION_STATES } = require('./events')
const { ERROR_CODES, createError } = require('./errors')
const { generateUniqueCode } = require('./codeGenerator')

const SESSION_TTL_MS = 1000 * 60 * 30
const DAILY_PASSCODE_TTL_MS = 1000 * 60 * 60 * 24

function sanitizeUser(user) {
  const safeUser = user && typeof user === 'object' ? user : {}

  return {
    id: safeUser.id || null,
    name: safeUser.name || '访客用户',
    email: safeUser.email || '',
  }
}

function buildPasscodeConfig(input = {}) {
  const strategy = input.strategy === 'daily' || input.strategy === 'permanent' ? input.strategy : 'single'
  const rawValue = String(input.value || '').trim()

  if (!rawValue) {
    return {
      strategy,
      value: null,
      expiresAt: null,
    }
  }

  const now = Date.now()
  return {
    strategy,
    value: rawValue,
    expiresAt: strategy === 'permanent' ? null : now + DAILY_PASSCODE_TTL_MS,
  }
}

function buildAccessPolicy(input = {}) {
  return {
    requireAuth: Boolean(input.requireAuth),
  }
}

function createSessionManager({ logger }) {
  const sessions = new Map()
  const socketToCode = new Map()
  const usersBySocket = new Map()

  function now() {
    return Date.now()
  }

  function getSession(code) {
    if (!code) {
      return null
    }

    const session = sessions.get(code)
    if (!session) {
      return null
    }

    if (session.expiresAt <= now()) {
      logger.info(`Session expired: ${code}`)
      removeSession(code)
      return null
    }

    return session
  }

  function touchSession(session) {
    session.lastActiveAt = now()
    session.expiresAt = session.lastActiveAt + SESSION_TTL_MS
  }

  function getUserBySocketId(socketId) {
    return usersBySocket.get(socketId) || null
  }

  function getCodeBySocketId(socketId) {
    return socketToCode.get(socketId) || null
  }

  function getRoleBySocketId(session, socketId) {
    if (!session || !socketId) return null
    if (session.controlledSocketId === socketId) return 'controlled'
    if (session.controllerSocketId === socketId) return 'controller'
    return null
  }

  function removeSocketMapping(socketId) {
    if (socketId) {
      socketToCode.delete(socketId)
      usersBySocket.delete(socketId)
    }
  }

  function removeSession(code) {
    const session = sessions.get(code)
    if (!session) return

    removeSocketMapping(session.controlledSocketId)
    removeSocketMapping(session.controllerSocketId)
    sessions.delete(code)
  }

  function createSession(controlledSocketId, options = {}) {
    const existingCode = getCodeBySocketId(controlledSocketId)
    if (existingCode) {
      removeSession(existingCode)
    }

    const sessionCode = generateUniqueCode(sessions)
    const createdAt = now()
    const controlledUser = sanitizeUser(options.user)
    const passcode = buildPasscodeConfig(options.passcode)
    const accessPolicy = buildAccessPolicy(options.accessPolicy)
    const session = {
      sessionCode,
      controlledSocketId,
      controllerSocketId: null,
      controlledUser,
      controllerUser: null,
      status: SESSION_STATES.WAITING,
      passcodeStrategy: passcode.strategy,
      passcodeValue: passcode.value,
      passcodeExpiresAt: passcode.expiresAt,
      requireAuth: accessPolicy.requireAuth,
      createdAt,
      expiresAt: createdAt + SESSION_TTL_MS,
      lastActiveAt: createdAt,
    }

    sessions.set(sessionCode, session)
    socketToCode.set(controlledSocketId, sessionCode)
    usersBySocket.set(controlledSocketId, controlledUser)
    logger.info(`Session created: ${sessionCode} by ${controlledSocketId}`)
    return session
  }

  function validatePasscode(session, passcode) {
    if (!session.passcodeValue) {
      return true
    }

    if (session.passcodeExpiresAt && session.passcodeExpiresAt <= now()) {
      throw createError(ERROR_CODES.INVALID_PASSCODE, '验证码已失效，请让对方重新生成。')
    }

    if (String(passcode || '').trim() !== session.passcodeValue) {
      throw createError(ERROR_CODES.INVALID_PASSCODE)
    }

    if (session.passcodeStrategy === 'single') {
      session.passcodeValue = null
      session.passcodeExpiresAt = null
    }

    return true
  }

  function joinSession(code, controllerSocketId, options = {}) {
    const session = getSession(code)
    if (!session) {
      throw createError(ERROR_CODES.SESSION_NOT_FOUND)
    }

    if (session.controllerSocketId && session.controllerSocketId !== controllerSocketId) {
      throw createError(ERROR_CODES.SESSION_OCCUPIED)
    }

    const controllerUser = sanitizeUser(options.user)
    if (session.requireAuth && !controllerUser.id) {
      throw createError(ERROR_CODES.AUTH_REQUIRED)
    }

    validatePasscode(session, options.passcode)

    session.controllerSocketId = controllerSocketId
    session.controllerUser = controllerUser
    session.status = SESSION_STATES.PENDING_ACCEPT
    touchSession(session)
    socketToCode.set(controllerSocketId, session.sessionCode)
    usersBySocket.set(controllerSocketId, session.controllerUser)
    logger.info(`Controller ${controllerSocketId} joined session ${session.sessionCode}`)
    return session
  }

  function acceptSession(code) {
    const session = getSession(code)
    if (!session) {
      throw createError(ERROR_CODES.SESSION_NOT_FOUND)
    }

    if (!session.controllerSocketId) {
      throw createError(ERROR_CODES.SESSION_NOT_READY)
    }

    session.status = SESSION_STATES.CONNECTING
    touchSession(session)
    logger.info(`Session accepted: ${session.sessionCode}`)
    return session
  }

  function rejectSession(code) {
    const session = getSession(code)
    if (!session) {
      throw createError(ERROR_CODES.SESSION_NOT_FOUND)
    }

    const controllerSocketId = session.controllerSocketId
    removeSocketMapping(controllerSocketId)
    session.controllerSocketId = null
    session.controllerUser = null
    session.status = SESSION_STATES.WAITING
    touchSession(session)
    logger.info(`Session rejected: ${session.sessionCode}`)
    return { session, controllerSocketId }
  }

  function markConnected(code) {
    const session = getSession(code)
    if (!session) {
      throw createError(ERROR_CODES.SESSION_NOT_FOUND)
    }

    session.status = SESSION_STATES.CONNECTED
    touchSession(session)
    logger.info(`Session connected: ${session.sessionCode}`)
    return session
  }

  function leaveSession(code, socketId) {
    const session = getSession(code)
    if (!session) {
      return null
    }

    const role = getRoleBySocketId(session, socketId)
    const peerSocketId =
      role === 'controlled' ? session.controllerSocketId : session.controlledSocketId

    if (role === 'controlled') {
      logger.info(`Controlled left session ${code}`)
      removeSession(code)
      return { role, peerSocketId, removed: true, sessionCode: code }
    }

    if (role === 'controller') {
      logger.info(`Controller left session ${code}`)
      removeSocketMapping(session.controllerSocketId)
      session.controllerSocketId = null
      session.controllerUser = null
      session.status = SESSION_STATES.WAITING
      touchSession(session)
      return { role, peerSocketId, removed: false, session }
    }

    return null
  }

  function handleDisconnect(socketId) {
    const code = getCodeBySocketId(socketId)
    if (!code) {
      return null
    }

    return leaveSession(code, socketId)
  }

  function getPeerSocketId(code, socketId) {
    const session = getSession(code)
    if (!session) {
      throw createError(ERROR_CODES.SESSION_NOT_FOUND)
    }

    const role = getRoleBySocketId(session, socketId)
    if (role === 'controlled') {
      return session.controllerSocketId
    }

    if (role === 'controller') {
      return session.controlledSocketId
    }

    throw createError(ERROR_CODES.SESSION_NOT_READY)
  }

  function updateSessionOptions(code, socketId, options = {}) {
    const session = getSession(code)
    if (!session) {
      throw createError(ERROR_CODES.SESSION_NOT_FOUND)
    }

    if (session.controlledSocketId !== socketId) {
      throw createError(ERROR_CODES.ACCESS_DENIED, '只有受控端可以更新当前会话配置。')
    }

    if (options.user) {
      session.controlledUser = sanitizeUser(options.user)
      usersBySocket.set(socketId, session.controlledUser)
    }

    if (options.passcode) {
      const passcode = buildPasscodeConfig(options.passcode)
      session.passcodeStrategy = passcode.strategy
      session.passcodeValue = passcode.value
      session.passcodeExpiresAt = passcode.expiresAt
    }

    if (options.accessPolicy) {
      const accessPolicy = buildAccessPolicy(options.accessPolicy)
      session.requireAuth = accessPolicy.requireAuth
    }

    touchSession(session)
    return session
  }

  function syncUser(socketId, user) {
    const safeUser = sanitizeUser(user)
    usersBySocket.set(socketId, safeUser)

    const code = getCodeBySocketId(socketId)
    if (!code) {
      return { user: safeUser, session: null }
    }

    const session = getSession(code)
    if (!session) {
      return { user: safeUser, session: null }
    }

    if (session.controlledSocketId === socketId) {
      session.controlledUser = safeUser
    }

    if (session.controllerSocketId === socketId) {
      session.controllerUser = safeUser
    }

    touchSession(session)
    return { user: safeUser, session }
  }

  return {
    createSession,
    joinSession,
    acceptSession,
    rejectSession,
    markConnected,
    leaveSession,
    handleDisconnect,
    getSession,
    getPeerSocketId,
    getCodeBySocketId,
    getRoleBySocketId,
    getUserBySocketId,
    updateSessionOptions,
    syncUser,
  }
}

module.exports = {
  SESSION_TTL_MS,
  createSessionManager,
}
