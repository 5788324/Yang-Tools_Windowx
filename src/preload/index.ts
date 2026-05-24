import { contextBridge, ipcRenderer } from 'electron'
import type { OpenPluginRequest, OpenPluginResult, PluginSampleReport } from '../shared/pluginTypes'

const api = {
  getAppInfo: () =>
    ipcRenderer.invoke('app:get-info') as Promise<{
      name: string
      version: string
      isPackaged: boolean
      platform: string
    }>,
  listPluginSamples: () => ipcRenderer.invoke('plugins:list-samples') as Promise<PluginSampleReport>,
  openSamplePlugin: (request: OpenPluginRequest) =>
    ipcRenderer.invoke('plugins:open-sample', request) as Promise<OpenPluginResult>
}

contextBridge.exposeInMainWorld('yangTools', api)

export type YangToolsApi = typeof api
