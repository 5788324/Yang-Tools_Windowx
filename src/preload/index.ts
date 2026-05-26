import { contextBridge, ipcRenderer } from 'electron'
import type {
  AiToolHistoryItem,
  AiToolsSettings,
  AiToolsStatus,
  OcrRecognizeRequest,
  OcrRecognizeResult,
  TranslateProvider,
  TranslateRequest,
  TranslateResult
} from '../shared/aiToolTypes'
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
    ipcRenderer.invoke('plugins:open-sample', request) as Promise<OpenPluginResult>,
  captureAndPinScreenshot: () =>
    ipcRenderer.invoke('tools:capture-pin-screenshot') as Promise<{ ok: boolean; error?: string }>,
  openCaptureSuite: () => ipcRenderer.invoke('capture:open-suite') as Promise<{ ok: boolean; error?: string }>,
  readClipboardText: () => ipcRenderer.invoke('tools:read-clipboard-text') as Promise<string>,
  copyText: (text: string) => ipcRenderer.invoke('tools:copy-text', text) as Promise<{ ok: boolean }>,
  readClipboardImage: () =>
    ipcRenderer.invoke('tools:read-clipboard-image') as Promise<{ ok: boolean; imagePngBase64?: string; error?: string }>,
  getAiToolsSettings: () => ipcRenderer.invoke('settings:get-ai-tools') as Promise<AiToolsSettings>,
  setAiToolsSettings: (settings: AiToolsSettings) =>
    ipcRenderer.invoke('settings:set-ai-tools', settings) as Promise<{ ok: boolean }>,
  getAiToolHistory: () => ipcRenderer.invoke('ai-tools:history') as Promise<AiToolHistoryItem[]>,
  getOcrStatus: () => ipcRenderer.invoke('ocr:status') as Promise<AiToolsStatus['ocr']>,
  recognizeOcr: (request: OcrRecognizeRequest) =>
    ipcRenderer.invoke('ocr:recognize', request, 'standalone') as Promise<OcrRecognizeResult>,
  translateText: (request: TranslateRequest) =>
    ipcRenderer.invoke('translate:text', request, 'standalone') as Promise<TranslateResult>,
  testTranslateProvider: (provider: TranslateProvider) =>
    ipcRenderer.invoke('translate:test-provider', provider) as Promise<TranslateResult>
}

contextBridge.exposeInMainWorld('yangTools', api)

export type YangToolsApi = typeof api
