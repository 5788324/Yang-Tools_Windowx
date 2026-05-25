import { app } from 'electron'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type {
  CommandMatcher,
  PluginFeature,
  PluginSampleReport,
  PluginSummary,
  RawPluginManifest
} from '../shared/pluginTypes'

const EMPTY_REPORT: PluginSampleReport = {
  generatedAt: '',
  ztools: { root: '', plugins: [] },
  utools: { root: '', remotePluginCount: 0, plugins: [] }
}

export function scanPluginSamples(): PluginSampleReport {
  const sampleRoot = resolveSampleRoot()
  const ztoolsRoot = join(sampleRoot, 'ztools')
  const utoolsRoot = join(sampleRoot, 'utools')

  return {
    generatedAt: new Date().toISOString(),
    ztools: {
      root: ztoolsRoot,
      plugins: scanZtoolsPlugins(ztoolsRoot)
    },
    utools: scanUtoolsRemote(utoolsRoot)
  }
}

export function listZtoolsPluginManifests(): Array<{
  dir: string
  manifest: RawPluginManifest
  summary: PluginSummary
}> {
  const root = join(resolveSampleRoot(), 'ztools')
  if (!existsSync(root)) return []

  const plugins: Array<{ dir: string; manifest: RawPluginManifest; summary: PluginSummary }> = []

  for (const name of readdirSync(root)) {
    const dir = join(root, name)
    const manifestPath = join(dir, 'plugin.json')
    if (!statSync(dir).isDirectory() || !existsSync(manifestPath)) continue

    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as RawPluginManifest
      plugins.push({ dir, manifest, summary: toPluginSummary(manifest, 'ztools-local', dir) })
    } catch {
      continue
    }
  }

  return plugins
}

export function findZtoolsPluginById(
  id: string
): { dir: string; manifest: RawPluginManifest; summary: PluginSummary } | null {
  for (const plugin of listZtoolsPluginManifests()) {
    if (plugin.summary.id === id || plugin.summary.name === id || plugin.dir.endsWith(id)) {
      return plugin
    }
  }

  return null
}

export function emptyPluginSampleReport(): PluginSampleReport {
  return {
    ...EMPTY_REPORT,
    generatedAt: new Date().toISOString()
  }
}

function resolveSampleRoot(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'local-plugin-library')
  }

  return join(process.cwd(), 'local-plugin-library')
}

function scanZtoolsPlugins(root: string): PluginSummary[] {
  if (!existsSync(root)) return []

  return readdirSync(root)
    .map((name) => join(root, name))
    .filter((pluginDir) => statSync(pluginDir).isDirectory())
    .map((pluginDir) => {
      const manifestPath = join(pluginDir, 'plugin.json')
      if (!existsSync(manifestPath)) return null

      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as RawPluginManifest
        return toPluginSummary(manifest, 'ztools-local', pluginDir)
      } catch {
        return null
      }
    })
    .filter((plugin): plugin is PluginSummary => Boolean(plugin))
}

function scanUtoolsRemote(root: string): PluginSampleReport['utools'] {
  const remotePath = join(root, 'remote')
  if (!existsSync(remotePath)) {
    return { root, remotePluginCount: 0, plugins: [] }
  }

  try {
    const remote = JSON.parse(readFileSync(remotePath, 'utf8')) as { data?: string }
    const data = remote.data ? (JSON.parse(remote.data) as { plugins?: RawPluginManifest[] }) : {}
    const plugins = (data.plugins ?? []).map((manifest) => toPluginSummary(manifest, 'utools-remote'))

    return {
      root,
      remotePluginCount: plugins.length,
      plugins
    }
  } catch {
    return { root, remotePluginCount: 0, plugins: [] }
  }
}

export function toPluginSummary(
  manifest: RawPluginManifest,
  source: PluginSummary['source'],
  pluginDir?: string
): PluginSummary {
  const features = Array.isArray(manifest.features) ? manifest.features : []
  const triggerTypes = collectTriggerTypes(features)
  const title = manifest.title || manifest.pluginName || manifest.name || '未命名插件'
  const id = manifest.id || manifest.name || slugify(title)
  const sourceText = pluginDir ? collectPluginSourceText(pluginDir) : ''

  return {
    id,
    name: manifest.name || id,
    title,
    description: manifest.description || '',
    version: manifest.version || '0.0.0',
    source,
    entry: manifest.main,
    preload: manifest.preload,
    logo: manifest.logo,
    platform: normalizePlatform(manifest.platform),
    featureCount: features.length,
    commandCount: countCommands(features),
    triggerTypes,
    permissions: inferPermissions(manifest, triggerTypes, sourceText),
    compatibilityNotes: inferCompatibilityNotes(manifest, triggerTypes)
  }
}

