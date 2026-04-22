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
})
