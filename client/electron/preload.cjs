const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  screen: {
    getSources: () => ipcRenderer.invoke('screen:getSources'),
    getDisplays: () => ipcRenderer.invoke('screen:getDisplays'),
    getPrimaryDisplay: () => ipcRenderer.invoke('screen:getPrimaryDisplay'),
  },
  control: {
    execute: (command) => ipcRenderer.invoke('control:execute', command),
  },
  clipboard: {
    readText: () => ipcRenderer.invoke('clipboard:readText'),
    writeText: (text) => ipcRenderer.invoke('clipboard:writeText', text),
  },
  file: {
    saveIncoming: (file) => ipcRenderer.invoke('file:saveIncoming', file),
  },
  permission: {
    checkAll: () => ipcRenderer.invoke('permission:checkAll'),
    checkScreenRecording: () => ipcRenderer.invoke('permission:checkScreenRecording'),
    checkAccessibility: () => ipcRenderer.invoke('permission:checkAccessibility'),
    openSystemSettings: (permissionType) => ipcRenderer.invoke('permission:openSystemSettings', permissionType),
  },
  window: {
    openController: (payload) => ipcRenderer.invoke('window:openController', payload),
    closeCurrent: () => ipcRenderer.invoke('window:closeCurrent'),
    showCurrent: () => ipcRenderer.invoke('window:showCurrent'),
    closeController: () => ipcRenderer.invoke('window:closeController'),
    openControlledOverlay: () => ipcRenderer.invoke('window:openControlledOverlay'),
    closeControlledOverlay: () => ipcRenderer.invoke('window:closeControlledOverlay'),
    updateControlledOverlay: (payload) => ipcRenderer.invoke('window:updateControlledOverlay', payload),
    requestDisconnectFromOverlay: () => ipcRenderer.send('overlay:request-disconnect'),
    onOverlayDisconnectRequest: (callback) => {
      const listener = () => callback?.()
      ipcRenderer.on('overlay:disconnect-request', listener)
      return () => ipcRenderer.removeListener('overlay:disconnect-request', listener)
    },
    onOverlayState: (callback) => {
      const listener = (_, payload) => callback?.(payload)
      ipcRenderer.on('overlay:state', listener)
      return () => ipcRenderer.removeListener('overlay:state', listener)
    },
  },
})
