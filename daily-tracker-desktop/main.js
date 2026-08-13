const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron')
const path = require('node:path')

const APP_URL = 'https://daily-tracker-web-production.up.railway.app'
const ICON_PATH = path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png')
const APP_USER_MODEL_ID = 'com.artechsolution.dailytracker'

// Required for Windows to show native toast notifications at all — without a
// matching AppUserModelID (normally set up by an installer's Start Menu
// shortcut), Windows silently drops them with no error.
if (process.platform === 'win32') {
  app.setAppUserModelId(APP_USER_MODEL_ID)
}

let mainWindow = null
let tray = null

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function createWindow() {
  // Auto-started at login (Windows) launches straight to the tray, same as
  // a normal "hide to tray" close — no window popping up on every boot.
  const startHidden = app.getLoginItemSettings().wasOpenedAtLogin

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 480,
    minHeight: 420,
    icon: ICON_PATH,
    title: 'Daily Tracker',
    backgroundColor: '#F6FAFB',
    show: !startHidden,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadURL(APP_URL)

  // Hide to tray instead of quitting — same background-app behavior as the
  // web app's browser-tab notifications, just without needing a tab open.
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

function createTray() {
  const trayIcon = nativeImage.createFromPath(ICON_PATH).resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  tray.setToolTip('Daily Tracker')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Open Daily Tracker',
        click: () => {
          mainWindow.show()
          mainWindow.focus()
        },
      },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true
          app.quit()
        },
      },
    ]),
  )
  tray.on('click', () => {
    mainWindow.show()
    mainWindow.focus()
  })
}

app.whenReady().then(() => {
  // Run automatically after system restart/login, starting hidden in the tray.
  // Best-effort: some platforms/unsigned builds refuse this: shouldn't block startup.
  try {
    app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true })
  } catch (err) {
    console.error('Could not register login item:', err)
  }

  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow.show()
  })
})

app.on('window-all-closed', () => {
  // Keep running in the tray — do not quit (matches the desktop app's
  // original background-notification behavior).
})
