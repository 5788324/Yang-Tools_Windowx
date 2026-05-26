<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { AiToolHistoryItem, AiToolsSettings, AiToolsStatus, TranslateProvider } from '../../shared/aiToolTypes'
import type {
  InstalledPluginReport,
  PluginCommandMatch,
  OpenPluginRequest,
  PluginSampleReport,
  PluginSource,
  PluginSummary,
  PluginTrustGrant
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
const pendingLaunch = ref<{ plugin: PluginSummary; request: OpenPluginRequest } | null>(null)
const rememberLaunchTrust = ref(true)
const capturingScreenshot = ref(false)
const activeView = ref<'plugins' | 'tools' | 'settings' | 'handoff'>('plugins')
const aiSettings = ref<AiToolsSettings | null>(null)
const ocrStatus = ref<AiToolsStatus['ocr'] | null>(null)
const aiHistory = ref<AiToolHistoryItem[]>([])
const ocrText = ref('')
const translationInput = ref('')
const translationText = ref('')
const aiBusy = ref('')
const aiStatusMessage = ref('')
const selectedImageName = ref('')
const imageFileInput = ref<HTMLInputElement | null>(null)

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
    await loadAiTools()
  } catch (currentError) {
    error.value = currentError instanceof Error ? currentError.message : String(currentError)
  } finally {
    loading.value = false
  }
}

async function loadAiTools(): Promise<void> {
  const [settings, status, history] = await Promise.all([
    window.yangTools.getAiToolsSettings(),
    window.yangTools.getOcrStatus(),
    window.yangTools.getAiToolHistory()
  ])
  aiSettings.value = settings
  ocrStatus.value = status
  aiHistory.value = history
}

function sourceLabel(plugin: PluginSummary): string {
  if (plugin.source === 'yang-tools') return '已安装'
  return plugin.source === 'ztools-local' ? 'ZTools 样本' : 'uTools 索引'
}

function canOpen(plugin: PluginSummary): boolean {
  return plugin.source === 'yang-tools' || plugin.source === 'ztools-local'
}

function findPlugin(sourceValue: PluginSource, id: string): PluginSummary | null {
  return (
    [...(installedReport.value?.plugins ?? []), ...(report.value?.ztools.plugins ?? []), ...(report.value?.utools.plugins ?? [])].find(
      (plugin) => plugin.source === sourceValue && plugin.id === id
    ) ?? null
  )
}

function trustGrant(plugin: PluginSummary): PluginTrustGrant {
  return {
    source: plugin.source,
    id: plugin.id,
    version: plugin.version,
    permissions: [...plugin.permissions]
  }
}

function normalizeLaunchRequest(request: OpenPluginRequest): OpenPluginRequest {
  return {
    source: request.source,
    id: request.id,
    code: request.code,
    triggerType: request.triggerType,
    payload: request.payload,
    from: request.from
  }
}

async function requestOpenPlugin(plugin: PluginSummary, request?: Partial<OpenPluginRequest>): Promise<void> {
  if (!canOpen(plugin)) {
    error.value = '该插件来源暂未适配打开。'
    return
  }

  const launchRequest = {
    source: plugin.source,
    id: plugin.id,
    ...request
  }

  try {
    if (await window.yangTools.isPluginTrusted(trustGrant(plugin))) {
      await openPlugin(launchRequest)
      return
    }
  } catch (currentError) {
    error.value = currentError instanceof Error ? currentError.message : String(currentError)
    return
  }

  rememberLaunchTrust.value = true
  pendingLaunch.value = {
    plugin,
    request: launchRequest
  }
}

function cancelLaunch(): void {
  pendingLaunch.value = null
}

async function confirmLaunch(): Promise<void> {
  const pending = pendingLaunch.value
  if (!pending) return

  pendingLaunch.value = null
  if (rememberLaunchTrust.value) {
    await window.yangTools.trustPlugin(trustGrant(pending.plugin))
  }
  await openPlugin(normalizeLaunchRequest(pending.request))
}

