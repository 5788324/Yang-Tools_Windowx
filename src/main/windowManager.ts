import { BrowserWindow, shell } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { findManagedPluginById } from './managedPlugins'
import { findZtoolsPluginById } from './pluginSamples'
import { resolvePreloadPath } from './preloadPath'
import type { OpenPluginRequest, OpenPluginResult, PluginLaunchContext } from '../shared/pluginTypes'

export class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private pluginWindows = new Map<string, BrowserWindow>()
  private isQuitting = false

  createMainWindow(): BrowserWindow {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) return this.mainWindow

    this.mainWindow = new BrowserWindow({
      width: 980,
      height: 680,
      minWidth: 860,
      minHeight: 560,
      title: 'Yang Tools',
      backgroundColor: '#f6f7f9',
      show: false,
      webPreferences: {
        preload: resolvePreloadPath('index'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()
    })

    this.mainWindow.on('close', (event) => {
      if (this.isQuitting) return
      event.preventDefault()
      this.mainWindow?.hide()
    })

    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })

    if (is.dev && process.env.ELECTRON_RENDERER_URL) {
      this.mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return this.mainWindow
  }

  showMainWindow(): void {
    const win = this.createMainWindow()
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }

  toggleMainWindow(): void {
    const win = this.createMainWindow()
    if (win.isVisible() && win.isFocused()) {
      win.hide()
      return
    }

    this.showMainWindow()
  }

  hideMainWindow(): void {
    this.mainWindow?.hide()
  }

  async openSamplePlugin(request: OpenPluginRequest): Promise<OpenPluginResult> {
    if (request.source !== 'ztools-local' && request.source !== 'yang-tools') {
      return { ok: false, error: '当前只支持打开 ZTools 本地展开目录样本和 Yang Tools 已安装插件。' }
    }

    const plugin = request.source === 'yang-tools' ? findManagedPluginById(request.id) : findZtoolsPluginById(request.id)
    if (!plugin) return { ok: false, error: `未找到插件样本: ${request.id}` }
    if (!plugin.manifest.main) return { ok: false, error: '插件缺少 main 入口' }

    const entry = join(plugin.dir, plugin.manifest.main)
    if (!existsSync(entry)) return { ok: false, error: `插件入口不存在: ${entry}` }

    const key = `${request.source}:${request.id}`
    const existing = this.pluginWindows.get(key)
    if (existing && !existing.isDestroyed()) {
      if (hasLaunchPayload(request)) {
        existing.close()
        this.pluginWindows.delete(key)
      } else {
        existing.show()
        existing.focus()
        return { ok: true }
      }
    }

    const win = new BrowserWindow({
      width: 860,
      height: 620,
      minWidth: 480,
      minHeight: 320,
      title: plugin.summary.title,
      backgroundColor: '#ffffff',
      show: false,
      webPreferences: {
        preload: resolvePreloadPath('plugin'),
        additionalArguments: [`--yang-tools-plugin=${encodeLaunchContext(plugin.summary, request)}`],
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true
      }
    })

    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })

    win.once('ready-to-show', () => win.show())
    win.on('closed', () => this.pluginWindows.delete(key))

    await win.loadFile(entry)
    this.pluginWindows.set(key, win)
    return { ok: true }
  }

  quit(): void {
    this.isQuitting = true
    for (const win of this.pluginWindows.values()) {
      if (!win.isDestroyed()) win.close()
    }
    this.mainWindow?.close()
  }
}

function hasLaunchPayload(request: OpenPluginRequest): boolean {
  return Boolean(request.code || request.triggerType || request.payload)
}

function encodeLaunchContext(
  summary: { id: string; name: string; title: string; source: PluginLaunchContext['source'] },
  request: OpenPluginRequest
): string {
  const context: PluginLaunchContext = {
    id: summary.id,
    name: summary.name,
    title: summary.title,
    source: summary.source,
    code: request.code || 'open',
    type: request.triggerType || 'manual',
    payload: request.payload ?? '',
    from: request.from || 'sample-list'
  }

  return Buffer.from(JSON.stringify(context), 'utf8').toString('base64url')
}
