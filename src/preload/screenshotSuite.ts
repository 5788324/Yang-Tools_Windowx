import { contextBridge, ipcRenderer } from 'electron'
import type { OcrRecognizeResult, TranslateResult } from '../shared/aiToolTypes'

const api = {
  pin: (imagePngBase64: string) => ipcRenderer.invoke('screenshot-suite:pin', imagePngBase64) as Promise<{ ok: boolean; error?: string }>,
  copyImage: (imagePngBase64: string) =>
    ipcRenderer.invoke('screenshot-suite:copy-image', imagePngBase64) as Promise<{ ok: boolean; error?: string }>,
  saveImage: (imagePngBase64: string) =>
    ipcRenderer.invoke('screenshot-suite:save-image', imagePngBase64) as Promise<{ ok: boolean; error?: string; path?: string }>,
  copyText: (text: string) => ipcRenderer.invoke('tools:copy-text', text) as Promise<{ ok: boolean }>,
  ocr: (imagePngBase64: string) =>
    ipcRenderer.invoke('ocr:recognize', { imagePngBase64 }, 'suite') as Promise<OcrRecognizeResult>,
  translate: (text: string, targetLang?: string) =>
    ipcRenderer.invoke('translate:text', { text, targetLang }, 'suite') as Promise<TranslateResult>,
  close: () => ipcRenderer.invoke('screenshot-suite:close') as Promise<{ ok: boolean }>
}

contextBridge.exposeInMainWorld('screenshotSuite', api)

export type ScreenshotSuiteApi = typeof api
