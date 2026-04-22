const ROLES = {
  CONTROLLED: 'controlled',
  CONTROLLER: 'controller',
}

const SESSION_STATES = {
  IDLE: 'idle',
  WAITING: 'waiting',
  REQUESTING: 'requesting',
  PENDING_ACCEPT: 'pending_accept',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  CONTROLLING: 'controlling',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
}

const CLIENT_EVENTS = {
  SESSION_CREATE: 'session:create',
  SESSION_JOIN: 'session:join',
  SESSION_ACCEPT: 'session:accept',
  SESSION_REJECT: 'session:reject',
  SESSION_LEAVE: 'session:leave',
  WEBRTC_SIGNAL: 'webrtc:signal',
  USER_SYNC: 'user:sync',
}

const SERVER_EVENTS = {
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
}

module.exports = {
  ROLES,
  SESSION_STATES,
  CLIENT_EVENTS,
  SERVER_EVENTS,
}
