import { app, BrowserWindow, clipboard, ipcMain } from 'electron'
import { ClipboardHistoryManager } from './clipboardHistoryManager'
import { matchZtoolsCommands } from './commandMatcher'
import { installPluginFromSample, listInstalledPlugins, uninstallManagedPlugin } from './managedPlugins'
import { addAiToolHistory, getAiToolHistory, getAiToolsSettings, setAiToolsSettings } from './aiToolsSettings'
import { OcrService } from './ocrService'
import { scanPluginSamples } from './pluginSamples'
import { isPluginTrusted, revokePluginTrust, trustPlugin } from './pluginTrustStore'
import { ScreenshotPinManager } from './screenshotPinManager'
import { HotkeyManager } from './hotkeyManager'
import { registerPluginIpc } from './pluginIpc'
import { TrayManager } from './trayManager'
import { TranslationService } from './translationService'
import { WindowManager } from './windowManager'
import type { OcrRecognizeRequest, TranslateProvider, TranslateRequest } from '../shared/aiToolTypes'
import type { OpenPluginRequest } from '../shared/pluginTypes'

let windowManager: WindowManager
let trayManager: TrayManager
let hotkeyManager: HotkeyManager
let clipboardHistoryManager: ClipboardHistoryManager
let screenshotPinManager: ScreenshotPinManager
let ocrService: OcrService
let translationService: TranslationService

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
  ipcMain.handle('plugins:is-trusted', (_event, grant) => isPluginTrusted(grant))
  ipcMain.handle('plugins:trust', (_event, grant) => trustPlugin(grant))
  ipcMain.handle('plugins:revoke-trust', (_event, grant) => revokePluginTrust(grant))
  ipcMain.handle('plugins:match-query', (_event, query: string) => matchZtoolsCommands(query))
  ipcMain.handle('plugins:open-sample', (_event, request: OpenPluginRequest) =>
    windowManager.openSamplePlugin(request)
  )
  ipcMain.handle('tools:capture-pin-screenshot', () => screenshotPinManager.captureDisplaysAndPin())
  ipcMain.handle('capture:open-suite', () => screenshotPinManager.captureDisplaysAndPin())
  ipcMain.handle('tools:read-clipboard-text', () => clipboard.readText())
  ipcMain.handle('tools:copy-text', (_event, text: string) => {
    clipboard.writeText(String(text ?? ''))
    return { ok: true }
  })
  ipcMain.handle('tools:read-clipboard-image', () => {
    const image = clipboard.readImage()
    if (image.isEmpty()) return { ok: false, error: '剪贴板没有图片。' }
    return { ok: true, imagePngBase64: image.toDataURL() }
  })
  ipcMain.handle('screenshot:selection-complete', (event, rect) =>
    screenshotPinManager.completeSelection(BrowserWindow.fromWebContents(event.sender)?.id ?? -1, rect)
  )
  ipcMain.handle('screenshot:selection-cancel', () => screenshotPinManager.cancelSelection())
  ipcMain.handle('screenshot-suite:pin', (_event, imagePngBase64: string) => screenshotPinManager.pinImageDataUrl(imagePngBase64))
  ipcMain.handle('screenshot-suite:copy-image', (_event, imagePngBase64: string) => screenshotPinManager.copyImageDataUrl(imagePngBase64))
  ipcMain.handle('screenshot-suite:save-image', (_event, imagePngBase64: string) => screenshotPinManager.saveImageDataUrl(imagePngBase64))
  ipcMain.handle('screenshot-suite:close', (event) =>
    screenshotPinManager.closeSuiteWindow(BrowserWindow.fromWebContents(event.sender)?.id ?? -1)
  )
  ipcMain.handle('pinned-image:copy', (event) =>
    screenshotPinManager.copyPinnedImage(BrowserWindow.fromWebContents(event.sender)?.id ?? -1)
  )
  ipcMain.handle('pinned-image:save', (event) =>
    screenshotPinManager.savePinnedImage(BrowserWindow.fromWebContents(event.sender)?.id ?? -1)
  )
  ipcMain.handle('pinned-image:close', (event) =>
    screenshotPinManager.closePinnedImage(BrowserWindow.fromWebContents(event.sender)?.id ?? -1)
  )
  ipcMain.handle('settings:get-ai-tools', () => getAiToolsSettings())
  ipcMain.handle('settings:set-ai-tools', (_event, settings) => setAiToolsSettings(settings))
  ipcMain.handle('ai-tools:history', () => getAiToolHistory())
  ipcMain.handle('ocr:status', () => ocrService.status())
  ipcMain.handle('ocr:recognize', (_event, request: OcrRecognizeRequest, source?: 'suite' | 'standalone') =>
    ocrService.recognize(request, source ?? 'standalone')
  )
  ipcMain.handle('translate:text', (_event, request: TranslateRequest, source?: 'suite' | 'standalone') =>
    translationService.translate(request, source ?? 'standalone')
  )
  ipcMain.handle('translate:test-provider', (_event, provider: TranslateProvider) =>
    translationService.testProvider(provider)
  )
  ipcMain.handle('ai-tools:add-ocr-history', (_event, text: string) => addAiToolHistory({ type: 'ocr', source: 'standalone', text }))
  registerPluginIpc(windowManager, clipboardHistoryManager)
}

function captureScreenshot(): void {
  void screenshotPinManager.captureDisplaysAndPin()
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    windowManager?.showMainWindow()
  })

  app.whenReady().then(() => {
    windowManager = new WindowManager()
    clipboardHistoryManager = new ClipboardHistoryManager()
    screenshotPinManager = new ScreenshotPinManager()
    ocrService = new OcrService()
    translationService = new TranslationService()
    trayManager = new TrayManager(windowManager, captureScreenshot)
    hotkeyManager = new HotkeyManager(windowManager, captureScreenshot)

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
  screenshotPinManager?.closeAll()
})
