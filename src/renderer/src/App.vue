<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { PluginSampleReport, PluginSummary } from '../../shared/pluginTypes'

interface AppInfo {
  name: string
  version: string
  isPackaged: boolean
  platform: string
}

const appInfo = ref<AppInfo | null>(null)
const report = ref<PluginSampleReport | null>(null)
const query = ref('')
const source = ref<'all' | 'ztools-local' | 'utools-remote'>('all')
const loading = ref(true)
const error = ref('')
const openingPluginId = ref('')

const plugins = computed(() => {
  if (!report.value) return []

  const items = [...report.value.ztools.plugins, ...report.value.utools.plugins]
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
    .slice(0, 80)
})

const stats = computed(() => {
  const ztoolsCount = report.value?.ztools.plugins.length ?? 0
  const utoolsCount = report.value?.utools.plugins.length ?? 0
  const featureCount = [...(report.value?.ztools.plugins ?? []), ...(report.value?.utools.plugins ?? [])].reduce(
    (sum, plugin) => sum + plugin.featureCount,
    0
  )

  return { ztoolsCount, utoolsCount, featureCount }
})

onMounted(async () => {
  try {
    const [info, sampleReport] = await Promise.all([
      window.yangTools.getAppInfo(),
      window.yangTools.listPluginSamples()
    ])
    appInfo.value = info
    report.value = sampleReport
  } catch (currentError) {
    error.value = currentError instanceof Error ? currentError.message : String(currentError)
  } finally {
    loading.value = false
  }
})

function sourceLabel(plugin: PluginSummary): string {
  return plugin.source === 'ztools-local' ? 'ZTools' : 'uTools'
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
        <button class="nav-item active">插件样本</button>
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
          <h2>插件兼容样本库</h2>
          <p>ZTools 与 uTools 插件索引扫描结果，后续会逐步适配运行。</p>
        </div>
        <div class="status" :class="{ loading }">{{ loading ? '扫描中' : '已就绪' }}</div>
      </header>

      <section class="stats-grid">
        <article class="stat">
          <span>ZTools 样本</span>
          <strong>{{ stats.ztoolsCount }}</strong>
        </article>
        <article class="stat">
          <span>uTools 索引</span>
          <strong>{{ stats.utoolsCount }}</strong>
        </article>
        <article class="stat">
          <span>功能入口</span>
          <strong>{{ stats.featureCount }}</strong>
        </article>
      </section>

      <section class="toolbar">
        <input v-model="query" placeholder="搜索插件、描述或触发类型" />
        <div class="segmented">
          <button :class="{ selected: source === 'all' }" @click="source = 'all'">全部</button>
          <button :class="{ selected: source === 'ztools-local' }" @click="source = 'ztools-local'">ZTools</button>
          <button :class="{ selected: source === 'utools-remote' }" @click="source = 'utools-remote'">uTools</button>
        </div>
      </section>

      <p v-if="error" class="error">{{ error }}</p>

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
              <span v-for="trigger in plugin.triggerTypes" :key="trigger">{{ trigger }}</span>
              <span v-for="note in plugin.compatibilityNotes" :key="note">{{ note }}</span>
            </div>
          </div>
          <div class="plugin-meta">
            <span>{{ plugin.featureCount }} 功能</span>
            <span>{{ plugin.commandCount }} 触发</span>
            <button
              :disabled="plugin.source !== 'ztools-local' || openingPluginId === `${plugin.source}:${plugin.id}`"
              @click="openPlugin(plugin)"
            >
              {{ plugin.source === 'ztools-local' ? '打开' : '待适配' }}
            </button>
          </div>
        </article>
      </section>
    </section>
  </main>
</template>
