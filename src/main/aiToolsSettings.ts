import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { AiToolHistoryItem, AiToolsSettings } from '../shared/aiToolTypes'

interface AiToolsState {
  settings: AiToolsSettings
  history: AiToolHistoryItem[]
}

const DEFAULT_SETTINGS: AiToolsSettings = {
  ocr: {
    pythonPath: '',
    runtimeStatus: 'unknown'
  },
  translate: {
    defaultProvider: 'libretranslate',
    targetLang: 'zh',
    libretranslate: {
      endpoint: 'http://localhost:5000',
      apiKey: ''
    },
    deepl: {
      endpoint: 'https://api-free.deepl.com/v2/translate',
      apiKey: ''
    },
    openaiCompatible: {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4.1-mini'
    }
  }
}

export function getAiToolsSettings(): AiToolsSettings {
  return cloneSettings(readState().settings)
}

export function setAiToolsSettings(settings: AiToolsSettings): { ok: boolean } {
  const state = readState()
  state.settings = normalizeSettings(settings)
  writeState(state)
  return { ok: true }
}

export function getAiToolHistory(): AiToolHistoryItem[] {
  return readState().history
}

export function addAiToolHistory(item: Omit<AiToolHistoryItem, 'id' | 'createdAt'>): AiToolHistoryItem {
  const state = readState()
  const next = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString()
  }
  state.history = [next, ...state.history].slice(0, 100)
  writeState(state)
  return next
}

function readState(): AiToolsState {
  const file = stateFilePath()
  if (!existsSync(file)) return emptyState()

  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<AiToolsState>
    return {
      settings: normalizeSettings(parsed.settings),
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 100) : []
    }
  } catch {
    return emptyState()
  }
}

function writeState(state: AiToolsState): void {
  const file = stateFilePath()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(state, null, 2), 'utf8')
}

function stateFilePath(): string {
  return join(app.getPath('userData'), 'ai-tools.json')
}

function emptyState(): AiToolsState {
  return {
    settings: cloneSettings(DEFAULT_SETTINGS),
    history: []
  }
}

function normalizeSettings(settings?: Partial<AiToolsSettings>): AiToolsSettings {
  return {
    ocr: {
      pythonPath: String(settings?.ocr?.pythonPath ?? DEFAULT_SETTINGS.ocr.pythonPath),
      runtimeStatus: settings?.ocr?.runtimeStatus ?? DEFAULT_SETTINGS.ocr.runtimeStatus
    },
    translate: {
      defaultProvider: settings?.translate?.defaultProvider ?? DEFAULT_SETTINGS.translate.defaultProvider,
      targetLang: String(settings?.translate?.targetLang ?? DEFAULT_SETTINGS.translate.targetLang),
      libretranslate: {
        endpoint: String(settings?.translate?.libretranslate?.endpoint ?? DEFAULT_SETTINGS.translate.libretranslate.endpoint),
        apiKey: String(settings?.translate?.libretranslate?.apiKey ?? '')
      },
      deepl: {
        endpoint: String(settings?.translate?.deepl?.endpoint ?? DEFAULT_SETTINGS.translate.deepl.endpoint),
        apiKey: String(settings?.translate?.deepl?.apiKey ?? '')
      },
      openaiCompatible: {
        baseUrl: String(settings?.translate?.openaiCompatible?.baseUrl ?? DEFAULT_SETTINGS.translate.openaiCompatible.baseUrl),
        apiKey: String(settings?.translate?.openaiCompatible?.apiKey ?? ''),
        model: String(settings?.translate?.openaiCompatible?.model ?? DEFAULT_SETTINGS.translate.openaiCompatible.model)
      }
    }
  }
}

function cloneSettings(settings: AiToolsSettings): AiToolsSettings {
  return JSON.parse(JSON.stringify(settings)) as AiToolsSettings
}
