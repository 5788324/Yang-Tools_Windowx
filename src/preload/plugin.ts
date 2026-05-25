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
    if (!hasPermission('db')) return null
    const raw = localStorage.getItem(pluginStoragePrefix + key)
    return raw ? (JSON.parse(raw) as T) : null
  },
  set(key: string, value: unknown): { ok: boolean } {
    if (!hasPermission('db')) return deniedResult('db')
    localStorage.setItem(pluginStoragePrefix + key, JSON.stringify(value))
    return { ok: true }
  },
  remove(keyOrDoc: string | { _id?: string }): { ok: boolean } {
    if (!hasPermission('db')) return deniedResult('db')
    const key = typeof keyOrDoc === 'string' ? keyOrDoc : keyOrDoc._id
    if (!key) return { ok: false }
    localStorage.removeItem(pluginStoragePrefix + key)
    return { ok: true }
  },
  put(doc: Record<string, unknown>): { ok: boolean; id?: string } {
    if (!hasPermission('db')) return deniedResult('db')
    const id = typeof doc._id === 'string' ? doc._id : String(Date.now())
    localStorage.setItem(pluginStoragePrefix + id, JSON.stringify({ ...doc, _id: id }))
    return { ok: true, id }
  },
  allDocs(prefix = ''): Array<Record<string, unknown>> {
    if (!hasPermission('db')) return []
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
  readText: () =>
    hasPermission('clipboard') ? (ipcRenderer.invoke('plugin:clipboard-read-text') as Promise<string>) : deniedText(),
  writeText: (text: string) =>
    hasPermission('clipboard')
      ? (ipcRenderer.invoke('plugin:clipboard-write-text', text) as Promise<{ ok: boolean }>)
      : deniedAsyncResult('clipboard'),
  search: (query: string) =>
    hasPermission('clipboard-history')
      ? (ipcRenderer.invoke('plugin:clipboard-search', query) as Promise<unknown[]>)
      : deniedArray('clipboard-history'),
  getHistory: (page = 1, pageSize = 50) =>
    hasPermission('clipboard-history')
      ? (ipcRenderer.invoke('plugin:clipboard-get-history', page, pageSize) as Promise<{ items: unknown[]; total: number }>)
      : deniedHistory('clipboard-history')
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
  getGrantedPermissions: () => launchContext.permissions,
  hasPermission,
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
    hasPermission('shell-open')
      ? (ipcRenderer.invoke('plugin:shell-open-external', url) as Promise<{ ok: boolean }>)
      : deniedAsyncResult('shell-open'),
  showNotification(title: string, body?: string) {
    return hasPermission('notification')
      ? (ipcRenderer.invoke('plugin:notify', title, body) as Promise<{ ok: boolean }>)
      : deniedAsyncResult('notification')
  },
  registerTool(name: string, handler: ToolHandler) {
    if (!hasPermission('ai-tools')) return deniedResult('ai-tools')
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

function hasPermission(permission: string): boolean {
  return launchContext.permissions.includes(permission)
}

function deniedResult(permission: string): { ok: false; error: string } {
  return { ok: false, error: `Permission denied: ${permission}` }
}

function deniedAsyncResult(permission: string): Promise<{ ok: false; error: string }> {
  return Promise.resolve(deniedResult(permission))
}

function deniedText(): Promise<string> {
  return Promise.resolve('')
}

function deniedArray(permission: string): Promise<unknown[]> {
  console.warn(`Permission denied: ${permission}`)
  return Promise.resolve([])
}

function deniedHistory(permission: string): Promise<{ items: unknown[]; total: number }> {
  console.warn(`Permission denied: ${permission}`)
  return Promise.resolve({ items: [], total: 0 })
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
    permissions: [],
    code: 'open',
    type: 'manual',
    payload: '',
    from: 'sample-list'
  }
}
