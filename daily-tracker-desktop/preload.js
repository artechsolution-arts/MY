const { contextBridge, ipcRenderer } = require('electron')

// Routes the web app's notifications through Electron's native Notification
// module (main process) instead of the renderer's Web Notifications API —
// the more reliable path for actually showing a Windows toast. Detected and
// used by daily-tracker-web's notify() when running inside this app; falls
// back to the standard browser API when this bridge isn't present.
contextBridge.exposeInMainWorld('electronNotify', (title, body) => {
  ipcRenderer.send('show-notification', title, body)
})
