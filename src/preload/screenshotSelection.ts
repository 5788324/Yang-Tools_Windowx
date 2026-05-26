import { contextBridge, ipcRenderer } from 'electron'

export interface ScreenshotSelectionRect {
  x: number
  y: number
  width: number
  height: number
}

const api = {
  complete(rect: ScreenshotSelectionRect) {
    return ipcRenderer.invoke('screenshot:selection-complete', rect) as Promise<{ ok: boolean; error?: string }>
  },
  cancel() {
    return ipcRenderer.invoke('screenshot:selection-cancel') as Promise<{ ok: boolean }>
  }
}

contextBridge.exposeInMainWorld('screenshotSelection', api)
