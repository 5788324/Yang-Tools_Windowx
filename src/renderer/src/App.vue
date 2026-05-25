<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type {
  InstalledPluginReport,
  PluginCommandMatch,
  PluginSampleReport,
  PluginSource,
  PluginSummary
} from '../../shared/pluginTypes'

interface AppInfo {
  name: string
  version: string
  isPackaged: boolean
  platform: string
}

const appInfo = ref<AppInfo | null>(null)
const report = ref<PluginSampleReport | null>(null)
const installedReport = ref<InstalledPluginReport | null>(null)
const query = ref('')
const source = ref<'all' | PluginSource>('all')
const loading = ref(true)
const error = ref('')
const openingPluginId = ref('')
const managingPluginId = ref('')
const commandMatches = ref<PluginCommandMatch[]>([])
const matching = ref(false)

const installedIds = computed(() => new Set((installedReport.value?.plugins ?? []).map((plugin) => plugin.id)))

const plugins = computed(() => {
  const samplePlugins = [...(report.value?.ztools.plugins ?? []), ...(report.value?.utools.plugins ?? [])]
  const installedPlugins = installedReport.value?.plugins ?? []
  const items = [...installedPlugins, ...samplePlugins]
  const normalizedQuery = query.value.trim().toLowerCase()

  return items
    .filter((plugin) => source.value === 'all' || plugin.source === source.value)
    .filter((plugin) => {
      if (!normalizedQuery) return true
      return [plugin.title, plugin.name, plugin.description, plugin.triggerTypes.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    })
    .slice(0, 100)
})

const stats = computed(() => {
  const installedCount = installedReport.value?.plugins.length ?? 0
  const ztoolsCount = report.value?.ztools.plugins.length ?? 0
  const utoolsCount = report.value?.utools.plugins.length ?? 0
  const featureCount = plugins.value.reduce((sum, plugin) => sum + plugin.featureCount, 0)

  return { installedCount, ztoolsCount, utoolsCount, featureCount }
})

onMounted(loadData)

async function loadData(): Promise<void> {
  loading.value = true
  error.value = ''

  try {
    const [info, sampleReport, installed] = await Promise.all([
      window.yangTools.getAppInfo(),
      window.yangTools.listPluginSamples(),
      window.yangTools.listInstalledPlugins()
    ])
    appInfo.value = info
    report.value = sampleReport
    installedReport.value = installed
  } catch (currentError) {
    error.value = currentError instanceof Error ? currentError.message : String(currentError)
  } finally {
    loading.value = false
  }
}

function sourceLabel(plugin: PluginSummary): string {
  if (plugin.source === 'yang-tools') return '已安装'
  return plugin.source === 'ztools-local' ? 'ZTools 样本' : 'uTools 索引'
}

function canOpen(plugin: PluginSummary): boolean {
  return plugin.source === 'yang-tools' || plugin.source === 'ztools-local'
}

async function openPlugin(plugin: PluginSummary): Promise<void> {
  error.value = ''
  openingPluginId.value = `${plugin.source}:${plugin.id}`

  try {
    const result = await window.yangTools.openSamplePlugin({
      source: plugin.source,
      id: plugin.id
    })

    if (!result.ok) {
      error.value = result.error || '打开插件失败'
    }
  } catch (currentError) {
    error.value = currentError instanceof Error ? currentError.message : String(currentError)
  } finally {
    openingPluginId.value = ''
  }
}

async function installPlugin(plugin: PluginSummary, overwrite = false): Promise<void> {
  error.value = ''
  managingPluginId.value = `${plugin.source}:${plugin.id}`

  try {
    const result = await window.yangTools.installSamplePlugin({
      source: plugin.source,
      id: plugin.id,
      overwrite
    })

    if (!result.ok) {
      error.value = result.error || '安装插件失败'
      return
    }

    installedReport.value = await window.yangTools.listInstalledPlugins()
  } catch (currentError) {
    error.value = currentError instanceof Error ? currentError.message : String(currentError)
  } finally {
    managingPluginId.value = ''
  }
}

async function uninstallPlugin(plugin: PluginSummary): Promise<void> {
  error.value = ''
  managingPluginId.value = `${plugin.source}:${plugin.id}`

  try {
    const result = await window.yangTools.uninstallPlugin(plugin.id)
    if (!result.ok) {
      error.value = result.error || '卸载插件失败'
      return
    }

    installedReport.value = await window.yangTools.listInstalledPlugins()
  } catch (currentError) {
    error.value = currentError instanceof Error ? currentError.message : String(currentError)
  } finally {
    managingPluginId.value = ''
  }
}

async function matchQuery(): Promise<void> {
  error.value = ''
  const text = query.value.trim()
  if (!text) {
    commandMatches.value = []
    return
  }

  matching.value = true
  try {
    commandMatches.value = await window.yangTools.matchPluginQuery(text)
  } catch (currentError) {
    error.value = currentError instanceof Error ? currentError.message : String(currentError)
  } finally {
    matching.value = false
  }
}

async function runMatch(match: PluginCommandMatch): Promise<void> {
  error.value = ''
  openingPluginId.value = `${match.pluginSource}:${match.pluginId}`

  try {
    const result = await window.yangTools.openSamplePlugin({
      source: match.pluginSource,
      id: match.pluginId,
      code: match.featureCode,
      triggerType: match.triggerType,
      payload: match.payload,
      from: 'search'
    })

    if (!result.ok) {
      error.value = result.error || '运行匹配失败'
    }
  } catch (currentError) {
    error.value = currentError instanceof Error ? currentError.message : String(currentError)
  } finally {
    openingPluginId.value = ''
  }
}
</script>

<template>
  <main class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">Y</div>
        <div>
          <h1>Yang Tools</h1>
          <p>个人 Windows 工具箱</p>
        </div>
      </div>

      <nav class="nav">
        <button class="nav-item active">插件管理</button>
        <button class="nav-item">运行时</button>
        <button class="nav-item">设置</button>
        <button class="nav-item">交接日志</button>
      </nav>

      <div class="build">
        <span>{{ appInfo?.platform || 'win32' }}</span>
        <span>v{{ appInfo?.version || '0.1.0' }}</span>
      </div>
    </aside>

    <section class="content">
      <header class="topbar">
        <div>
          <h2>插件管理中心</h2>
          <p>先管理本机样本和已安装插件，后续接入下载源与自动更新。</p>
        </div>
        <button class="refresh-btn" :disabled="loading" @click="loadData">
          {{ loading ? '扫描中' : '刷新' }}
        </button>
      </header>

      <section class="stats-grid">
        <article class="stat">
          <span>已安装</span>
          <strong>{{ stats.installedCount }}</strong>
        </article>
        <article class="stat">
          <span>ZTools 样本</span>
          <strong>{{ stats.ztoolsCount }}</strong>
        </article>
        <article class="stat">
          <span>uTools 索引</span>
          <strong>{{ stats.utoolsCount }}</strong>
        </article>
        <article class="stat">
          <span>当前功能入口</span>
          <strong>{{ stats.featureCount }}</strong>
        </article>
      </section>

      <section class="toolbar">
        <input v-model="query" placeholder="搜索插件，或输入 1+2 测试计算稿纸" @keyup.enter="matchQuery" />
        <button class="run-btn" :disabled="matching || !query.trim()" @click="matchQuery">
          {{ matching ? '匹配中' : '运行匹配' }}
        </button>
        <div class="segmented">
          <button :class="{ selected: source === 'all' }" @click="source = 'all'">全部</button>
          <button :class="{ selected: source === 'yang-tools' }" @click="source = 'yang-tools'">已安装</button>
          <button :class="{ selected: source === 'ztools-local' }" @click="source = 'ztools-local'">ZTools</button>
          <button :class="{ selected: source === 'utools-remote' }" @click="source = 'utools-remote'">uTools</button>
        </div>
      </section>

      <p v-if="error" class="error">{{ error }}</p>

      <section v-if="commandMatches.length" class="matches">
        <article v-for="match in commandMatches" :key="`${match.pluginId}:${match.featureCode}:${match.triggerLabel}`">
          <div>
            <strong>{{ match.pluginTitle }}</strong>
            <span>{{ match.triggerLabel }}</span>
            <p>{{ match.featureExplain }}</p>
          </div>
          <button :disabled="openingPluginId === `${match.pluginSource}:${match.pluginId}`" @click="runMatch(match)">
            运行
          </button>
        </article>
      </section>

      <section class="plugin-list">
        <article v-for="plugin in plugins" :key="`${plugin.source}:${plugin.id}`" class="plugin-row">
          <div class="plugin-icon">{{ plugin.title.slice(0, 1).toUpperCase() }}</div>
          <div class="plugin-main">
            <div class="plugin-title">
              <strong>{{ plugin.title }}</strong>
              <span>{{ sourceLabel(plugin) }}</span>
            </div>
            <p>{{ plugin.description || plugin.name }}</p>
            <div class="tags">
              <span v-for="permission in plugin.permissions" :key="`permission:${permission}`" class="permission-tag">
                {{ permission }}
              </span>
              <span v-for="trigger in plugin.triggerTypes" :key="trigger">{{ trigger }}</span>
              <span v-for="note in plugin.compatibilityNotes" :key="note">{{ note }}</span>
            </div>
          </div>
          <div class="plugin-meta">
            <span>{{ plugin.featureCount }} 功能</span>
            <span>{{ plugin.commandCount }} 触发</span>
            <button :disabled="!canOpen(plugin) || openingPluginId === `${plugin.source}:${plugin.id}`" @click="openPlugin(plugin)">
              {{ canOpen(plugin) ? '打开' : '待适配' }}
            </button>
            <button
              v-if="plugin.source === 'ztools-local'"
              class="secondary-btn"
              :disabled="managingPluginId === `${plugin.source}:${plugin.id}`"
              @click="installPlugin(plugin, installedIds.has(plugin.id))"
            >
              {{ installedIds.has(plugin.id) ? '更新' : '安装' }}
            </button>
            <button
              v-if="plugin.source === 'yang-tools'"
              class="danger-btn"
              :disabled="managingPluginId === `${plugin.source}:${plugin.id}`"
              @click="uninstallPlugin(plugin)"
            >
              卸载
            </button>
          </div>
        </article>
      </section>
    </section>
  </main>
</template>
