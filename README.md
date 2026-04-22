# Qi RDP - Cross-Platform Remote Desktop System

## Project Structure
- `server/`: Signaling Server (Node.js + Socket.io)
- `client/`: Client Application (Electron + React + Vite)

## Prerequisites
- Node.js (v16+)
- Python (for building native modules like robotjs)
- Xcode Command Line Tools (macOS) or Build Tools (Windows)

## Setup & Run

### 1. Start Signaling Server
```bash
cd server
npm install
npm start
```
Server will run on `http://localhost:3000`.

### 2. Start Client (Electron App)
```bash
cd client
npm install
# Rebuild native modules (robotjs) for Electron
npm run rebuild # (If script added, otherwise use npx electron-rebuild -f -w robotjs)
npm run dev
```
This will launch the Electron application.

## Features Implemented (MVP Phase 1)
- **Signaling Server**: Manages connection codes and WebRTC signaling.
- **Screen Sharing**: High-performance P2P screen sharing using WebRTC.
- **Remote Control**: Mouse and keyboard control support (using `robotjs`).
- **Connection Code**: Generate and enter 6-digit codes to connect.

## Notes
- `robotjs` requires native compilation. If you encounter errors, ensure you have build tools installed and run `npx electron-rebuild -f -w robotjs` inside `client` directory.
- The app uses `simple-peer` for WebRTC.
