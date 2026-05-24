import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { RawPluginManifest } from '../src/shared/pluginTypes'

const root = process.cwd()
const sampleRoot = join(root, 'local-plugin-library')
const outDir = join(root, 'docs', 'plugin-analysis')

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

const ztools = readZtools()
const utools = readUtoolsRemote()

const summary = {
  generatedAt: 'stable-local-analysis',
  ztools,
  utools
}

writeFileSync(join(outDir, 'sample-summary.json'), JSON.stringify(summary, null, 2), 'utf8')
writeFileSync(join(outDir, 'sample-summary.md'), toMarkdown(summary), 'utf8')

console.log(`Wrote ${join(outDir, 'sample-summary.json')}`)
console.log(`Wrote ${join(outDir, 'sample-summary.md')}`)

function readZtools(): RawPluginManifest[] {
  const ztoolsRoot = join(sampleRoot, 'ztools')
  if (!existsSync(ztoolsRoot)) return []

  return readdirSync(ztoolsRoot)
    .map((name) => join(ztoolsRoot, name))
    .filter((dir) => statSync(dir).isDirectory())
    .map((dir) => join(dir, 'plugin.json'))
    .filter((file) => existsSync(file))
    .map((file) => JSON.parse(readFileSync(file, 'utf8')) as RawPluginManifest)
}

function readUtoolsRemote(): RawPluginManifest[] {
  const remotePath = join(sampleRoot, 'utools', 'remote')
  if (!existsSync(remotePath)) return []

  const remote = JSON.parse(readFileSync(remotePath, 'utf8')) as { data?: string }
  const data = remote.data ? (JSON.parse(remote.data) as { plugins?: RawPluginManifest[] }) : {}
  return data.plugins ?? []
}

function toMarkdown(data: { generatedAt: string; ztools: RawPluginManifest[]; utools: RawPluginManifest[] }): string {
  const rows = [...data.ztools.map((plugin) => row('ZTools', plugin)), ...data.utools.map((plugin) => row('uTools', plugin))]

  return [
    '# 插件样本分析',
    '',
    `生成时间：${data.generatedAt}`,
    '',
    `- ZTools 样本：${data.ztools.length}`,
    `- uTools 索引：${data.utools.length}`,
    '',
    '| 来源 | 名称 | ID | 功能数 | 触发数 |',
    '|---|---|---|---:|---:|',
    ...rows
  ].join('\n')
}

function row(source: string, plugin: RawPluginManifest): string {
  const features = Array.isArray(plugin.features) ? plugin.features : []
  const commandCount = features.reduce((sum, feature) => sum + (feature.cmds?.length ?? 0), 0)
  const title = plugin.title || plugin.pluginName || plugin.name || '未命名'
  const id = plugin.name || plugin.id || ''

  return `| ${source} | ${escapeCell(title)} | ${escapeCell(id)} | ${features.length} | ${commandCount} |`
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|')
}
