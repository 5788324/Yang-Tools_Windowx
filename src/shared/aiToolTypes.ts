export type TranslateProvider = 'libretranslate' | 'deepl' | 'openai-compatible'

export interface OcrBlock {
  text: string
  score?: number
  box?: Array<[number, number]>
}

export interface OcrRecognizeRequest {
  imagePngBase64: string
  langHint?: string
}

export interface OcrRecognizeResult {
  ok: boolean
  text: string
  blocks: OcrBlock[]
  error?: string
}

export interface TranslateRequest {
  text: string
  sourceLang?: string
  targetLang?: string
  provider?: TranslateProvider
}

export interface TranslateResult {
  ok: boolean
  translatedText: string
  provider: TranslateProvider
  error?: string
}

export interface AiToolsSettings {
  ocr: {
    pythonPath: string
    runtimeStatus: 'missing' | 'available' | 'unknown'
  }
  translate: {
    defaultProvider: TranslateProvider
    targetLang: string
    libretranslate: {
      endpoint: string
      apiKey: string
    }
    deepl: {
      endpoint: string
      apiKey: string
    }
    openaiCompatible: {
      baseUrl: string
      apiKey: string
      model: string
    }
  }
}

export interface AiToolsStatus {
  ocr: {
    available: boolean
    pythonPath: string
    runtimePath: string
    scriptPath: string
    message: string
  }
}

export interface AiToolHistoryItem {
  id: string
  type: 'ocr' | 'translation'
  source: 'suite' | 'standalone'
  text: string
  translatedText?: string
  provider?: TranslateProvider
  createdAt: string
}
