import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface PluginApiUsage {
  plugin: string
  files: string[]
  ztoolsApis: string[]
  dbApis: string[]
  utoolsApis: string[]
}

const root = process.cwd()
const ztoolsRoot = join(root, 'local-plugin-library', 'ztools')
const outDir = join(root, 'docs', 'plugin-analysis')
const usages = existsSync(ztoolsRoot) ? analyzeZtoolsPlugins(ztoolsRoot) : []

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

writeFileSync(join(outDir, 'ztools-api-usage.json'), JSON.stringify(usages, null, 2), 'utf8')
writeFileSync(join(outDir, 'ztools-api-usage.md'), toMarkdown(usages), 'utf8')

console.log(`Wrote ${join(outDir, 'ztools-api-usage.json')}`)
console.log(`Wrote ${join(outDir, 'ztools-api-usage.md')}`)

function analyzeZtoolsPlugins(rootPath: string): PluginApiUsage[] {
  return readdirSync(rootPath)
    .map((name) => join(rootPath, name))
    .filter((dir) => statSync(dir).isDirectory())
    .map((dir) => analyzePlugin(dir))
}

function analyzePlugin(pluginDir: string): PluginApiUsage {
  const files = collectScriptFiles(pluginDir)
  const text = files.map((file) => readFileSync(file, 'utf8')).join('\n')

  return {
    plugin: pluginDir.split(/[\\/]/).pop() || pluginDir,
    files: files.map((file) => file.slice(pluginDir.length + 1)),
    ztoolsApis: uniqueMatches(text, /(?:window\.)?ztools\.([a-zA-Z_$][\w$]*)/g),
    dbApis: uniqueMatches(text, /(?:window\.)?ztools\.db\.([a-zA-Z_$][\w$]*)/g),
    utoolsApis: uniqueMatches(text, /(?:window\.)?utools\.([a-zA-Z_$][\w$]*)/g)
  }
}

function collectScriptFiles(dir: string): string[] {
  const files: string[] = []

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'assets') continue
      files.push(...collectScriptFiles(fullPath))
      continue
    }

    if (/\.(js|html)$/i.test(entry)) files.push(fullPath)
  }

  return files
}

function uniqueMatches(text: string, regex: RegExp): string[] {
  return Array.from(new Set(Array.from(text.matchAll(regex), (match) => match[1]))).sort()
}

function toMarkdown(usages: PluginApiUsage[]): string {
  return [
    '# ZTools API 使用分析',
    '',
    '来源：`local-plugin-library/ztools`。该文件只记录 API 名称，不包含第三方插件源码。',
    '',
    '| 插件 | ztools API | db API | utools API |',
    '|---|---|---|---|',
    ...usages.map(
      (usage) =>
        `| ${usage.plugin} | ${usage.ztoolsApis.join(', ') || '-'} | ${usage.dbApis.join(', ') || '-'} | ${
          usage.utoolsApis.join(', ') || '-'
        } |`
    )
  ].join('\n')
}
