import { contextBridge, ipcRenderer } from 'electron'
import type { PluginLaunchContext } from '../shared/pluginTypes'

type PluginCallback = (payload: PluginLaunchContext) => unknown
type MainPushCallback = (payload: PluginLaunchContext) => unknown
type ToolHandler = (params?: unknown) => unknown

const launchContext = readLaunchContext()
const pluginStoragePrefix = `plugin:${launchContext.id}:`
const enterCallbacks: PluginCallback[] = []
const mainPushCallbacks: MainPushCallback[] = []
const toolHandlers = new Map<string, ToolHandler>()
let subInputHandler: ((details: { text: string }) => unknown) | null = null
let subInputPlaceholder = ''

const db = {
  get<T = unknown>(key: string): T | null {
    const raw = localStorage.getItem(pluginStoragePrefix + key)
    return raw ? (JSON.parse(raw) as T) : null
  },
  set(key: string, value: unknown): { ok: boolean } {
    localStorage.setItem(pluginStoragePrefix + key, JSON.stringify(value))
    return { ok: true }
  },
  remove(keyOrDoc: string | { _id?: string }): { ok: boolean } {
    const key = typeof keyOrDoc === 'string' ? keyOrDoc : keyOrDoc._id
    if (!key) return { ok: false }
    localStorage.removeItem(pluginStoragePrefix + key)
    return { ok: true }
  },
  put(doc: Record<string, unknown>): { ok: boolean; id?: string } {
    const id = typeof doc._id === 'string' ? doc._id : String(Date.now())
    localStorage.setItem(pluginStoragePrefix + id, JSON.stringify({ ...doc, _id: id }))
    return { ok: true, id }
  },
  allDocs(prefix = ''): Array<Record<string, unknown>> {
    const docs: Array<Record<string, unknown>> = []

    for (let index = 0; index < localStorage.length; index += 1) {
      const storageKey = localStorage.key(index)
      if (!storageKey?.startsWith(pluginStoragePrefix + prefix)) continue
      const raw = localStorage.getItem(storageKey)
      if (!raw) continue
      try {
        docs.push(JSON.parse(raw) as Record<string, unknown>)
      } catch {
        // Ignore malformed plugin data.
      }
    }

    return docs
  }
}

const clipboardApi = {
  readText: () => ipcRenderer.invoke('plugin:clipboard-read-text') as Promise<string>,
  writeText: (text: string) => ipcRenderer.invoke('plugin:clipboard-write-text', text) as Promise<{ ok: boolean }>,
  search: async () => [],
  getHistory: async () => ({ items: [], total: 0 })
}

const compatibilityApi = {
  db,
  clipboard: clipboardApi,
  copyText: (text: string) => clipboardApi.writeText(text),
  isMacOS: () => process.platform === 'darwin',
  isWindows: () => process.platform === 'win32',
  isLinux: () => process.platform === 'linux',
  getAppName: () => 'Yang Tools',
  getAppVersion: () => '0.1.0',
  getPluginInfo: () => launchContext,
  onPluginEnter(callback: PluginCallback) {
    enterCallbacks.push(callback)
    queueMicrotask(() => callback(launchContext))
  },
  onMainPush(callback: MainPushCallback) {
    mainPushCallbacks.push(callback)
  },
  setSubInput(callback: (details: { text: string }) => unknown, placeholder = '') {
    subInputHandler = callback
    subInputPlaceholder = placeholder
  },
  subInputFocus() {
    return { ok: true, placeholder: subInputPlaceholder }
  },
  setExpendHeight() {
    return { ok: true }
  },
  hideMainWindow: () => ipcRenderer.invoke('plugin:hide-main-window') as Promise<{ ok: boolean }>,
  outPlugin: () => window.close(),
  shellOpenExternal: (url: string) =>
    ipcRenderer.invoke('plugin:shell-open-external', url) as Promise<{ ok: boolean }>,
  showNotification(title: string, body?: string) {
    return ipcRenderer.invoke('plugin:notify', title, body) as Promise<{ ok: boolean }>
  },
  registerTool(name: string, handler: ToolHandler) {
    toolHandlers.set(name, handler)
    return { ok: true }
  },
  getRegisteredTools() {
    return Array.from(toolHandlers.keys())
  },
  __emitSubInput(text: string) {
    return subInputHandler?.({ text })
  },
  __emitMainPush() {
    return mainPushCallbacks.map((callback) => callback(launchContext))
  }
}

contextBridge.exposeInMainWorld('yangTools', compatibilityApi)
contextBridge.exposeInMainWorld('ztools', compatibilityApi)
contextBridge.exposeInMainWorld('utools', {
  ...compatibilityApi,
  getAppVersion: () => '7.3.1'
})
contextBridge.exposeInMainWorld('features', {
  code: launchContext.code,
  type: launchContext.type,
  payload: launchContext.payload,
  from: launchContext.from
})

function readLaunchContext(): PluginLaunchContext {
  const arg = process.argv.find((item) => item.startsWith('--yang-tools-plugin='))
  if (!arg) return fallbackLaunchContext()

  try {
    const encoded = arg.slice('--yang-tools-plugin='.length)
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as PluginLaunchContext
  } catch {
    return fallbackLaunchContext()
  }
}

function fallbackLaunchContext(): PluginLaunchContext {
  return {
    id: 'unknown',
    name: 'unknown',
    title: 'Unknown Plugin',
    source: 'yang-tools',
    code: 'open',
    type: 'manual',
    payload: '',
    from: 'sample-list'
  }
}
