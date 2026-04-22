import { useCallback, useEffect, useRef, useState } from 'react'
import { socket } from '../socket'
import { ERROR_CODES, ERROR_MESSAGES, CLIENT_EVENTS, SERVER_EVENTS, SESSION_STATES, ROLES } from '../lib/protocol'
import { bindSocketToSessionEvents, sessionEvents } from '../lib/sessionEvents'

function mapError(error) {
  if (!error) {
    return null
  }

  const code = error.code || ERROR_CODES.UNKNOWN_ERROR
  return {
    code,
    message: error.message || ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR,
  }
}

export function useSessionState(options = {}) {
  const { autoCreateHostSession = true } = options
  const [state, setState] = useState(SESSION_STATES.IDLE)
  const [role, setRole] = useState(null)
  const [hostCode, setHostCode] = useState('')
  const [activeCode, setActiveCode] = useState('')
  const [remoteId, setRemoteId] = useState(null)
  const [error, setError] = useState(null)
  const [incomingRequest, setIncomingRequest] = useState(null)
  const [sessionMeta, setSessionMeta] = useState(null)
  const cleanupRef = useRef(null)
  const hasCreatedSessionRef = useRef(false)

  const createHostSession = useCallback(() => {
    if (hasCreatedSessionRef.current) {
      return
    }

    hasCreatedSessionRef.current = true
    socket.emit(CLIENT_EVENTS.SESSION_CREATE, (response) => {
      if (response?.success && response.code) {
        setHostCode(response.code)
        setActiveCode(response.code)
        setRole(ROLES.CONTROLLED)
        setState(SESSION_STATES.WAITING)
        setError(null)
      } else {
        hasCreatedSessionRef.current = false
        setError(mapError(response?.error))
        setState(SESSION_STATES.ERROR)
      }
    })
  }, [])

  useEffect(() => {
    const handleConnect = () => {
      if (autoCreateHostSession) {
        createHostSession()
      }
    }

    const handleDisconnect = () => {
      hasCreatedSessionRef.current = false
      setState((previous) => (previous === SESSION_STATES.IDLE ? previous : SESSION_STATES.DISCONNECTED))
    }

    const handleConnectError = (connectError) => {
      hasCreatedSessionRef.current = false
      setError(mapError({
        code: ERROR_CODES.CONNECTION_FAILED,
        message: connectError?.message || ERROR_MESSAGES[ERROR_CODES.CONNECTION_FAILED],
      }))
      setState(SESSION_STATES.ERROR)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    cleanupRef.current = bindSocketToSessionEvents(socket)
    socket.connect()

    if (socket.connected) {
      handleConnect()
    }

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      cleanupRef.current?.()
      sessionEvents.removeAllListeners()
      socket.disconnect()
    }
  }, [autoCreateHostSession, createHostSession])

  useEffect(() => {
    const offState = sessionEvents.on(SERVER_EVENTS.SESSION_STATE, ({ code: nextCode, role: nextRole, state: nextState, session: nextSession }) => {
      if (nextCode && nextRole === ROLES.CONTROLLED) {
        setHostCode(nextCode)
      }
      if (nextCode) {
        setActiveCode(nextCode)
      }
      if (nextRole) {
        setRole(nextRole)
      }
      if (nextState) {
        setState(nextState)
      }
      if (nextSession) {
        setSessionMeta(nextSession)
      }
    })

    const offRequest = sessionEvents.on(SERVER_EVENTS.SESSION_REQUEST, (payload) => {
      setIncomingRequest(payload)
      setRole(ROLES.CONTROLLED)
      setState(SESSION_STATES.PENDING_ACCEPT)
      setError(null)
    })

    const offAccepted = sessionEvents.on(SERVER_EVENTS.SESSION_ACCEPTED, ({ controlledId, code: nextCode }) => {
      if (nextCode) {
        setActiveCode(nextCode)
      }
      if (controlledId) {
        setRemoteId(controlledId)
      }
      setState(SESSION_STATES.CONNECTING)
      setError(null)
    })

    const offRejected = sessionEvents.on(SERVER_EVENTS.SESSION_REJECTED, (payload) => {
      setIncomingRequest(null)
      setRemoteId(null)
      setError(mapError({ code: ERROR_CODES.ACCESS_DENIED, message: payload?.reason }))
      setState(SESSION_STATES.ERROR)
    })

    const offEnded = sessionEvents.on(SERVER_EVENTS.SESSION_ENDED, () => {
      setIncomingRequest(null)
      setRemoteId(null)
      setSessionMeta(null)
      setState(SESSION_STATES.DISCONNECTED)
    })

    const offPeerConnected = sessionEvents.on(SERVER_EVENTS.PEER_CONNECTED, ({ peerId }) => {
      if (peerId) {
        setRemoteId(peerId)
      }
    })

    const offPeerDisconnected = sessionEvents.on(SERVER_EVENTS.PEER_DISCONNECTED, () => {
      setIncomingRequest(null)
      setRemoteId(null)
      setSessionMeta(null)
      setState(SESSION_STATES.DISCONNECTED)
    })

    const offError = sessionEvents.on(SERVER_EVENTS.SESSION_ERROR, (payload) => {
      setError(mapError(payload))
      setState(SESSION_STATES.ERROR)
    })

    return () => {
      offState()
      offRequest()
      offAccepted()
      offRejected()
      offEnded()
      offPeerConnected()
      offPeerDisconnected()
      offError()
    }
  }, [])

  const joinSession = useCallback((targetCode, passcode = '') => {
    if (!targetCode) {
      return
    }

    setError(null)
    setRole(ROLES.CONTROLLER)
    socket.emit(CLIENT_EVENTS.SESSION_JOIN, { code: targetCode, passcode }, (response) => {
      if (response?.success) {
        setActiveCode(targetCode)
        setState(SESSION_STATES.REQUESTING)
        return
      }

      setError(mapError(response?.error))
      setState(SESSION_STATES.ERROR)
    })
  }, [])

  const acceptSession = useCallback(() => {
    if (!hostCode) return

    socket.emit(CLIENT_EVENTS.SESSION_ACCEPT, { code: hostCode }, (response) => {
      if (!response?.success) {
        setError(mapError(response?.error))
        setState(SESSION_STATES.ERROR)
      }
    })
  }, [hostCode])

  const rejectSession = useCallback(() => {
    if (!hostCode) return

    socket.emit(CLIENT_EVENTS.SESSION_REJECT, { code: hostCode }, () => {
      setIncomingRequest(null)
      setState(SESSION_STATES.WAITING)
    })
  }, [hostCode])

  const leaveSession = useCallback(() => {
    if (activeCode) {
      socket.emit(CLIENT_EVENTS.SESSION_LEAVE, { code: activeCode })
    }

    setIncomingRequest(null)
    setRemoteId(null)
    setSessionMeta(null)
    setError(null)
    setState(SESSION_STATES.DISCONNECTED)
  }, [activeCode])

  const resetForNextSession = useCallback(() => {
    hasCreatedSessionRef.current = false
    setIncomingRequest(null)
    setRemoteId(null)
    setSessionMeta(null)
    setError(null)
    if (autoCreateHostSession) {
      createHostSession()
    } else {
      setState(SESSION_STATES.IDLE)
      setRole(null)
      setHostCode('')
      setActiveCode('')
    }
  }, [autoCreateHostSession, createHostSession])

  const syncUser = useCallback((payload) => {
    socket.emit(CLIENT_EVENTS.USER_SYNC, payload, (response) => {
      if (!response?.success) {
        setError(mapError(response?.error))
      }
    })
  }, [])

  const setWebRTCConnected = useCallback(() => {
    setState((previous) => {
      if (role === ROLES.CONTROLLER) {
        return SESSION_STATES.CONTROLLING
      }

      if (previous === SESSION_STATES.PENDING_ACCEPT) {
        return previous
      }

      return SESSION_STATES.CONNECTED
    })
  }, [role])

  return {
    state,
    role,
    code: activeCode,
    hostCode,
    remoteId,
    error,
    incomingRequest,
    sessionMeta,
    joinSession,
    acceptSession,
    rejectSession,
    leaveSession,
    resetForNextSession,
    setWebRTCConnected,
    syncUser,
  }
}
