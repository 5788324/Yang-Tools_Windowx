import { Notification, clipboard, ipcMain, shell } from 'electron'
import type { ClipboardHistoryManager } from './clipboardHistoryManager'
import type { WindowManager } from './windowManager'

export function registerPluginIpc(windowManager: WindowManager, clipboardHistory: ClipboardHistoryManager): void {
  ipcMain.handle('plugin:clipboard-read-text', () => clipboard.readText())

  ipcMain.handle('plugin:clipboard-write-text', (_event, text: string) => {
    clipboard.writeText(String(text ?? ''))
    return { ok: true }
  })

  ipcMain.handle('plugin:clipboard-search', (_event, query: string) => clipboardHistory.search(query))

  ipcMain.handle('plugin:clipboard-get-history', (_event, page?: number, pageSize?: number) =>
    clipboardHistory.getHistory(page, pageSize)
  )

  ipcMain.handle('plugin:notify', (_event, title: string, body?: string) => {
    const notification = new Notification({
      title: String(title || 'Yang Tools'),
      body: body ? String(body) : undefined
    })
    notification.show()
    return { ok: true }
  })

  ipcMain.handle('plugin:shell-open-external', async (_event, url: string) => {
    await shell.openExternal(String(url))
    return { ok: true }
  })

  ipcMain.handle('plugin:hide-main-window', () => {
    windowManager.hideMainWindow()
    return { ok: true }
  })
}
