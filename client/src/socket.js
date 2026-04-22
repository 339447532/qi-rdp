import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SIGNAL_SERVER_URL || 'http://localhost:3000';

export const socket = io(SERVER_URL, {
  autoConnect: false,
  auth: {},
});

export function setSocketAuthToken(token) {
  socket.auth = token ? { token } : {};
}
