import { contextBridge, ipcRenderer } from 'electron'
import type {
  InstalledPluginReport,
  OpenPluginRequest,
  OpenPluginResult,
  PluginCommandMatch,
  PluginInstallRequest,
  PluginManageResult,
  PluginSampleReport
} from '../shared/pluginTypes'

const api = {
  getAppInfo: () =>
    ipcRenderer.invoke('app:get-info') as Promise<{
      name: string
      version: string
      isPackaged: boolean
      platform: string
    }>,
  listPluginSamples: () => ipcRenderer.invoke('plugins:list-samples') as Promise<PluginSampleReport>,
  listInstalledPlugins: () => ipcRenderer.invoke('plugins:list-installed') as Promise<InstalledPluginReport>,
  installSamplePlugin: (request: PluginInstallRequest) =>
    ipcRenderer.invoke('plugins:install-sample', request) as Promise<PluginManageResult>,
  uninstallPlugin: (id: string) => ipcRenderer.invoke('plugins:uninstall', id) as Promise<PluginManageResult>,
  matchPluginQuery: (query: string) => ipcRenderer.invoke('plugins:match-query', query) as Promise<PluginCommandMatch[]>,
  openSamplePlugin: (request: OpenPluginRequest) =>
    ipcRenderer.invoke('plugins:open-sample', request) as Promise<OpenPluginResult>
}

contextBridge.exposeInMainWorld('yangTools', api)

export type YangToolsApi = typeof api
