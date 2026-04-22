const { app, BrowserWindow, clipboard, desktopCapturer, dialog, ipcMain, screen, shell, systemPreferences } = require('electron')
const fs = require('fs/promises')
const path = require('path')

let robot
let robotLoadError = null
let mainWindow = null
let controllerWindow = null
let controlledOverlayWindow = null
let controllerWindowAllowClose = false

function getRendererUrl(search = '') {
  const normalizedSearch = search ? `?${search}` : ''
  if (process.env.NODE_ENV === 'development') {
    return `http://localhost:5173/${normalizedSearch}`
  }

  return path.join(__dirname, `../dist/index.html${normalizedSearch}`)
}

function tryRequire(modulePath) {
  try {
    return require(modulePath)
  } catch (error) {
    robotLoadError = error
    return null
  }
}

function loadRobot() {
  const candidates = [
    'robotjs',
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'node_modules', 'robotjs'),
    path.join(__dirname, '..', 'node_modules', 'robotjs'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    const loaded = tryRequire(candidate)
    if (loaded) {
      return loaded
    }
  }

  return null
}

robot = loadRobot()

if (!robot) {
  console.error('Failed to load robotjs in Main Process:', robotLoadError)
}

function getRobotUnavailableMessage() {
  if (process.platform === 'win32') {
    return 'Windows 未能加载 robotjs。请在 client 目录执行 npm install 后运行 npm run rebuild；如果仍失败，请安装 Visual Studio Build Tools（Desktop development with C++）。'
  }

  if (process.platform === 'darwin') {
    return '当前环境未能加载 robotjs，请在 client 目录执行 npm install 后运行 npm run rebuild。'
  }

  return '当前环境未能加载 robotjs，请在 client 目录执行 npm install 后运行 npm run rebuild。'
}

function logInfo(message, payload) {
  console.log(`[electron] ${message}`, payload || '')
}

function logError(message, error) {
  console.error(`[electron] ${message}`, error)
}

function loadRenderer(win, search = '') {
  if (process.env.NODE_ENV === 'development') {
    return win.loadURL(getRendererUrl(search))
  }

  return win.loadFile(path.join(__dirname, '../dist/index.html'), { search })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1080,
    minHeight: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  loadRenderer(win)

  return win
}

function positionControlledOverlay(win) {
  const display = screen.getPrimaryDisplay()
  const workArea = display.workArea
  const [width, height] = win.getSize()
  const x = Math.round(workArea.x + workArea.width - width - 18)
  const y = Math.round(workArea.y + workArea.height - height - 18)
  win.setPosition(x, y)
}

function createControllerWindow(payload = {}) {
  if (controllerWindow && !controllerWindow.isDestroyed()) {
    controllerWindow.focus()
    return controllerWindow
  }

  const search = new URLSearchParams({
    window: 'controller',
    code: payload.code || '',
    passcode: payload.passcode || '',
    audio: payload.shareAudio ? '1' : '0',
  }).toString()

  controllerWindow = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 920,
    minHeight: 600,
    autoHideMenuBar: true,
    show: false,
    title: 'Qi RDP 控制窗口',
    backgroundColor: '#090b11',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  controllerWindow.on('close', async (event) => {
    if (controllerWindowAllowClose) {
      return
    }

    if (!controllerWindow?.isVisible()) {
      controllerWindowAllowClose = true
      return
    }

    event.preventDefault()
    const focusedWindow = controllerWindow
    const { response } = await dialog.showMessageBox(focusedWindow, {
      type: 'question',
      buttons: ['取消', '断开连接并关闭'],
      defaultId: 1,
      cancelId: 0,
      title: '断开远程连接',
      message: '关闭控制窗口会断开当前远程连接，是否继续？',
    })

    if (response === 0) {
      return
    }

    controllerWindowAllowClose = true
    focusedWindow?.close()
  })

  controllerWindow.on('closed', () => {
    controllerWindow = null
    controllerWindowAllowClose = false
  })

  loadRenderer(controllerWindow, search)
  return controllerWindow
}

function createControlledOverlayWindow() {
  if (controlledOverlayWindow && !controlledOverlayWindow.isDestroyed()) {
    controlledOverlayWindow.show()
    controlledOverlayWindow.focus()
    positionControlledOverlay(controlledOverlayWindow)
    return controlledOverlayWindow
  }

  controlledOverlayWindow = new BrowserWindow({
    width: 280,
    height: 112,
    minWidth: 220,
    minHeight: 64,
    maxWidth: 320,
    maxHeight: 132,
    frame: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    transparent: true,
    hasShadow: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  controlledOverlayWindow.once('ready-to-show', () => {
    if (!controlledOverlayWindow) return
    positionControlledOverlay(controlledOverlayWindow)
    controlledOverlayWindow.showInactive()
  })

  controlledOverlayWindow.on('closed', () => {
    controlledOverlayWindow = null
  })

  loadRenderer(controlledOverlayWindow, 'window=controlled-overlay')
  return controlledOverlayWindow
}

function buildPermissionResult({
  key,
  label,
  granted,
  supported = true,
  canPrompt = false,
  platform = process.platform,
  openTarget = 'privacy',
  message = '',
}) {
  return {
    key,
    label,
    granted,
    supported,
    canPrompt,
    platform,
    openTarget,
    message,
  }
}

async function getScreenSources() {
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 320, height: 200 } })
  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL(),
    displayId: source.display_id,
  }))
}

