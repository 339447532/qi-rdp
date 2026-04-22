# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Qi RDP is a cross-platform remote desktop system with two components:
- **Server** (`server/`): Signaling server using Node.js + Express + Socket.io
- **Client** (`client/`): Desktop application using Electron + React + Vite

## Commands

### Server
```bash
cd server
npm install
npm start          # Production
npm run dev        # Development with nodemon
```

### Client
```bash
cd client
npm install
npm run dev        # Development (Vite + Electron concurrently)
npm run build      # Production build (Vite + electron-builder)
npm run lint        # ESLint
```

### Rebuild Native Modules
If `robotjs` fails to load, rebuild it:
```bash
cd client
npx electron-rebuild -f -w robotjs
```

## Architecture

### Signaling Server (`server/src/`)
- `index.js`: Express server with Socket.io, CORS, Winston logging
- `socket/index.js`: Socket.io handler managing sessions and WebRTC signaling

**Session Model**: 6-digit code → `{ controlledId, controllerId }`
- `create-session`: Controlled side generates a code
- `join-session`: Controller side joins using the code
- `signal`: Relays WebRTC signaling data between peers

### Client Architecture
```
client/
├── electron/
│   ├── main.cjs        # Electron main process (robotjs control, screen capture)
│   └── preload.cjs     # Context bridge for IPC
├── src/
│   ├── socket.js       # Socket.io client singleton
│   ├── hooks/
│   │   └── useRemoteControl.js  # Core WebRTC + control logic
│   ├── pages/
│   │   ├── DashboardPage.jsx     # Main UI (code display/entry)
│   │   └── RemoteSessionPage.jsx # Active remote session view
│   └── components/     # UI components
```

### WebRTC Flow
1. Controlled side calls `create-session`, gets 6-digit code
2. Controller side calls `join-session` with code
3. Server notifies controlled side via `controller-connected`
4. Controlled side creates SimplePeer (initiator=true) with screen stream
5. Controller side creates SimplePeer (initiator=false), receives stream
6. Mouse/keyboard data sent via SimplePeer `data` channel
7. Main process executes control via `robotjs`

### IPC Channels (Electron)
- `get-screen-sources`: Returns available screens for capture
- `remote-control`: Sends mouse/keyboard commands to robotjs

### Dependencies
- **WebRTC**: `simple-peer`
- **Remote Control**: `robotjs` (native, runs in Electron main process)
- **Signaling**: `socket.io` (client) / `socket.io` (server)
- **Build**: `electron-builder` for packaging

## Notes
- robotjs requires native compilation; macOS needs Xcode Command Line Tools
- Electron uses context isolation with preload script for security
- Vite dev server runs on port 5173, Electron loads it in development
