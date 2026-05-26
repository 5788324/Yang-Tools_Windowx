import type { TranslateProvider, TranslateRequest, TranslateResult } from '../shared/aiToolTypes'
import { addAiToolHistory, getAiToolsSettings } from './aiToolsSettings'

const PROVIDERS: TranslateProvider[] = ['libretranslate', 'deepl', 'openai-compatible']

export class TranslationService {
  async translate(request: TranslateRequest, source: 'suite' | 'standalone' = 'standalone'): Promise<TranslateResult> {
    const text = request.text.trim()
    if (!text) return { ok: false, translatedText: '', provider: request.provider ?? 'libretranslate', error: '没有可翻译的文本。' }

    const settings = getAiToolsSettings()
    const providers = orderedProviders(request.provider ?? settings.translate.defaultProvider)
    const errors: string[] = []

    for (const provider of providers) {
      const result = await this.translateWithProvider(provider, {
        ...request,
        text,
        targetLang: request.targetLang || settings.translate.targetLang
      })
      if (result.ok) {
        addAiToolHistory({
          type: 'translation',
          source,
          text,
          translatedText: result.translatedText,
          provider
        })
        return result
      }
      if (result.error) errors.push(`${provider}: ${result.error}`)
    }

    return {
      ok: false,
      translatedText: '',
      provider: providers[0],
      error: errors.join('；') || '没有可用翻译服务。'
    }
  }

  async testProvider(provider: TranslateProvider): Promise<TranslateResult> {
    return this.translateWithProvider(provider, {
      text: 'Hello',
      targetLang: 'zh',
      provider
    })
  }

  private async translateWithProvider(provider: TranslateProvider, request: TranslateRequest): Promise<TranslateResult> {
    try {
      if (provider === 'libretranslate') return await translateLibre(request)
      if (provider === 'deepl') return await translateDeepL(request)
      return await translateOpenAiCompatible(request)
    } catch (error) {
      return {
        ok: false,
        translatedText: '',
        provider,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

async function translateLibre(request: TranslateRequest): Promise<TranslateResult> {
  const settings = getAiToolsSettings().translate.libretranslate
  const endpoint = settings.endpoint.replace(/\/$/, '')
  const response = await fetch(`${endpoint}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: request.text,
      source: request.sourceLang || 'auto',
      target: request.targetLang || 'zh',
      format: 'text',
      api_key: settings.apiKey || undefined
    })
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = (await response.json()) as { translatedText?: string; error?: string }
  if (data.error) throw new Error(data.error)
  return { ok: true, translatedText: data.translatedText || '', provider: 'libretranslate' }
}

async function translateDeepL(request: TranslateRequest): Promise<TranslateResult> {
  const settings = getAiToolsSettings().translate.deepl
  if (!settings.apiKey.trim()) throw new Error('缺少 DeepL API Key。')

  const params = new URLSearchParams()
  params.set('text', request.text)
  params.set('target_lang', normalizeDeepLTarget(request.targetLang || 'ZH'))
  if (request.sourceLang && request.sourceLang !== 'auto') params.set('source_lang', request.sourceLang.toUpperCase())

  const response = await fetch(settings.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${settings.apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = (await response.json()) as { translations?: Array<{ text?: string }> }
  return { ok: true, translatedText: data.translations?.[0]?.text || '', provider: 'deepl' }
}

async function translateOpenAiCompatible(request: TranslateRequest): Promise<TranslateResult> {
  const settings = getAiToolsSettings().translate.openaiCompatible
  if (!settings.apiKey.trim()) throw new Error('缺少 OpenAI Compatible API Key。')

  const endpoint = `${settings.baseUrl.replace(/\/$/, '')}/chat/completions`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        {
          role: 'system',
          content: `Translate the user's text to ${request.targetLang || 'zh'}. Keep formatting and do not add explanations.`
        },
        { role: 'user', content: request.text }
      ],
      temperature: 0.2
    })
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return {
    ok: true,
    translatedText: data.choices?.[0]?.message?.content?.trim() || '',
    provider: 'openai-compatible'
  }
}

function orderedProviders(primary: TranslateProvider): TranslateProvider[] {
  return [primary, ...PROVIDERS.filter((provider) => provider !== primary)]
}

function normalizeDeepLTarget(targetLang: string): string {
  const normalized = targetLang.toUpperCase()
  if (normalized === 'ZH') return 'ZH'
  if (normalized === 'EN') return 'EN-US'
  return normalized
}