function serializeDisplay(display) {
  if (!display) return null
  return {
    id: String(display.id),
    label: display.label,
    bounds: display.bounds,
    workArea: display.workArea,
    scaleFactor: display.scaleFactor,
    rotation: display.rotation,
    isPrimary: display.id === screen.getPrimaryDisplay().id,
  }
}

async function checkScreenRecordingPermission() {
  if (process.platform === 'darwin') {
    try {
      const status = systemPreferences.getMediaAccessStatus('screen')
      const granted = status === 'granted'
      return buildPermissionResult({
        key: 'screen-recording',
        label: '屏幕录制',
        granted,
        openTarget: 'screen-recording',
        message: granted
          ? 'macOS 屏幕录制权限已授权。'
          : 'macOS 未授予屏幕录制权限，请前往系统设置开启。',
      })
    } catch (error) {
      logError('Failed to check screen recording permission', error)
    }
  }

  return buildPermissionResult({
    key: 'screen-recording',
    label: '屏幕录制',
    granted: true,
    message:
      process.platform === 'win32'
        ? 'Windows 通常无需额外授权，但请确认系统或安全软件未拦截。'
        : 'Linux 若使用 Wayland，请确认桌面环境允许屏幕共享。',
  })
}

function checkAccessibilityPermission() {
  if (process.platform === 'darwin') {
    const granted = typeof systemPreferences.isTrustedAccessibilityClient === 'function'
      ? systemPreferences.isTrustedAccessibilityClient(false)
      : false

    return buildPermissionResult({
      key: 'accessibility',
      label: '辅助功能',
      granted,
      canPrompt: true,
      openTarget: 'accessibility',
      message: granted
        ? 'macOS 辅助功能权限已授权。'
        : 'macOS 未授予辅助功能权限，远程输入控制将无法生效。',
    })
  }

  return buildPermissionResult({
    key: 'accessibility',
    label: '输入控制',
    granted: Boolean(robot),
    supported: Boolean(robot),
    message: robot
      ? '当前平台无需单独系统授权，但仍可能受系统策略限制。'
      : getRobotUnavailableMessage(),
  })
}

async function checkAllPermissions() {
  return {
    success: true,
    platform: process.platform,
    permissions: {
      screenRecording: await checkScreenRecordingPermission(),
      accessibility: checkAccessibilityPermission(),
    },
  }
}

function normalizeButton(button = 'left') {
  if (button === 1 || button === 'middle') return 'middle'
  if (button === 2 || button === 'right') return 'right'
  return 'left'
}

function normalizeKey(key) {
  const keyMap = {
    Enter: 'enter',
    Tab: 'tab',
    Escape: 'escape',
    Esc: 'escape',
    Backspace: 'backspace',
    Delete: 'delete',
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    Control: 'control',
    Shift: 'shift',
    Alt: 'alt',
    Meta: process.platform === 'darwin' ? 'command' : 'control',
    CapsLock: 'capslock',
    Home: 'home',
    End: 'end',
    PageUp: 'pageup',
    PageDown: 'pagedown',
    ' ': 'space',
  }

  if (keyMap[key]) {
    return keyMap[key]
  }

  if (typeof key === 'string' && key.length === 1) {
    return key.toLowerCase()
  }

  return String(key || '').toLowerCase()
}

function mapNormalizedPosition(x = 0, y = 0) {
  const primaryDisplay = screen.getPrimaryDisplay()
  const bounds = primaryDisplay.bounds
  return {
    x: Math.round(bounds.x + Math.max(0, Math.min(1, x)) * (bounds.width - 1)),
    y: Math.round(bounds.y + Math.max(0, Math.min(1, y)) * (bounds.height - 1)),
  }
}