async function openPlugin(request: OpenPluginRequest): Promise<void> {
  error.value = ''
  openingPluginId.value = `${request.source}:${request.id}`

  try {
    const result = await window.yangTools.openSamplePlugin(normalizeLaunchRequest(request))

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
  const plugin = findPlugin(match.pluginSource, match.pluginId)

  if (!plugin) {
    error.value = `未找到匹配插件：${match.pluginTitle}`
    return
  }

  void requestOpenPlugin(plugin, {
    code: match.featureCode,
    triggerType: match.triggerType,
    payload: match.payload,
    from: 'search'
  })
}

async function captureAndPinScreenshot(): Promise<void> {
  error.value = ''
  capturingScreenshot.value = true

  try {
    const result = await window.yangTools.captureAndPinScreenshot()
    if (!result.ok) {
      error.value = result.error || '截图钉图失败'
    }
  } catch (currentError) {
    error.value = currentError instanceof Error ? currentError.message : String(currentError)
  } finally {
    capturingScreenshot.value = false
  }
}

async function openCaptureSuite(): Promise<void> {
  await captureAndPinScreenshot()
}

function chooseImageFile(): void {
  imageFileInput.value?.click()
}

async function recognizeSelectedFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  selectedImageName.value = file.name
  const dataUrl = await readFileAsDataUrl(file)
  await recognizeImage(dataUrl)
}

async function recognizeClipboardImage(): Promise<void> {
  error.value = ''
  aiStatusMessage.value = ''
  aiBusy.value = 'ocr'

  try {
    const result = await window.yangTools.readClipboardImage()
    if (!result.ok || !result.imagePngBase64) {
      error.value = result.error || '剪贴板没有图片'
      return
    }
    selectedImageName.value = '剪贴板图片'
    await recognizeImage(result.imagePngBase64)
  } catch (currentError) {
    error.value = currentError instanceof Error ? currentError.message : String(currentError)
  } finally {
    aiBusy.value = ''
  }
}

async function recognizeImage(imagePngBase64: string): Promise<void> {
  error.value = ''
  aiStatusMessage.value = 'OCR 识别中...'
  aiBusy.value = 'ocr'

  try {
    const result = await window.yangTools.recognizeOcr({ imagePngBase64 })
    ocrText.value = result.text
    translationInput.value = result.text
    aiStatusMessage.value = result.ok ? 'OCR 完成' : result.error || 'OCR 失败'
    await loadAiTools()
  } catch (currentError) {
    error.value = currentError instanceof Error ? currentError.message : String(currentError)
  } finally {
    aiBusy.value = ''
  }
}

async function translateCurrentText(): Promise<void> {
  error.value = ''
  aiStatusMessage.value = '翻译中...'
  aiBusy.value = 'translate'

  try {
    const result = await window.yangTools.translateText({
      text: translationInput.value || ocrText.value,
      targetLang: aiSettings.value?.translate.targetLang
    })
    translationText.value = result.translatedText
    aiStatusMessage.value = result.ok ? `翻译完成：${result.provider}` : result.error || '翻译失败'
    await loadAiTools()
  } catch (currentError) {
    error.value = currentError instanceof Error ? currentError.message : String(currentError)
  } finally {
    aiBusy.value = ''
  }
}

async function translateClipboardText(): Promise<void> {
  translationInput.value = await window.yangTools.readClipboardText()
  await translateCurrentText()
}

async function copyAiText(text: string): Promise<void> {
  await window.yangTools.copyText(text)
  aiStatusMessage.value = text ? '已复制文字' : '没有可复制的文字'
}

async function saveAiSettings(): Promise<void> {
  if (!aiSettings.value) return
  await window.yangTools.setAiToolsSettings(aiSettings.value)
  await loadAiTools()
  aiStatusMessage.value = 'AI 工具设置已保存'
}

