// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// contextIsolation이 활성화된 상태에서 안전하게 노출할 API 정의
contextBridge.exposeInMainWorld('electron', {
  // 알림 관련 API
  notifications: {
    show: (title, options) => ipcRenderer.invoke('show-notification', title, options),
  },
  // 윈도우 관련 API
  window: {
    focus: () => ipcRenderer.send('focus-window'),
  }
});