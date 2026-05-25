import { contextBridge, ipcRenderer } from 'electron'
import type {
  InstalledPluginReport,
  OpenPluginRequest,
  OpenPluginResult,
  PluginCommandMatch,
  PluginInstallRequest,
  PluginManageResult,
  PluginSampleReport,
  PluginTrustGrant
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
  isPluginTrusted: (grant: PluginTrustGrant) => ipcRenderer.invoke('plugins:is-trusted', grant) as Promise<boolean>,
  trustPlugin: (grant: PluginTrustGrant) => ipcRenderer.invoke('plugins:trust', grant) as Promise<{ ok: boolean }>,
  revokePluginTrust: (grant: PluginTrustGrant) =>
    ipcRenderer.invoke('plugins:revoke-trust', grant) as Promise<{ ok: boolean }>,
  matchPluginQuery: (query: string) => ipcRenderer.invoke('plugins:match-query', query) as Promise<PluginCommandMatch[]>,
  openSamplePlugin: (request: OpenPluginRequest) =>
    ipcRenderer.invoke('plugins:open-sample', request) as Promise<OpenPluginResult>
}

contextBridge.exposeInMainWorld('yangTools', api)

export type YangToolsApi = typeof api
