import { contextBridge, ipcRenderer } from 'electron'
import type { PluginSampleReport } from '../shared/pluginTypes'

const api = {
  getAppInfo: () =>
    ipcRenderer.invoke('app:get-info') as Promise<{
      name: string
      version: string
      isPackaged: boolean
      platform: string
    }>,
  listPluginSamples: () => ipcRenderer.invoke('plugins:list-samples') as Promise<PluginSampleReport>
}

contextBridge.exposeInMainWorld('yangTools', api)

export type YangToolsApi = typeof api
