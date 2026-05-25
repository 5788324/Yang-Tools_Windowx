import { app } from 'electron'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { findZtoolsPluginById, toPluginSummary } from './pluginSamples'
import type {
  InstalledPluginReport,
  PluginInstallRequest,
  PluginManageResult,
  PluginSummary,
  RawPluginManifest
} from '../shared/pluginTypes'

export function listInstalledPlugins(): InstalledPluginReport {
  const root = ensureManagedPluginRoot()
  const plugins: PluginSummary[] = []

  for (const name of readdirSync(root)) {
    const pluginDir = join(root, name)
    const manifestPath = join(pluginDir, 'plugin.json')
    if (!statSync(pluginDir).isDirectory() || !existsSync(manifestPath)) continue

    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as RawPluginManifest
      plugins.push(toPluginSummary(manifest, 'yang-tools', pluginDir))
    } catch {
      continue
    }
  }

  return { root, plugins }
}

export function installPluginFromSample(request: PluginInstallRequest): PluginManageResult {
  if (request.source !== 'ztools-local') {
    return { ok: false, error: '当前只支持从本机 ZTools 展开目录样本安装。' }
  }

  const sample = findZtoolsPluginById(request.id)
  if (!sample) return { ok: false, error: `未找到插件样本：${request.id}` }

  const root = ensureManagedPluginRoot()
  const installId = sanitizePluginId(sample.summary.id || sample.summary.name || request.id)
  const target = join(root, installId)
  assertInsideRoot(root, target)

  if (existsSync(target) && !request.overwrite) {
    return {
      ok: false,
      error: '插件已安装，可使用更新覆盖。',
      plugin: toPluginSummary(sample.manifest, 'yang-tools', sample.dir)
    }
  }

  const tempTarget = join(root, `${installId}.tmp-${Date.now()}`)
  assertInsideRoot(root, tempTarget)
  cpSync(sample.dir, tempTarget, { recursive: true })

  if (existsSync(target)) rmSync(target, { recursive: true, force: true })
  renameSync(tempTarget, target)

  return {
    ok: true,
    plugin: toPluginSummary(sample.manifest, 'yang-tools', sample.dir)
  }
}

export function uninstallManagedPlugin(id: string): PluginManageResult {
  const root = ensureManagedPluginRoot()
  const target = join(root, sanitizePluginId(id))
  assertInsideRoot(root, target)

  if (!existsSync(target)) return { ok: false, error: `未找到已安装插件：${id}` }

  rmSync(target, { recursive: true, force: true })
  return { ok: true }
}

export function findManagedPluginById(
  id: string
): { dir: string; manifest: RawPluginManifest; summary: PluginSummary } | null {
  const root = ensureManagedPluginRoot()
  const normalizedId = sanitizePluginId(id)

  for (const name of readdirSync(root)) {
    const pluginDir = join(root, name)
    const manifestPath = join(pluginDir, 'plugin.json')
    if (!statSync(pluginDir).isDirectory() || !existsSync(manifestPath)) continue

    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as RawPluginManifest
      const summary = toPluginSummary(manifest, 'yang-tools', pluginDir)
      if (
        summary.id === id ||
        summary.name === id ||
        sanitizePluginId(summary.id) === normalizedId ||
        name === normalizedId
      ) {
        return { dir: pluginDir, manifest, summary }
      }
    } catch {
      continue
    }
  }

  return null
}

function ensureManagedPluginRoot(): string {
  const root = join(app.getPath('userData'), 'plugins')
  mkdirSync(root, { recursive: true })
  return root
}

function sanitizePluginId(id: string): string {
  const safeId = String(id || 'plugin')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 80)

  return safeId || 'plugin'
}

function assertInsideRoot(root: string, target: string): void {
  const rel = relative(root, target)
  if (rel.startsWith('..') || rel === '' || rel.includes(':')) {
    throw new Error('插件路径越界，已阻止操作。')
  }
}