function executeRemoteControl(command) {
  if (!robot) {
    return { success: false, error: 'CONTROL_UNAVAILABLE', message: getRobotUnavailableMessage() }
  }

  try {
    switch (command.type) {
      case 'mouse:move': {
        const point = mapNormalizedPosition(command.x, command.y)
        robot.moveMouse(point.x, point.y)
        return { success: true }
      }
      case 'mouse:down':
        robot.mouseToggle('down', normalizeButton(command.button))
        return { success: true }
      case 'mouse:up':
        robot.mouseToggle('up', normalizeButton(command.button))
        return { success: true }
      case 'mouse:click': {
        const point = mapNormalizedPosition(command.x, command.y)
        robot.moveMouse(point.x, point.y)
        robot.mouseClick(normalizeButton(command.button), false)
        return { success: true }
      }
      case 'mouse:wheel':
        robot.scrollMouse(Math.round(command.deltaX || 0), Math.round(command.deltaY || 0))
        return { success: true }
      case 'keyboard:down':
        robot.keyToggle(normalizeKey(command.key), 'down')
        return { success: true }
      case 'keyboard:up':
        robot.keyToggle(normalizeKey(command.key), 'up')
        return { success: true }
      case 'keyboard:tap':
        robot.keyTap(normalizeKey(command.key))
        return { success: true }
      default:
        return {
          success: false,
          error: 'UNKNOWN_CONTROL_EVENT',
          message: `未支持的控制事件: ${command.type}`,
        }
    }
  } catch (error) {
    logError('Remote control execution failed', error)
    return {
      success: false,
      error: 'CONTROL_EXECUTION_FAILED',
      message: error.message || '远程控制执行失败。',
    }
  }
}

async function saveIncomingFile(file) {
  const fileName = String(file?.name || 'received-file').replace(/[\\/]/g, '_')
  const downloadsDir = app.getPath('downloads')
  const targetPath = path.join(downloadsDir, fileName)
  const buffer = Buffer.from(file?.contentBase64 || '', 'base64')
  await fs.writeFile(targetPath, buffer)
  return {
    success: true,
    path: targetPath,
    size: buffer.length,
  }
}

app.whenReady().then(() => {
  mainWindow = createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
    }
  })

  ipcMain.handle('screen:getSources', async () => {
    try {
      const sources = await getScreenSources()
      logInfo('Fetched screen sources', { count: sources.length })
      return { success: true, sources }
    } catch (error) {
      logError('Failed to get screen sources', error)
      return { success: false, sources: [], message: error.message || '获取屏幕源失败。' }
    }
  })

  ipcMain.handle('screen:getDisplays', async () => ({
    success: true,
    displays: screen.getAllDisplays().map(serializeDisplay),
  }))

  ipcMain.handle('screen:getPrimaryDisplay', async () => ({
    success: true,
    display: serializeDisplay(screen.getPrimaryDisplay()),
  }))

  ipcMain.handle('control:execute', async (_, command) => executeRemoteControl(command))
  ipcMain.handle('clipboard:readText', async () => ({
    success: true,
    text: clipboard.readText(),
  }))
  ipcMain.handle('clipboard:writeText', async (_, text = '') => {
    clipboard.writeText(String(text))
    return { success: true }
  })
  ipcMain.handle('file:saveIncoming', async (_, file) => {
    try {
      return await saveIncomingFile(file)
    } catch (error) {
      logError('Failed to save incoming file', error)
      return { success: false, message: error.message || '保存文件失败。' }
    }
  })
  ipcMain.handle('permission:checkAll', checkAllPermissions)
  ipcMain.handle('permission:checkScreenRecording', checkScreenRecordingPermission)
  ipcMain.handle('permission:checkAccessibility', async () => checkAccessibilityPermission())

  ipcMain.handle('permission:openSystemSettings', async (_, permissionType = 'privacy') => {
    if (process.platform !== 'darwin') {
      return {
        success: false,
        message:
          process.platform === 'win32'
            ? 'Windows 没有统一权限页，请检查系统安全设置和安全软件。'
            : 'Linux 没有统一权限页，请检查桌面环境、Wayland/X11 或沙箱权限。',
      }
    }

    const urls = {
      'screen-recording': 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
      accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
      privacy: 'x-apple.systempreferences:com.apple.preference.security?Privacy',
    }

    try {
      await shell.openExternal(urls[permissionType] || urls.privacy)
      return { success: true }
    } catch (error) {
      logError('Failed to open system settings', error)
      return { success: false, message: error.message || '打开系统设置失败。' }
    }
  })

  ipcMain.handle('window:openController', async (_, payload) => {
    createControllerWindow(payload)
    return { success: true }
  })

  ipcMain.handle('window:closeCurrent', async (event) => {
    const target = BrowserWindow.fromWebContents(event.sender)
    if (target === controllerWindow) {
      controllerWindowAllowClose = true
    }
    target?.close()
    return { success: true }
  })

  ipcMain.handle('window:showCurrent', async (event) => {
    const target = BrowserWindow.fromWebContents(event.sender)
    target?.show()
    target?.focus()
    return { success: true }
  })

  ipcMain.handle('window:openControlledOverlay', async () => {
    createControlledOverlayWindow()
    return { success: true }
  })

  ipcMain.handle('window:closeControlledOverlay', async () => {
    if (controlledOverlayWindow && !controlledOverlayWindow.isDestroyed()) {
      controlledOverlayWindow.close()
    }
    return { success: true }
  })

  ipcMain.handle('window:updateControlledOverlay', async (_, payload) => {
    const overlay = createControlledOverlayWindow()
    overlay.webContents.send('overlay:state', payload)
    positionControlledOverlay(overlay)
    return { success: true }
  })

  ipcMain.on('overlay:request-disconnect', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('overlay:disconnect-request')
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
