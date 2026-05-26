import { app } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { AiToolsStatus, OcrRecognizeRequest, OcrRecognizeResult } from '../shared/aiToolTypes'
import { addAiToolHistory, getAiToolsSettings } from './aiToolsSettings'

export class OcrService {
  status(): AiToolsStatus['ocr'] {
    const pythonPath = this.resolvePythonPath()
    const scriptPath = this.resolveScriptPath()
    const runtimePath = this.runtimePath()
    const scriptExists = existsSync(scriptPath)
    const hasPython = Boolean(pythonPath)

    if (!scriptExists) {
      return {
        available: false,
        pythonPath,
        runtimePath,
        scriptPath,
        message: 'OCR sidecar script is missing.'
      }
    }

    if (!hasPython) {
      return {
        available: false,
        pythonPath,
        runtimePath,
        scriptPath,
        message: 'PaddleOCR runtime is not installed. Configure a Python path or install runtime under userData/ocr-runtime.'
      }
    }

    return {
      available: true,
      pythonPath,
      runtimePath,
      scriptPath,
      message: 'OCR runtime path is configured. PaddleOCR import is checked when recognition runs.'
    }
  }

  async recognize(request: OcrRecognizeRequest, source: 'suite' | 'standalone' = 'standalone'): Promise<OcrRecognizeResult> {
    const imagePngBase64 = stripDataUrl(request.imagePngBase64)
    if (!imagePngBase64) {
      return { ok: false, text: '', blocks: [], error: '没有可识别的图片。' }
    }

    const status = this.status()
    if (!status.available) {
      return { ok: false, text: '', blocks: [], error: status.message }
    }

    const result = await runSidecar(status.pythonPath, status.scriptPath, {
      imagePngBase64,
      langHint: request.langHint || 'ch'
    })

    if (result.ok && result.text.trim()) {
      addAiToolHistory({ type: 'ocr', source, text: result.text })
    }

    return result
  }

  private resolvePythonPath(): string {
    const configured = getAiToolsSettings().ocr.pythonPath.trim()
    if (configured) return configured

    const envPath = process.env.YANG_TOOLS_PADDLEOCR_PYTHON?.trim()
    if (envPath) return envPath

    const runtimePython = join(this.runtimePath(), '.venv', 'Scripts', 'python.exe')
    if (existsSync(runtimePython)) return runtimePython

    return ''
  }

  private resolveScriptPath(): string {
    const appScript = join(app.getAppPath(), 'scripts', 'paddle_ocr_sidecar.py')
    if (existsSync(appScript)) return appScript

    return join(process.cwd(), 'scripts', 'paddle_ocr_sidecar.py')
  }

  private runtimePath(): string {
    return join(app.getPath('userData'), 'ocr-runtime')
  }
}

function runSidecar(
  pythonPath: string,
  scriptPath: string,
  payload: { imagePngBase64: string; langHint: string }
): Promise<OcrRecognizeResult> {
  return new Promise((resolve) => {
    const child = spawn(pythonPath, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      resolve({ ok: false, text: '', blocks: [], error: 'OCR 识别超时。' })
    }, 30000)

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ ok: false, text: '', blocks: [], error: `无法启动 OCR runtime：${error.message}` })
    })
    child.on('close', () => {
      clearTimeout(timer)
      try {
        const parsed = JSON.parse(stdout) as OcrRecognizeResult
        resolve(parsed.ok ? parsed : { ok: false, text: '', blocks: [], error: parsed.error || stderr || 'OCR 识别失败。' })
      } catch {
        resolve({ ok: false, text: '', blocks: [], error: stderr || 'OCR 返回结果无法解析。' })
      }
    })

    child.stdin.end(JSON.stringify(payload))
  })
}

function stripDataUrl(value: string): string {
  const marker = 'base64,'
  const index = value.indexOf(marker)
  return index >= 0 ? value.slice(index + marker.length) : value
}
