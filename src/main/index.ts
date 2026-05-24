import { app, ipcMain } from 'electron'
import { scanPluginSamples } from './pluginSamples'
import { HotkeyManager } from './hotkeyManager'
import { TrayManager } from './trayManager'
import { WindowManager } from './windowManager'
import type { OpenPluginRequest } from '../shared/pluginTypes'

let windowManager: WindowManager
let trayManager: TrayManager
let hotkeyManager: HotkeyManager

function registerIpc(): void {
  ipcMain.handle('app:get-info', () => ({
    name: 'Yang Tools',
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    platform: process.platform
  }))

  ipcMain.handle('plugins:list-samples', () => scanPluginSamples())
  ipcMain.handle('plugins:open-sample', (_event, request: OpenPluginRequest) =>
    windowManager.openSamplePlugin(request)
  )
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    windowManager?.showMainWindow()
  })

  app.whenReady().then(() => {
    windowManager = new WindowManager()
    trayManager = new TrayManager(windowManager)
    hotkeyManager = new HotkeyManager(windowManager)

    registerIpc()
    windowManager.createMainWindow()
    trayManager.create()
    hotkeyManager.registerAll()

    app.on('activate', () => {
      windowManager.showMainWindow()
    })
  })
}

app.on('window-all-closed', () => {
  // Keep running in the tray on Windows.
})

app.on('before-quit', () => {
  hotkeyManager?.unregisterAll()
  trayManager?.destroy()
})
