const { CLIENT_EVENTS, SERVER_EVENTS, ROLES, SESSION_STATES } = require('./events')
const { ERROR_CODES, errorResponse, successResponse } = require('./errors')
const { createSessionManager } = require('./sessionManager')
const { addRecentConnection } = require('../auth/service')
const { markUserOffline, markUserOnline } = require('../auth/presence')
const { verifyUserToken } = require('../auth/token')

module.exports = (io, logger) => {
  const sessionManager = createSessionManager({ logger })

  function buildSessionStatePayload(session, targetRole) {
    if (!session || !targetRole) return null

    const isController = targetRole === ROLES.CONTROLLER
    return {
      code: session.sessionCode,
      role: targetRole,
      state:
        session.status === SESSION_STATES.CONNECTED
          ? isController
            ? SESSION_STATES.CONTROLLING
            : SESSION_STATES.CONNECTED
          : session.status === SESSION_STATES.PENDING_ACCEPT && isController
            ? SESSION_STATES.REQUESTING
            : session.status,
      session: {
        code: session.sessionCode,
        passcodeStrategy: session.passcodeStrategy,
        hasPasscode: Boolean(session.passcodeValue),
        requireAuth: Boolean(session.requireAuth),
        controlledUser: session.controlledUser,
        controllerUser: session.controllerUser,
      },
    }
  }

  function emitState(session) {
    if (!session) return

    if (session.controlledSocketId) {
      io.to(session.controlledSocketId).emit(
        SERVER_EVENTS.SESSION_STATE,
        buildSessionStatePayload(session, ROLES.CONTROLLED),
      )
    }

    if (session.controllerSocketId) {
      io.to(session.controllerSocketId).emit(
        SERVER_EVENTS.SESSION_STATE,
        buildSessionStatePayload(session, ROLES.CONTROLLER),
      )
    }
  }

  function emitError(socket, error) {
    socket.emit(SERVER_EVENTS.SESSION_ERROR, error)
  }

  io.on('connection', (socket) => {
    let authenticatedUserId = null
    const token = socket.handshake.auth?.token
    if (token) {
      try {
        const user = verifyUserToken(token)
        sessionManager.syncUser(socket.id, user)
        authenticatedUserId = user.id
        markUserOnline(user.id)
      } catch (error) {
        logger.warn(`Invalid socket auth token for ${socket.id}: ${error.message}`)
      }
    }

    logger.info(`User connected: ${socket.id}`)

    socket.on(CLIENT_EVENTS.SESSION_CREATE, (callback = () => {}) => {
      try {
        const session = sessionManager.createSession(socket.id, {
          user: sessionManager.getUserBySocketId(socket.id),
        })
        emitState(session)
        callback(successResponse({ code: session.sessionCode }))
      } catch (error) {
        logger.error(`Failed to create session for ${socket.id}: ${error.message}`)
        callback(errorResponse(ERROR_CODES.UNKNOWN_ERROR))
      }
    })

    socket.on(CLIENT_EVENTS.SESSION_JOIN, ({ code, passcode }, callback = () => {}) => {
      try {
        const session = sessionManager.joinSession(code, socket.id, {
          passcode,
          user: sessionManager.getUserBySocketId(socket.id),
        })

        if (session.controllerUser?.id) {
          void addRecentConnection(session.controllerUser.id, {
            code: session.sessionCode,
            targetUserId: session.controlledUser?.id || null,
            targetName: session.controlledUser?.name || '未命名设备',
            targetEmail: session.controlledUser?.email || '',
            requireAuth: Boolean(session.requireAuth),
          }).catch((error) => {
            logger.warn(`Failed to save recent connection for ${session.controllerUser.id}: ${error.message}`)
          })
        }

        emitState(session)
        io.to(session.controllerSocketId).emit(SERVER_EVENTS.SESSION_ACCEPTED, {
          code: session.sessionCode,
          controlledId: session.controlledSocketId,
        })
        io.to(session.controlledSocketId).emit(SERVER_EVENTS.PEER_CONNECTED, {
          peerId: session.controllerSocketId,
        })
        io.to(session.controllerSocketId).emit(SERVER_EVENTS.PEER_CONNECTED, {
          peerId: session.controlledSocketId,
        })
        callback(successResponse({ code: session.sessionCode }))
      } catch (error) {
        logger.warn(`Failed to join session ${code} by ${socket.id}: ${error.code || error.message}`)
        callback(errorResponse(error.code || ERROR_CODES.UNKNOWN_ERROR, error.message))
      }
    })

    socket.on(CLIENT_EVENTS.SESSION_ACCEPT, ({ code }, callback = () => {}) => {
      try {
        const session = sessionManager.acceptSession(code)
        emitState(session)
        io.to(session.controllerSocketId).emit(SERVER_EVENTS.SESSION_ACCEPTED, {
          code: session.sessionCode,
          controlledId: session.controlledSocketId,
        })
        io.to(session.controlledSocketId).emit(SERVER_EVENTS.PEER_CONNECTED, {
          peerId: session.controllerSocketId,
        })
        io.to(session.controllerSocketId).emit(SERVER_EVENTS.PEER_CONNECTED, {
          peerId: session.controlledSocketId,
        })
        callback(successResponse({ code: session.sessionCode }))
      } catch (error) {
        logger.warn(`Failed to accept session ${code}: ${error.code || error.message}`)
        callback(errorResponse(error.code || ERROR_CODES.UNKNOWN_ERROR, error.message))
      }
    })

    socket.on(CLIENT_EVENTS.SESSION_REJECT, ({ code }, callback = () => {}) => {
      try {
        const { session, controllerSocketId } = sessionManager.rejectSession(code)
        emitState(session)
        if (controllerSocketId) {
          io.to(controllerSocketId).emit(SERVER_EVENTS.SESSION_REJECTED, {
            code,
            reason: '受控端拒绝了连接请求。',
          })
        }
        callback(successResponse({ code }))
      } catch (error) {
        callback(errorResponse(error.code || ERROR_CODES.UNKNOWN_ERROR, error.message))
      }
    })

    socket.on(CLIENT_EVENTS.USER_SYNC, ({ user, passcode, accessPolicy } = {}, callback = () => {}) => {
      try {
        const result = sessionManager.syncUser(socket.id, user)
        if (result.user?.id && result.user.id !== authenticatedUserId) {
          if (authenticatedUserId) {
            markUserOffline(authenticatedUserId)
          }
          authenticatedUserId = result.user.id
          markUserOnline(authenticatedUserId)
        }
        const code = sessionManager.getCodeBySocketId(socket.id)

        if (code && (passcode || accessPolicy)) {
          sessionManager.updateSessionOptions(code, socket.id, {
            passcode,
            accessPolicy,
          })
        }

        const session = code ? sessionManager.getSession(code) : result.session
        if (session) {
          emitState(session)
        }

        socket.emit(SERVER_EVENTS.USER_SYNCED, {
          user: result.user,
        })
        callback(successResponse({ user: result.user }))
      } catch (error) {
        callback(errorResponse(error.code || ERROR_CODES.UNKNOWN_ERROR, error.message))
      }
    })

    socket.on(CLIENT_EVENTS.SESSION_LEAVE, ({ code } = {}) => {
      const result = sessionManager.leaveSession(code, socket.id)
      if (!result) {
        return
      }

      if (result.session) {
        emitState(result.session)
      }

      if (result.peerSocketId) {
        io.to(result.peerSocketId).emit(SERVER_EVENTS.SESSION_ENDED, {
          code,
          by: socket.id,
        })
        io.to(result.peerSocketId).emit(SERVER_EVENTS.PEER_DISCONNECTED, {
          code,
          by: socket.id,
        })
      }
    })

    socket.on(CLIENT_EVENTS.WEBRTC_SIGNAL, ({ targetId, signal }, callback = () => {}) => {
      try {
        const code = sessionManager.getCodeBySocketId(socket.id)
        const peerSocketId = targetId || sessionManager.getPeerSocketId(code, socket.id)
        if (!peerSocketId) {
          callback(errorResponse(ERROR_CODES.SESSION_NOT_READY))
          return
        }

        io.to(peerSocketId).emit(SERVER_EVENTS.WEBRTC_SIGNAL, {
          code,
          senderId: socket.id,
          signal,
        })

        const session = sessionManager.getSession(code)
        if (session?.status === SESSION_STATES.CONNECTING) {
          sessionManager.markConnected(code)
          emitState(sessionManager.getSession(code))
        }

        callback(successResponse())
      } catch (error) {
        callback(errorResponse(error.code || ERROR_CODES.UNKNOWN_ERROR, error.message))
      }
    })

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.id}`)
      if (authenticatedUserId) {
        markUserOffline(authenticatedUserId)
      }
      const result = sessionManager.handleDisconnect(socket.id)

      if (!result) {
        return
      }

      if (result.session) {
        emitState(result.session)
      }

      if (result.peerSocketId) {
        io.to(result.peerSocketId).emit(SERVER_EVENTS.PEER_DISCONNECTED, {
          by: socket.id,
          code: result.session?.sessionCode || result.sessionCode,
        })

        io.to(result.peerSocketId).emit(SERVER_EVENTS.SESSION_ENDED, {
          by: socket.id,
          code: result.session?.sessionCode || result.sessionCode,
        })
      }
    })

    socket.on('error', (error) => {
      logger.error(`Socket error from ${socket.id}: ${error.message}`)
      emitError(socket, {
        code: ERROR_CODES.UNKNOWN_ERROR,
        message: error.message || '连接异常',
      })
    })
  })
}
