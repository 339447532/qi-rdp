import { SERVER_EVENTS } from './protocol';

class SessionEventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  removeAllListeners() {
    this.listeners.clear();
  }
}

// Singleton instance for session events
export const sessionEvents = new SessionEventEmitter();

// Helper to attach socket listeners to session events
export function bindSocketToSessionEvents(socket) {
  const handlers = {
    [SERVER_EVENTS.SESSION_STATE]: (data) => sessionEvents.emit(SERVER_EVENTS.SESSION_STATE, data),
    [SERVER_EVENTS.SESSION_REQUEST]: (data) => sessionEvents.emit(SERVER_EVENTS.SESSION_REQUEST, data),
    [SERVER_EVENTS.SESSION_ACCEPTED]: (data) => sessionEvents.emit(SERVER_EVENTS.SESSION_ACCEPTED, data),
    [SERVER_EVENTS.SESSION_REJECTED]: (data) => sessionEvents.emit(SERVER_EVENTS.SESSION_REJECTED, data),
    [SERVER_EVENTS.SESSION_ENDED]: (data) => sessionEvents.emit(SERVER_EVENTS.SESSION_ENDED, data),
    [SERVER_EVENTS.SESSION_ERROR]: (data) => sessionEvents.emit(SERVER_EVENTS.SESSION_ERROR, data),
    [SERVER_EVENTS.PEER_CONNECTED]: (data) => sessionEvents.emit(SERVER_EVENTS.PEER_CONNECTED, data),
    [SERVER_EVENTS.PEER_DISCONNECTED]: (data) => sessionEvents.emit(SERVER_EVENTS.PEER_DISCONNECTED, data),
    [SERVER_EVENTS.WEBRTC_SIGNAL]: (data) => sessionEvents.emit(SERVER_EVENTS.WEBRTC_SIGNAL, data),
    [SERVER_EVENTS.USER_SYNCED]: (data) => sessionEvents.emit(SERVER_EVENTS.USER_SYNCED, data),
  };

  // Attach all handlers
  Object.entries(handlers).forEach(([event, handler]) => {
    socket.on(event, handler);
  });

  // Return cleanup function
  return () => {
    Object.entries(handlers).forEach(([event, handler]) => {
      socket.off(event, handler);
    });
  };
}
