import { useCallback, useEffect, useRef, useState } from 'react'
import { commands, SYSTEM_COMMANDS } from '../lib/controlProtocol'
import { CONTROL_COMMANDS, ROLES, SESSION_STATES } from '../lib/protocol'
import { usePeerSession } from './usePeerSession'
import { useSessionState } from './useSessionState'
import { formatCode, unformatCode } from '../utils/code'
import {
  clearStoredAuth,
  fetchCurrentUser,
  loadStoredAuth,
  loginAccount,
  persistAuth,
  registerAccount,
  updateRecentConnectionFavorite,
} from '../lib/auth'
import { setSocketAuthToken, socket } from '../socket'

const FILE_CHUNK_SIZE = 48 * 1024
const FILE_CHUNK_DELAY = 8

function getButtonName(button = 0) {
  if (button === 1) return 'middle'
  if (button === 2) return 'right'
  return 'left'
}

function getVideoPointerPosition(event) {
  const video = event.currentTarget
  const rect = video.getBoundingClientRect()
  const pointerX = event.clientX - rect.left
  const pointerY = event.clientY - rect.top
  const elementRatio = rect.width / rect.height
  const videoRatio = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : elementRatio

  let renderWidth = rect.width
  let renderHeight = rect.height
  let offsetX = 0
  let offsetY = 0

  if (videoRatio > elementRatio) {
    renderHeight = rect.width / videoRatio
    offsetY = (rect.height - renderHeight) / 2
  } else {
    renderWidth = rect.height * videoRatio
    offsetX = (rect.width - renderWidth) / 2
  }

  const normalizedX = (pointerX - offsetX) / renderWidth
  const normalizedY = (pointerY - offsetY) / renderHeight

  if (normalizedX < 0 || normalizedX > 1 || normalizedY < 0 || normalizedY > 1) {
    return null
  }

  return { x: normalizedX, y: normalizedY }
}

async function getElectronDisplayInfo() {
  const fallback = {
    id: 'browser:screen',
    bounds: { x: 0, y: 0, width: window.screen.width, height: window.screen.height },
    scaleFactor: window.devicePixelRatio || 1,
    isPrimary: true,
  }

  if (!window.electron?.screen?.getPrimaryDisplay) {
    return fallback
  }

  const result = await window.electron.screen.getPrimaryDisplay()
  return result?.display || fallback
}

async function getScreenStream({ shareAudio }) {
  if (!window.electron?.screen?.getSources) {
    return navigator.mediaDevices.getDisplayMedia({ video: true, audio: shareAudio })
  }

  const sourcesResult = await window.electron.screen.getSources()
  const source = sourcesResult?.sources?.[0]
  if (!source) {
    throw new Error('未找到可用屏幕源')
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id,
      },
    },
  })

  if (!shareAudio || !navigator.mediaDevices?.getUserMedia) {
    return stream
  }

  try {
    const voiceStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    })

    voiceStream.getAudioTracks().forEach((track) => stream.addTrack(track))
  } catch {
    // Mic permissions may be denied; keep screen sharing working.
  }

  return stream
}

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return window.btoa(binary)
}