function normalizePlatform(platform: RawPluginManifest['platform']): string[] {
  if (Array.isArray(platform)) return platform.map(String)
  if (typeof platform === 'string') {
    try {
      const parsed = JSON.parse(platform)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      return [platform]
    }
  }
  return ['win32', 'darwin', 'linux']
}

function countCommands(features: PluginFeature[]): number {
  return features.reduce((total, feature) => total + (feature.cmds?.length ?? 0), 0)
}

function collectTriggerTypes(features: PluginFeature[]): string[] {
  const types = new Set<string>()

  for (const feature of features) {
    for (const command of feature.cmds ?? []) {
      types.add(commandType(command))
    }
  }

  return Array.from(types).sort()
}

function commandType(command: CommandMatcher): string {
  if (typeof command === 'string') return 'keyword'
  return command.type || 'object'
}

function inferCompatibilityNotes(manifest: RawPluginManifest, triggerTypes: string[]): string[] {
  const notes: string[] = []

  if (manifest.preload) notes.push('uses-preload')
  if (manifest.tools) notes.push('declares-ai-tools')
  if (triggerTypes.includes('files')) notes.push('needs-file-trigger')
  if (triggerTypes.includes('img')) notes.push('needs-image-trigger')
  if (triggerTypes.includes('over')) notes.push('needs-selection-trigger')
  if (triggerTypes.includes('regex')) notes.push('needs-regex-matcher')

  return notes
}

function inferPermissions(manifest: RawPluginManifest, triggerTypes: string[], sourceText = ''): string[] {
  const permissions = new Set<string>()

  for (const permission of manifest.permissions ?? []) {
    permissions.add(String(permission))
  }

  if (manifest.tools) permissions.add('ai-tools')
  if (triggerTypes.includes('files')) {
    permissions.add('file-read')
    permissions.add('file-write')
  }
  if (triggerTypes.includes('img')) permissions.add('image-read')

  const searchableText = `${JSON.stringify(manifest)}\n${sourceText}`.toLowerCase()
  if (searchableText.includes('copytext') || searchableText.includes('clipboard.read') || searchableText.includes('clipboard.write')) {
    permissions.add('clipboard')
  }
  if (searchableText.includes('clipboard.search') || searchableText.includes('clipboard.gethistory')) {
    permissions.add('clipboard-history')
  }
  if (searchableText.includes('shownotification') || searchableText.includes('notification')) permissions.add('notification')
  if (searchableText.includes('registertool')) permissions.add('ai-tools')
  if (searchableText.includes('db.') || searchableText.includes('.db') || searchableText.includes('dbstorage')) {
    permissions.add('db')
  }
  if (searchableText.includes('screenshot') || searchableText.includes('capture')) permissions.add('screenshot')
  if (searchableText.includes('translate') || searchableText.includes('fetch(') || searchableText.includes('http')) {
    permissions.add('network')
  }
  if (
    searchableText.includes('shellopenexternal') ||
    searchableText.includes('openexternal') ||
    searchableText.includes('shellshowiteminfolder')
  ) {
    permissions.add('shell-open')
  }

  return Array.from(permissions).sort()
}

function collectPluginSourceText(root: string): string {
  const chunks: string[] = []
  collectTextFiles(root, chunks, 0)
  return chunks.join('\n').slice(0, 300000)
}

function collectTextFiles(dir: string, chunks: string[], depth: number): void {
  if (depth > 4 || chunks.join('').length > 300000) return

  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === 'build') continue
    const path = join(dir, name)
    const stat = statSync(path)

    if (stat.isDirectory()) {
      collectTextFiles(path, chunks, depth + 1)
      continue
    }

    if (!stat.isFile() || stat.size > 200000 || !isTextLikeFile(name)) continue
    try {
      chunks.push(readFileSync(path, 'utf8'))
    } catch {
      // Ignore unreadable plugin sample files.
    }
  }
}

function isTextLikeFile(name: string): boolean {
  return /\.(c?js|mjs|ts|tsx|vue|html|json|css|md)$/i.test(name)
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-')
    .replace(/^-+|-+$/g, '')
}
