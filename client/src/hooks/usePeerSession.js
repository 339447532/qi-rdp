import { useCallback, useEffect, useRef } from 'react'
import SimplePeer from 'simple-peer'
import { socket } from '../socket'
import { CLIENT_EVENTS, SERVER_EVENTS } from '../lib/protocol'
import { decodeCommand } from '../lib/controlProtocol'
import { sessionEvents } from '../lib/sessionEvents'

function getIceServers() {
  const fallback = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ]
  const raw = import.meta.env.VITE_ICE_SERVERS

  if (!raw) {
    return fallback
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback
  } catch {
    return fallback
  }
}

function attachPeerHandlers(peer, handlers) {
  peer.on('signal', handlers.onSignal)
  peer.on('connect', handlers.onConnect)
  peer.on('data', handlers.onData)
  peer.on('stream', handlers.onStream)
  peer.on('close', handlers.onClose)
  peer.on('error', handlers.onError)
}

export function usePeerSession({ onData, onStream, onConnected, onDisconnected, onError }) {
  const peerRef = useRef(null)
  const streamRef = useRef(null)
  const remoteIdRef = useRef(null)
  const callbacksRef = useRef({ onData, onStream, onConnected, onDisconnected, onError })

  useEffect(() => {
    callbacksRef.current = { onData, onStream, onConnected, onDisconnected, onError }
  }, [onData, onStream, onConnected, onDisconnected, onError])

  const cleanup = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    remoteIdRef.current = null
  }, [])

  useEffect(() => {
    const offSignal = sessionEvents.on(SERVER_EVENTS.WEBRTC_SIGNAL, ({ senderId, signal }) => {
      remoteIdRef.current = senderId
      peerRef.current?.signal(signal)
    })

    const offPeerConnected = sessionEvents.on(SERVER_EVENTS.PEER_CONNECTED, ({ peerId }) => {
      remoteIdRef.current = peerId
    })

    const offPeerDisconnected = sessionEvents.on(SERVER_EVENTS.PEER_DISCONNECTED, () => {
      cleanup()
      callbacksRef.current.onDisconnected?.()
    })

    return () => {
      offSignal()
      offPeerConnected()
      offPeerDisconnected()
    }
  }, [cleanup])

  const sendSignal = useCallback((signal) => {
    if (!peerRef.current) return

    socket.emit(CLIENT_EVENTS.WEBRTC_SIGNAL, {
      targetId: remoteIdRef.current,
      signal,
    })
  }, [])

  const buildHandlers = useCallback(() => ({
    onSignal: sendSignal,
    onConnect: () => callbacksRef.current.onConnected?.(),
    onData: (raw) => {
      const payload = decodeCommand(raw.toString())
      if (payload) {
        callbacksRef.current.onData?.(payload)
      }
    },
    onStream: (stream) => callbacksRef.current.onStream?.(stream),
    onClose: () => callbacksRef.current.onDisconnected?.(),
    onError: (error) => callbacksRef.current.onError?.(error),
  }), [sendSignal])

  const initAsInitiator = useCallback((stream, remotePeerId) => {
    cleanup()
    streamRef.current = stream
    remoteIdRef.current = remotePeerId

    const peer = new SimplePeer({
      initiator: true,
      trickle: true,
      stream,
      config: { iceServers: getIceServers() },
    })

    attachPeerHandlers(peer, buildHandlers())
    peerRef.current = peer
  }, [buildHandlers, cleanup])

  const initAsReceiver = useCallback((remotePeerId) => {
    cleanup()
    remoteIdRef.current = remotePeerId

    const peer = new SimplePeer({
      initiator: false,
      trickle: true,
      config: { iceServers: getIceServers() },
    })

    attachPeerHandlers(peer, buildHandlers())
    peerRef.current = peer
  }, [buildHandlers, cleanup])

  const sendData = useCallback((data) => {
    if (peerRef.current?.connected) {
      peerRef.current.send(data)
    }
  }, [])

  useEffect(() => cleanup, [cleanup])

  return {
    peerRef,
    cleanup,
    initAsInitiator,
    initAsReceiver,
    sendData,
  }
}