function createTransferId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function useRemoteControl() {
  const searchParams = new URLSearchParams(window.location.search)
  const windowMode = searchParams.get('window') || 'main'
  const autoConnectCode = searchParams.get('code') || ''
  const autoConnectPasscode = searchParams.get('passcode') || ''
  const autoConnectAudio = searchParams.get('audio') === '1'
  const isControllerWindow = windowMode === 'controller'
  const isOverlayWindow = windowMode === 'controlled-overlay'

  const [controlMode, setControlMode] = useState('desktop')
  const [remoteCode, setRemoteCode] = useState(() => formatCode(autoConnectCode))
  const [remoteCheckCode, setRemoteCheckCode] = useState(autoConnectPasscode)
  const [showLogin, setShowLogin] = useState(false)
  const [showPasscodeMenu, setShowPasscodeMenu] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [myPassword, setMyPassword] = useState('123456')
  const [passcodeType, setPasscodeType] = useState('single')
  const [requireAuth, setRequireAuth] = useState(false)
  const [shareAudio, setShareAudio] = useState(autoConnectCode ? autoConnectAudio : true)
  const [statusHint, setStatusHint] = useState('')
  const [remoteDisplay, setRemoteDisplay] = useState(null)
  const [localDisplay, setLocalDisplay] = useState(null)
  const [clipboardText, setClipboardText] = useState('')
  const [transferStatus, setTransferStatus] = useState('')
  const [authState, setAuthState] = useState(() => loadStoredAuth())
  const [currentUser, setCurrentUser] = useState(() => loadStoredAuth()?.user || {
    id: `guest-${Date.now()}`,
    name: '访客用户',
    email: '',
  })

  const videoRef = useRef(null)
  const session = useSessionState()
  const { hostCode, syncUser } = session
  const clipboardLoopGuardRef = useRef('')
  const incomingFilesRef = useRef(new Map())
  const autoConnectStartedRef = useRef(false)

  const peer = usePeerSession({
    onData: async (payload) => {
      if (payload.type === SYSTEM_COMMANDS.SCREEN_INFO) {
        setRemoteDisplay(payload.display || null)
        return
      }

      if (payload.type === SYSTEM_COMMANDS.SESSION_OPTIONS) {
        if (payload.options?.shareAudio !== undefined) {
          setStatusHint(payload.options.shareAudio ? '已启用语音通话' : '已关闭语音通话')
        }
        return
      }

      if (payload.type === CONTROL_COMMANDS.CLIPBOARD_SYNC) {
        const nextText = String(payload.text || '')
        clipboardLoopGuardRef.current = nextText
        setClipboardText(nextText)
        await window.electron?.clipboard?.writeText?.(nextText)
        return
      }

      if (payload.type === CONTROL_COMMANDS.FILE_TRANSFER_META) {
        incomingFilesRef.current.set(payload.transferId, {
          file: payload.file,
          chunks: [],
        })
        setTransferStatus(`正在接收 ${payload.file?.name || '文件'}...`)
        return
      }

      if (payload.type === CONTROL_COMMANDS.FILE_TRANSFER_CHUNK) {
        const entry = incomingFilesRef.current.get(payload.transferId)
        if (entry) {
          entry.chunks[payload.index] = payload.chunk
        }
        return
      }

      if (payload.type === CONTROL_COMMANDS.FILE_TRANSFER_COMPLETE) {
        const entry = incomingFilesRef.current.get(payload.transferId)
        if (!entry) return

        const receivedChunks = entry.chunks.filter(Boolean).length
        if (receivedChunks !== payload.totalChunks) {
          incomingFilesRef.current.delete(payload.transferId)
          setTransferStatus(`接收 ${entry.file?.name || '文件'} 失败，分片不完整`)
          return
        }

        const contentBase64 = entry.chunks.join('')
        const result = await window.electron?.file?.saveIncoming?.({
          name: entry.file?.name,
          contentBase64,
        })

        incomingFilesRef.current.delete(payload.transferId)
        setTransferStatus(
          result?.success
            ? `已保存文件到 ${result.path}`
            : result?.message || '文件保存失败',
        )
        return
      }

      const result = await window.electron?.control?.execute?.(payload)
      if (result?.success === false) {
        setStatusHint(result.message || '远程控制执行失败')
      }
    },
    onStream: (stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    },
    onConnected: async () => {
      session.setWebRTCConnected()
      setStatusHint('')

      if (session.role === ROLES.CONTROLLED) {
        const display = await getElectronDisplayInfo()
        setLocalDisplay(display)
        peer.sendData(commands.screenInfo(display))
        peer.sendData(commands.sessionOptions({ shareAudio }))
      }
    },
    onDisconnected: () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      setRemoteDisplay(null)
      setLocalDisplay(null)
      setTransferStatus('')
      setStatusHint('')
    },
    onError: (error) => {
      setStatusHint(error?.message || 'WebRTC 连接失败')
    },
  })

  useEffect(() => {
    if (isOverlayWindow) {
      return undefined
    }

    const token = authState?.token || ''
    setSocketAuthToken(token)
    if (!socket.connected) {
      return
    }

    socket.disconnect()
    socket.connect()
  }, [authState?.token, isOverlayWindow])

  useEffect(() => {
    if (isOverlayWindow) {
      return undefined
    }

    syncUser({
      user: currentUser,
      passcode: {
        strategy: passcodeType,
        value: myPassword,
      },
      accessPolicy: {
        requireAuth,
      },
    })
  }, [currentUser, hostCode, isOverlayWindow, myPassword, passcodeType, requireAuth, syncUser])

  useEffect(() => {
    if (isOverlayWindow) {
      return undefined
    }

    if (!authState?.token) {
      return undefined
    }

    let cancelled = false
    void (async () => {
      try {
        const response = await fetchCurrentUser(authState.token)
        if (cancelled) return
        setCurrentUser(response.user)
        persistAuth({ token: authState.token, user: response.user })
      } catch {
        if (cancelled) return
        clearStoredAuth()
        setAuthState(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authState?.token, isOverlayWindow])

  useEffect(() => {
    if (isOverlayWindow) {
      return undefined
    }

    if (!authState?.token) {
      return undefined
    }

    const timer = window.setInterval(async () => {
      try {
        const response = await fetchCurrentUser(authState.token)
        setCurrentUser(response.user)
        persistAuth({ token: authState.token, user: response.user })
      } catch {
        // Keep the last known profile and try again on next tick.
      }
    }, 15000)

    return () => window.clearInterval(timer)
  }, [authState?.token, isOverlayWindow])

  const stateLabels = {
    [SESSION_STATES.WAITING]: '等待伙伴连接',
    [SESSION_STATES.REQUESTING]: '等待受控端确认',
    [SESSION_STATES.PENDING_ACCEPT]: '收到连接请求，等待你的决定',
    [SESSION_STATES.CONNECTING]: '正在建立远程连接',
    [SESSION_STATES.CONNECTED]: '屏幕共享中',
    [SESSION_STATES.CONTROLLING]: '远程控制中',
    [SESSION_STATES.DISCONNECTED]: '连接已断开，可重新发起连接',
    [SESSION_STATES.ERROR]: session.error?.message || '发生错误',
  }
  const statusText = transferStatus || statusHint || stateLabels[session.state] || '等待连接'

  useEffect(() => {
    if (isOverlayWindow) {
      return undefined
    }

    if (session.state !== SESSION_STATES.CONNECTING || !session.remoteId) {
      return
    }

    if (session.role === ROLES.CONTROLLED) {
      let cancelled = false

      void (async () => {
        try {
          setStatusHint('')
          const [stream, display] = await Promise.all([
            getScreenStream({ shareAudio }),
            getElectronDisplayInfo(),
          ])
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop())
            return
          }

          setLocalDisplay(display)
          peer.initAsInitiator(stream, session.remoteId)
        } catch (error) {
          setStatusHint(error.message || '无法启动屏幕共享')
        }
      })()

      return () => {
        cancelled = true
      }
    }

    peer.initAsReceiver(session.remoteId)
    return undefined
  }, [isOverlayWindow, peer, session.remoteId, session.role, session.state, shareAudio])

  useEffect(() => {
    if (isOverlayWindow) {
      return undefined
    }

    if (
      (session.role !== ROLES.CONTROLLER && session.role !== ROLES.CONTROLLED) ||
      (session.state !== SESSION_STATES.CONTROLLING && session.state !== SESSION_STATES.CONNECTED)
    ) {
      return undefined
    }

    const timer = window.setInterval(async () => {
      const result = await window.electron?.clipboard?.readText?.()
      const text = result?.text || ''
      if (!text || text === clipboardLoopGuardRef.current || text === clipboardText) {
        return
      }

      clipboardLoopGuardRef.current = text
      setClipboardText(text)
      peer.sendData(commands.clipboardSync(text, session.role))
    }, 1200)

    return () => window.clearInterval(timer)
  }, [clipboardText, isOverlayWindow, peer, session.role, session.state])

  useEffect(() => {
    if (isOverlayWindow) {
      return undefined
    }

    if (session.role !== ROLES.CONTROLLER || session.state !== SESSION_STATES.CONTROLLING) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.repeat) return
      peer.sendData(commands.keyboardDown(event.key, event.code))
    }

    const handleKeyUp = (event) => {
      peer.sendData(commands.keyboardUp(event.key, event.code))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isOverlayWindow, peer, session.role, session.state])

  useEffect(() => {
    if (!isControllerWindow || autoConnectStartedRef.current || !autoConnectCode) {
      return
    }

    autoConnectStartedRef.current = true
    session.joinSession(autoConnectCode, autoConnectPasscode)
  }, [autoConnectAudio, autoConnectCode, autoConnectPasscode, isControllerWindow, session])

  useEffect(() => {
    if (!isControllerWindow) {
      return undefined
    }

    if (
      session.state === SESSION_STATES.CONNECTED ||
      session.state === SESSION_STATES.CONTROLLING
    ) {
      window.electron?.window?.showCurrent?.()
    }

    if (
      session.state === SESSION_STATES.DISCONNECTED ||
      session.state === SESSION_STATES.ERROR
    ) {
      window.electron?.window?.closeCurrent?.()
    }

    return undefined
  }, [isControllerWindow, session.state])

  const disconnect = useCallback(() => {
    peer.cleanup()
    session.leaveSession()
    session.resetForNextSession()
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setRemoteDisplay(null)
    setLocalDisplay(null)
    setTransferStatus('')
    setStatusHint('')
    window.electron?.window?.closeControlledOverlay?.()
  }, [peer, session])

  useEffect(() => {
    if (isOverlayWindow) {
      return undefined
    }

    const off = window.electron?.window?.onOverlayDisconnectRequest?.(() => {
      disconnect()
    })

    return () => off?.()
  }, [disconnect, isOverlayWindow])

  useEffect(() => {
    if (isOverlayWindow) {
      return undefined
    }

    const shouldShowOverlay =
      session.role === ROLES.CONTROLLED &&
      (session.state === SESSION_STATES.CONNECTED || session.state === SESSION_STATES.CONTROLLING)

    if (!shouldShowOverlay) {
      window.electron?.window?.closeControlledOverlay?.()
      return undefined
    }

    window.electron?.window?.updateControlledOverlay?.({
      collapsed: false,
      statusText,
      currentUser: session.sessionMeta?.controlledUser?.name || currentUser?.name || '访客用户',
      displayText: `${localDisplay?.bounds?.width || '--'} × ${localDisplay?.bounds?.height || '--'}`,
    })

    return undefined
  }, [
    currentUser?.name,
    isOverlayWindow,
    localDisplay?.bounds?.height,
    localDisplay?.bounds?.width,
    session.role,
    session.sessionMeta?.controlledUser?.name,
    session.state,
    statusText,
  ])

  const handleRemoteCodeChange = (event) => {
    const digitsOnly = event.target.value.replace(/\D/g, '')
    setRemoteCode(formatCode(digitsOnly))
  }

  const selectRecentConnection = (connection) => {
    if (!connection?.code) {
      return
    }

    setRemoteCode(formatCode(connection.code))
    setStatusHint(`已填入 ${connection.targetName || '最近连接'} 的连接码`)
  }

  const toggleFavoriteConnection = async (connection) => {
    if (!authState?.token || !connection?.targetUserId) {
      return
    }

    try {
      const response = await updateRecentConnectionFavorite(
        authState.token,
        connection.targetUserId,
        !connection.favorite,
      )
      setCurrentUser(response.user)
      persistAuth({ token: authState.token, user: response.user })
      setStatusHint(connection.favorite ? '已取消收藏设备' : '已收藏设备')
    } catch (error) {
      setStatusHint(error.message || '更新收藏状态失败')
    }
  }

  const copyMyCode = () => navigator.clipboard.writeText(unformatCode(session.hostCode || ''))

  const startConnection = () => {
    const rawCode = unformatCode(remoteCode)
    if (!rawCode) return

    if (windowMode === 'main') {
      window.electron?.window?.openController?.({
        code: rawCode,
        passcode: remoteCheckCode,
        shareAudio,
      })
      setStatusHint(`已发起到 ${formatCode(rawCode)} 的连接请求，等待受控端确认`)
      return
    }

    session.joinSession(rawCode, remoteCheckCode)
    setStatusHint('')
  }

  const sendPointerMove = (event) => {
    const position = getVideoPointerPosition(event)
    if (!position) return
    peer.sendData(commands.mouseMove(position.x, position.y))
  }

  const handleMouseDown = (event) => {
    event.preventDefault()
    const position = getVideoPointerPosition(event)
    if (!position) return

    peer.sendData(commands.mouseMove(position.x, position.y))
    peer.sendData(commands.mouseDown(getButtonName(event.button)))
  }

  const handleMouseUp = (event) => {
    event.preventDefault()
    const position = getVideoPointerPosition(event)
    if (!position) return

    peer.sendData(commands.mouseMove(position.x, position.y))
    peer.sendData(commands.mouseUp(getButtonName(event.button)))
  }

  const handleWheel = (event) => {
    event.preventDefault()
    peer.sendData(commands.mouseWheel(Math.round(event.deltaX), Math.round(event.deltaY)))
  }

  const handleLogin = async ({ mode, name, email, password }) => {
    try {
      const response =
        mode === 'register'
          ? await registerAccount({ name, email, password })
          : await loginAccount({ email, password })

      const nextAuth = { token: response.token, user: response.user }
      persistAuth(nextAuth)
      setAuthState(nextAuth)
      setCurrentUser(response.user)
      setStatusHint(`已登录为 ${response.user.name}`)
      setShowLogin(false)
    } catch (error) {
      setStatusHint(error.message || '登录失败')
    }
  }

  const handleLogout = () => {
    clearStoredAuth()
    setAuthState(null)
    const nextUser = {
      id: `guest-${Date.now()}`,
      name: '访客用户',
      email: '',
    }
    setCurrentUser(nextUser)
    setStatusHint('已退出登录')
  }

  const handleSendClipboard = async () => {
    const result = await window.electron?.clipboard?.readText?.()
    const text = result?.text || ''
    if (!text) {
      setStatusHint('当前剪贴板为空')
      return
    }

    setClipboardText(text)
    clipboardLoopGuardRef.current = text
    peer.sendData(commands.clipboardSync(text, session.role))
    setStatusHint('已发送剪贴板内容')
  }

  const handleSendFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const transferId = createTransferId()
    const base64 = await fileToBase64(file)
    const totalChunks = Math.ceil(base64.length / FILE_CHUNK_SIZE)

    peer.sendData(commands.fileTransferMeta(transferId, {
      name: file.name,
      size: file.size,
      type: file.type,
    }))

    setTransferStatus(`正在发送 ${file.name}...`)

    for (let index = 0; index < totalChunks; index += 1) {
      const chunk = base64.slice(index * FILE_CHUNK_SIZE, (index + 1) * FILE_CHUNK_SIZE)
      peer.sendData(commands.fileTransferChunk(transferId, chunk, index))
      if (index < totalChunks - 1) {
        await wait(FILE_CHUNK_DELAY)
      }
    }

    peer.sendData(commands.fileTransferComplete(transferId, totalChunks))
    setTransferStatus(`已发送 ${file.name}`)
  }

  return {
    ...session,
    windowMode,
    isControllerWindow,
    isOverlayWindow,
    controlMode,
    remoteCode,
    remoteCheckCode,
    showLogin,
    showPasscodeMenu,
    showPassword,
    myPassword,
    passcodeType,
    shareAudio,
    requireAuth,
    currentUser,
    isAuthenticated: Boolean(authState?.token),
    recentConnections: [...(currentUser?.recentConnections || [])].sort((a, b) => {
      if (a.favorite !== b.favorite) {
        return a.favorite ? -1 : 1
      }

      return new Date(b.lastConnectedAt || 0).getTime() - new Date(a.lastConnectedAt || 0).getTime()
    }),
    clipboardText,
    transferStatus,
    myCode: formatCode(session.hostCode || ''),
    statusText,
    videoRef,
    localDisplay,
    remoteDisplay,
    copyMyCode,
    disconnect,
    handleLogin,
    handleLogout,
    handleMouseDown,
    handleMouseMove: sendPointerMove,
    handleMouseUp,
    handleRemoteCodeChange,
    selectRecentConnection,
    toggleFavoriteConnection,
    handleSendClipboard,
    handleSendFile,
    handleWheel,
    setControlMode,
    setRemoteCheckCode,
    setShareAudio,
    setShowLogin,
    setShowPasscodeMenu,
    setShowPassword,
    setMyPassword,
    setPasscodeType,
    setRequireAuth,
    startConnection,
    acceptIncomingRequest: session.acceptSession,
    rejectIncomingRequest: session.rejectSession,
  }
}
