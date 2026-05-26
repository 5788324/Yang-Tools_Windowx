import { contextBridge, ipcRenderer } from 'electron'

const api = {
  copy: () => ipcRenderer.invoke('pinned-image:copy') as Promise<{ ok: boolean; error?: string }>,
  save: () => ipcRenderer.invoke('pinned-image:save') as Promise<{ ok: boolean; error?: string; path?: string }>,
  close: () => ipcRenderer.invoke('pinned-image:close') as Promise<{ ok: boolean }>
}

contextBridge.exposeInMainWorld('pinnedImage', api)
