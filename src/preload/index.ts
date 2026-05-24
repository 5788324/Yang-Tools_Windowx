import { contextBridge, ipcRenderer } from 'electron'
import type { OpenPluginRequest, OpenPluginResult, PluginCommandMatch, PluginSampleReport } from '../shared/pluginTypes'

const api = {
  getAppInfo: () =>
    ipcRenderer.invoke('app:get-info') as Promise<{
      name: string
      version: string
      isPackaged: boolean
      platform: string
    }>,
  listPluginSamples: () => ipcRenderer.invoke('plugins:list-samples') as Promise<PluginSampleReport>,
  matchPluginQuery: (query: string) => ipcRenderer.invoke('plugins:match-query', query) as Promise<PluginCommandMatch[]>,
  openSamplePlugin: (request: OpenPluginRequest) =>
    ipcRenderer.invoke('plugins:open-sample', request) as Promise<OpenPluginResult>
}

contextBridge.exposeInMainWorld('yangTools', api)

export type YangToolsApi = typeof api