async function testProvider(provider: TranslateProvider): Promise<void> {
  aiBusy.value = `test:${provider}`
  aiStatusMessage.value = `测试 ${provider}...`
  try {
    const result = await window.yangTools.testTranslateProvider(provider)
    aiStatusMessage.value = result.ok ? `${provider} 可用` : result.error || `${provider} 不可用`
  } finally {
    aiBusy.value = ''
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
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
        <button class="nav-item" :class="{ active: activeView === 'plugins' }" @click="activeView = 'plugins'">插件管理</button>
        <button class="nav-item" :class="{ active: activeView === 'tools' }" @click="activeView = 'tools'">截图/OCR/翻译</button>
        <button class="nav-item" :class="{ active: activeView === 'settings' }" @click="activeView = 'settings'">AI 设置</button>
        <button class="nav-item" :class="{ active: activeView === 'handoff' }" @click="activeView = 'handoff'">交接日志</button>
      </nav>

      <div class="build">
        <span>{{ appInfo?.platform || 'win32' }}</span>
        <span>v{{ appInfo?.version || '0.1.0' }}</span>
      </div>
    </aside>

    <section v-if="activeView === 'plugins'" class="content">
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

      <section class="quick-tools">
        <button
          :disabled="capturingScreenshot"
          title="Ctrl+Shift+S"
          @click="captureAndPinScreenshot"
        >
          {{ capturingScreenshot ? '截图中' : '截图钉图' }}
        </button>
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
            <button
              :disabled="!canOpen(plugin) || openingPluginId === `${plugin.source}:${plugin.id}`"
              @click="requestOpenPlugin(plugin)"
            >
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

    <section v-else-if="activeView === 'tools'" class="content">
      <header class="topbar">
        <div>
          <h2>截图 / OCR / 翻译</h2>
          <p>综合截图面板负责高频操作，独立入口用于剪贴板、图片文件和文本翻译。</p>
        </div>
        <button class="refresh-btn" @click="loadAiTools">刷新状态</button>
      </header>

      <section class="tool-grid">
        <article class="tool-panel">
          <h3>综合截图工具</h3>
          <p>选区后进入编辑面板，可标注、钉图、复制、保存、OCR、翻译。</p>
          <button class="primary-action" :disabled="capturingScreenshot" @click="openCaptureSuite">
            {{ capturingScreenshot ? '截图中' : '打开截图工具' }}
          </button>
          <span class="hint">快捷键：Ctrl+Shift+S</span>
        </article>

        <article class="tool-panel">
          <h3>OCR 文字识别</h3>
          <p>{{ ocrStatus?.message || '正在读取 OCR 状态' }}</p>
          <div class="button-row">
            <button :disabled="aiBusy === 'ocr'" @click="chooseImageFile">选择图片</button>
            <button :disabled="aiBusy === 'ocr'" @click="recognizeClipboardImage">识别剪贴板图片</button>
          </div>
          <input ref="imageFileInput" type="file" accept="image/*" hidden @change="recognizeSelectedFile" />
          <span class="hint">{{ selectedImageName || ocrStatus?.runtimePath }}</span>
          <textarea v-model="ocrText" placeholder="OCR 结果"></textarea>
          <div class="button-row">
            <button @click="copyAiText(ocrText)">复制 OCR 文本</button>
            <button :disabled="!ocrText.trim() || aiBusy === 'translate'" @click="translationInput = ocrText; translateCurrentText()">翻译 OCR 文本</button>
          </div>
        </article>

        <article class="tool-panel">
          <h3>翻译</h3>
          <textarea v-model="translationInput" placeholder="输入要翻译的文本"></textarea>
          <div class="button-row">
            <button :disabled="aiBusy === 'translate' || !translationInput.trim()" @click="translateCurrentText">翻译文本</button>
            <button :disabled="aiBusy === 'translate'" @click="translateClipboardText">翻译剪贴板文本</button>
            <button @click="copyAiText(translationText)">复制译文</button>
          </div>
          <textarea v-model="translationText" placeholder="翻译结果"></textarea>
        </article>

        <article class="tool-panel">
          <h3>最近记录</h3>
          <div class="history-list">
            <button v-for="item in aiHistory.slice(0, 8)" :key="item.id" @click="copyAiText(item.translatedText || item.text)">
              <strong>{{ item.type === 'ocr' ? 'OCR' : item.provider }}</strong>
              <span>{{ item.translatedText || item.text }}</span>
            </button>
          </div>
        </article>
      </section>

      <p v-if="aiStatusMessage" class="status-line">{{ aiStatusMessage }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </section>

    <section v-else-if="activeView === 'settings'" class="content">
      <header class="topbar">
        <div>
          <h2>AI 工具设置</h2>
          <p>PaddleOCR runtime 不随仓库提交；翻译 API Key 仅保存在本机 userData。</p>
        </div>
        <button class="refresh-btn" @click="saveAiSettings">保存</button>
      </header>

      <section v-if="aiSettings" class="settings-grid">
        <article class="settings-panel">
          <h3>PaddleOCR</h3>
          <label>
            Python 路径
            <input v-model="aiSettings.ocr.pythonPath" placeholder="例如 C:\\Users\\YANG\\AppData\\Roaming\\Yang Tools\\ocr-runtime\\.venv\\Scripts\\python.exe" />
          </label>
          <p>{{ ocrStatus?.message }}</p>
          <p class="hint">sidecar：{{ ocrStatus?.scriptPath }}</p>
          <p class="hint">安装命令：npm.cmd run ocr:install-runtime</p>
          <p class="hint">默认安装后复制 python-path.txt 内路径到上方输入框。</p>
        </article>

        <article class="settings-panel">
          <h3>翻译默认值</h3>
          <label>
            默认 Provider
            <select v-model="aiSettings.translate.defaultProvider">
              <option value="libretranslate">LibreTranslate</option>
              <option value="deepl">DeepL</option>
              <option value="openai-compatible">OpenAI Compatible</option>
            </select>
          </label>
          <label>
            目标语言
            <input v-model="aiSettings.translate.targetLang" placeholder="zh / en / ja" />
          </label>
        </article>

        <article class="settings-panel">
          <h3>LibreTranslate</h3>
          <label>
            Endpoint
            <input v-model="aiSettings.translate.libretranslate.endpoint" />
          </label>
          <label>
            API Key
            <input v-model="aiSettings.translate.libretranslate.apiKey" type="password" />
          </label>
          <button @click="testProvider('libretranslate')">测试 LibreTranslate</button>
        </article>

        <article class="settings-panel">
          <h3>DeepL</h3>
          <label>
            Endpoint
            <input v-model="aiSettings.translate.deepl.endpoint" />
          </label>
          <label>
            API Key
            <input v-model="aiSettings.translate.deepl.apiKey" type="password" />
          </label>
          <button @click="testProvider('deepl')">测试 DeepL</button>
        </article>

        <article class="settings-panel">
          <h3>OpenAI Compatible</h3>
          <label>
            Base URL
            <input v-model="aiSettings.translate.openaiCompatible.baseUrl" />
          </label>
          <label>
            Model
            <input v-model="aiSettings.translate.openaiCompatible.model" />
          </label>
          <label>
            API Key
            <input v-model="aiSettings.translate.openaiCompatible.apiKey" type="password" />
          </label>
          <button @click="testProvider('openai-compatible')">测试 OpenAI Compatible</button>
        </article>
      </section>

      <p v-if="aiStatusMessage" class="status-line">{{ aiStatusMessage }}</p>
    </section>

    <section v-else class="content">
      <header class="topbar">
        <div>
          <h2>交接日志</h2>
          <p>当前交接文档在 docs/HANDOFF.md，每日记录在 docs/worklogs/。</p>
        </div>
      </header>
      <section class="tool-panel">
        <p>本页先作为入口占位。后续可以直接读取 Markdown 渲染到应用内。</p>
      </section>
    </section>

    <section v-if="pendingLaunch" class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="permission-modal">
        <header>
          <h3>{{ pendingLaunch.plugin.title }}</h3>
          <span>{{ sourceLabel(pendingLaunch.plugin) }}</span>
        </header>

        <div class="permission-list">
          <span v-if="!pendingLaunch.plugin.permissions.length">basic-runtime</span>
          <span v-for="permission in pendingLaunch.plugin.permissions" :key="permission">{{ permission }}</span>
        </div>

        <label class="remember-trust">
          <input v-model="rememberLaunchTrust" type="checkbox" />
          <span>记住此版本和权限组合</span>
        </label>

        <footer>
          <button class="secondary-btn" @click="cancelLaunch">取消</button>
          <button class="confirm-btn" @click="confirmLaunch">允许并打开</button>
        </footer>
      </div>
    </section>
  </main>
</template>
