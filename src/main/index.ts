import { app, ipcMain } from 'electron'
import { ClipboardHistoryManager } from './clipboardHistoryManager'
import { matchZtoolsCommands } from './commandMatcher'
import { installPluginFromSample, listInstalledPlugins, uninstallManagedPlugin } from './managedPlugins'
import { scanPluginSamples } from './pluginSamples'
import { HotkeyManager } from './hotkeyManager'
import { registerPluginIpc } from './pluginIpc'
import { TrayManager } from './trayManager'
import { WindowManager } from './windowManager'
import type { OpenPluginRequest } from '../shared/pluginTypes'

let windowManager: WindowManager
let trayManager: TrayManager
let hotkeyManager: HotkeyManager
let clipboardHistoryManager: ClipboardHistoryManager

function registerIpc(): void {
  ipcMain.handle('app:get-info', () => ({
    name: 'Yang Tools',
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    platform: process.platform
  }))

  ipcMain.handle('plugins:list-samples', () => scanPluginSamples())
  ipcMain.handle('plugins:list-installed', () => listInstalledPlugins())
  ipcMain.handle('plugins:install-sample', (_event, request) => installPluginFromSample(request))
  ipcMain.handle('plugins:uninstall', (_event, id: string) => uninstallManagedPlugin(id))
  ipcMain.handle('plugins:match-query', (_event, query: string) => matchZtoolsCommands(query))
  ipcMain.handle('plugins:open-sample', (_event, request: OpenPluginRequest) =>
    windowManager.openSamplePlugin(request)
  )
  registerPluginIpc(windowManager, clipboardHistoryManager)
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
    clipboardHistoryManager = new ClipboardHistoryManager()

    registerIpc()
    windowManager.createMainWindow()
    trayManager.create()
    hotkeyManager.registerAll()
    clipboardHistoryManager.start()

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
  clipboardHistoryManager?.stop()
})
