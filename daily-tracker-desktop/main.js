const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('node:path')
const fs = require('node:fs')

const APP_URL = 'https://daily-tracker-web-production.up.railway.app'
const ICON_PATH = path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png')
const APP_USER_MODEL_ID = 'com.artechsolution.dailytracker'
const WIDGET_STATE_PATH = path.join(app.getPath('userData'), 'widget-state.json')

// Required for Windows to show native toast notifications at all — without a
// matching AppUserModelID (normally set up by an installer's Start Menu
// shortcut), Windows silently drops them with no error.
if (process.platform === 'win32') {
  app.setAppUserModelId(APP_USER_MODEL_ID)
}

let mainWindow = null
let widgetWindow = null
let tray = null
let updateReady = false

function loadWidgetState() {
  try {
    return JSON.parse(fs.readFileSync(WIDGET_STATE_PATH, 'utf8'))
  } catch {
    return { open: false, bounds: { width: 300, height: 380 } }
  }
}

function saveWidgetState(patch) {
  try {
    fs.writeFileSync(WIDGET_STATE_PATH, JSON.stringify({ ...loadWidgetState(), ...patch }))
  } catch (err) {
    console.error('Could not save widget window state:', err)
  }
}

function createWidgetWindow() {
  if (widgetWindow) {
    widgetWindow.show()
    widgetWindow.focus()
    return
  }
  const { bounds } = loadWidgetState()
  widgetWindow = new BrowserWindow({
    ...bounds,
    minWidth: 220,
    minHeight: 200,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    icon: ICON_PATH,
    title: 'Daily Tracker Widget',
    backgroundColor: '#F6FAFB',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      // Same named partition as the main window — shares its login session,
      // so opening the widget never asks you to log in separately.
      partition: 'persist:daily-tracker',
    },
  })

  widgetWindow.loadURL(`${APP_URL}/widget`)

  const persistBounds = () => saveWidgetState({ bounds: widgetWindow.getBounds() })
  widgetWindow.on('moved', persistBounds)
  widgetWindow.on('resized', persistBounds)
  widgetWindow.on('closed', () => {
    widgetWindow = null
    saveWidgetState({ open: false })
    rebuildTrayMenu()
  })

  saveWidgetState({ open: true })
  rebuildTrayMenu()
}

function toggleWidgetWindow() {
  if (widgetWindow) widgetWindow.close()
  else createWidgetWindow()
}

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
      preload: path.join(__dirname, 'preload.js'),
      // Named persistent partition — removes any ambiguity about the login
      // session (cookies) surviving app restarts. Written to disk under
      // userData, same as Electron's unnamed default, just explicit.
      partition: 'persist:daily-tracker',
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

function rebuildTrayMenu() {
  const items = [
    {
      label: 'Open Daily Tracker',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      },
    },
    {
      label: widgetWindow ? 'Hide widget' : 'Show widget',
      click: toggleWidgetWindow,
    },
  ]
  if (updateReady) {
    items.push({
      label: 'Restart & install update',
      click: () => {
        app.isQuitting = true
        autoUpdater.quitAndInstall()
      },
    })
  }
  items.push({
    label: 'Quit',
    click: () => {
      app.isQuitting = true
      app.quit()
    },
  })
  tray.setContextMenu(Menu.buildFromTemplate(items))
}

function createTray() {
  const trayIcon = nativeImage.createFromPath(ICON_PATH).resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  tray.setToolTip('Daily Tracker')
  rebuildTrayMenu()
  tray.on('click', () => {
    mainWindow.show()
    mainWindow.focus()
  })
}

function setUpAutoUpdate() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-downloaded', () => {
    updateReady = true
    if (tray) rebuildTrayMenu()
    if (Notification.isSupported()) {
      new Notification({
        title: 'Daily Tracker update ready',
        body: 'Restart from the tray menu to install it — or it applies next time you quit.',
        icon: ICON_PATH,
      }).show()
    }
  })

  autoUpdater.on('error', (err) => {
    console.error('Auto-update check failed:', err)
  })

  const check = () => autoUpdater.checkForUpdates().catch((err) => console.error('Update check failed:', err))
  check()
  setInterval(check, 6 * 60 * 60 * 1000) // re-check every 6 hours while running
}

ipcMain.on('show-notification', (event, title, body) => {
  if (!Notification.isSupported()) {
    console.error('electron Notification module reports unsupported on this system')
    return
  }
  new Notification({ title, body, icon: ICON_PATH }).show()
})

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
  setUpAutoUpdate()
  if (loadWidgetState().open) createWidgetWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow.show()
  })
})

app.on('window-all-closed', () => {
  // Keep running in the tray — do not quit (matches the desktop app's
  // original background-notification behavior).
})
