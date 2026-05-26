import { BrowserWindow, clipboard, desktopCapturer, dialog, nativeImage, screen, type NativeImage } from 'electron'
import { writeFileSync } from 'node:fs'
import { resolvePreloadPath } from './preloadPath'

export interface CapturePinResult {
  ok: boolean
  error?: string
}

interface SelectionRect {
  x: number
  y: number
  width: number
  height: number
}

interface ActiveSelection {
  win: BrowserWindow
  image: NativeImage
  scaleX: number
  scaleY: number
  workAreaWidth: number
  workAreaHeight: number
}

export class ScreenshotPinManager {
  private windows = new Set<BrowserWindow>()
  private suiteWindows = new Set<BrowserWindow>()
  private images = new Map<number, NativeImage>()
  private activeSelections = new Map<number, ActiveSelection>()

  async captureDisplaysAndPin(): Promise<CapturePinResult> {
    this.cancelSelection()

    const displays = screen.getAllDisplays()
    const maxScale = Math.max(...displays.map((display) => display.scaleFactor), 1)
    const maxWidth = Math.max(...displays.map((display) => Math.floor(display.size.width * maxScale)), 1)
    const maxHeight = Math.max(...displays.map((display) => Math.floor(display.size.height * maxScale)), 1)
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: maxWidth, height: maxHeight }
    })

    if (!sources.length) {
      return { ok: false, error: '未能捕获屏幕截图。' }
    }

    for (const display of displays) {
      const source = sources.find((item) => item.display_id === String(display.id))
      if (!source || source.thumbnail.isEmpty()) continue
      this.openSelectionOverlay(source.thumbnail, display)
    }

    if (!this.activeSelections.size) {
      return { ok: false, error: '未能捕获屏幕截图。' }
    }

    return { ok: true }
  }

  completeSelection(windowId: number, rect: SelectionRect): CapturePinResult {
    const active = this.activeSelections.get(windowId)
    if (!active) return { ok: false, error: '当前没有截图选择任务。' }

    const normalized = normalizeRect(rect)
    if (normalized.width < 8 || normalized.height < 8) {
      return { ok: false, error: '选择区域太小。' }
    }

    const imageSize = active.image.getSize()
    const cropX = Math.max(0, Math.floor(normalized.x * active.scaleX))
    const cropY = Math.max(0, Math.floor(normalized.y * active.scaleY))
    const cropRect = {
      x: cropX,
      y: cropY,
      width: Math.max(1, Math.min(imageSize.width - cropX, Math.floor(normalized.width * active.scaleX))),
      height: Math.max(1, Math.min(imageSize.height - cropY, Math.floor(normalized.height * active.scaleY)))
    }

    const cropped = active.image.crop(cropRect)
    const maxWidth = Math.min(active.workAreaWidth, Math.max(320, normalized.width))
    const maxHeight = Math.min(active.workAreaHeight, Math.max(220, normalized.height))

    this.cancelSelection()
    this.openScreenshotSuite(cropped, maxWidth, maxHeight)
    return { ok: true }
  }

  cancelSelection(): { ok: boolean } {
    for (const active of this.activeSelections.values()) {
      if (!active.win.isDestroyed()) active.win.close()
    }
    this.activeSelections.clear()
    return { ok: true }
  }

  closeAll(): void {
    this.cancelSelection()
    for (const win of this.windows) {
      if (!win.isDestroyed()) win.close()
    }
    for (const win of this.suiteWindows) {
      if (!win.isDestroyed()) win.close()
    }
    this.windows.clear()
    this.suiteWindows.clear()
    this.images.clear()
  }

  copyPinnedImage(windowId: number): CapturePinResult {
    const image = this.images.get(windowId)
    if (!image) return { ok: false, error: '未找到钉图图片。' }

    clipboard.writeImage(image)
    return { ok: true }
  }

  async savePinnedImage(windowId: number): Promise<CapturePinResult & { path?: string }> {
    const image = this.images.get(windowId)
    if (!image) return { ok: false, error: '未找到钉图图片。' }

    const result = await dialog.showSaveDialog({
      title: '保存钉图',
      defaultPath: `Yang-Tools-Screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`,
      filters: [{ name: 'PNG Image', extensions: ['png'] }]
    })

    if (result.canceled || !result.filePath) return { ok: false, error: '已取消保存。' }

    writeFileSync(result.filePath, image.toPNG())
    return { ok: true, path: result.filePath }
  }

  closePinnedImage(windowId: number): { ok: boolean } {
    const win = BrowserWindow.fromId(windowId)
    if (win && !win.isDestroyed()) win.close()
    return { ok: true }
  }

  pinImageDataUrl(imagePngBase64: string): CapturePinResult {
    const image = nativeImageFromDataUrl(imagePngBase64)
    if (image.isEmpty()) return { ok: false, error: '图片数据无效，无法钉图。' }
    const imageSize = image.getSize()
    this.openPinnedImage(image, imageSize.width, imageSize.height)
    return { ok: true }
  }

  copyImageDataUrl(imagePngBase64: string): CapturePinResult {
    const image = nativeImageFromDataUrl(imagePngBase64)
    if (image.isEmpty()) return { ok: false, error: '图片数据无效，无法复制。' }
    clipboard.writeImage(image)
    return { ok: true }
  }

  async saveImageDataUrl(imagePngBase64: string): Promise<CapturePinResult & { path?: string }> {
    const image = nativeImageFromDataUrl(imagePngBase64)
    if (image.isEmpty()) return { ok: false, error: '图片数据无效，无法保存。' }

    const result = await dialog.showSaveDialog({
      title: '保存截图',
      defaultPath: `Yang-Tools-Screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`,
      filters: [{ name: 'PNG Image', extensions: ['png'] }]
    })

    if (result.canceled || !result.filePath) return { ok: false, error: '已取消保存。' }

    writeFileSync(result.filePath, image.toPNG())
    return { ok: true, path: result.filePath }
  }

  closeSuiteWindow(windowId: number): { ok: boolean } {
    const win = BrowserWindow.fromId(windowId)
    if (win && !win.isDestroyed()) win.close()
    return { ok: true }
  }

  private openSelectionOverlay(image: NativeImage, display: Electron.Display): void {
    const win = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      resizable: false,
      movable: false,
      alwaysOnTop: true,
      fullscreenable: false,
      skipTaskbar: true,
      backgroundColor: '#000000',
      webPreferences: {
        preload: resolvePreloadPath('screenshotSelection'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })

    const imageSize = image.getSize()
    const activeSelection = {
      win,
      image,
      scaleX: imageSize.width / display.bounds.width,
      scaleY: imageSize.height / display.bounds.height,
      workAreaWidth: display.workAreaSize.width,
      workAreaHeight: display.workAreaSize.height
    }
    this.activeSelections.set(win.id, activeSelection)

    win.setAlwaysOnTop(true, 'screen-saver')
    win.on('closed', () => {
      this.activeSelections.delete(win.id)
    })

    void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(selectionHtml(image.toDataURL()))}`)
  }

  private openPinnedImage(image: NativeImage, maxWidth: number, maxHeight: number): void {
    const width = Math.min(900, Math.max(360, Math.floor(maxWidth * 0.55)))
    const height = Math.min(640, Math.max(260, Math.floor(maxHeight * 0.55)))
    const win = new BrowserWindow({
      width,
      height,
      minWidth: 240,
      minHeight: 180,
      title: 'Yang Tools 钉图',
      alwaysOnTop: true,
      backgroundColor: '#111827',
      webPreferences: {
        preload: resolvePreloadPath('pinnedImage'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })

    win.setAlwaysOnTop(true, 'screen-saver')
    win.on('closed', () => {
      this.windows.delete(win)
      this.images.delete(win.id)
    })
    this.windows.add(win)
    this.images.set(win.id, image)

    void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(pinnedImageHtml(image.toDataURL()))}`)
  }

  private openScreenshotSuite(image: NativeImage, maxWidth: number, maxHeight: number): void {
    const width = Math.min(1120, Math.max(760, Math.floor(maxWidth * 0.82)))
    const height = Math.min(760, Math.max(520, Math.floor(maxHeight * 0.82)))
    const win = new BrowserWindow({
      width,
      height,
      minWidth: 720,
      minHeight: 480,
      title: 'Yang Tools 截图工具',
      alwaysOnTop: true,
      backgroundColor: '#111827',
      webPreferences: {
        preload: resolvePreloadPath('screenshotSuite'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })

    win.setAlwaysOnTop(true, 'screen-saver')
    win.on('closed', () => {
      this.suiteWindows.delete(win)
    })
    this.suiteWindows.add(win)

    void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(screenshotSuiteHtml(image.toDataURL()))}`)
  }
}

function nativeImageFromDataUrl(value: string): NativeImage {
  const dataUrl = value.startsWith('data:') ? value : `data:image/png;base64,${value}`
  return nativeImage.createFromDataURL(dataUrl)
}

function normalizeRect(rect: SelectionRect): SelectionRect {
  const x1 = Math.min(rect.x, rect.x + rect.width)
  const y1 = Math.min(rect.y, rect.y + rect.height)
  const x2 = Math.max(rect.x, rect.x + rect.width)
  const y2 = Math.max(rect.y, rect.y + rect.height)

  return {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1
  }
}

function selectionHtml(dataUrl: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      cursor: crosshair;
      background: #000;
      user-select: none;
    }
    #shot {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      object-fit: fill;
      opacity: 0.82;
      -webkit-user-drag: none;
    }
    #shade {
      position: fixed;
      inset: 0;
      background: rgb(0 0 0 / 26%);
    }
    #rect {
      position: fixed;
      display: none;
      border: 2px solid #38bdf8;
      background: rgb(56 189 248 / 14%);
      box-shadow: 0 0 0 9999px rgb(0 0 0 / 36%);
    }
    #size {
      position: fixed;
      display: none;
      min-width: 72px;
      padding: 4px 7px;
      border-radius: 4px;
      color: #f9fafb;
      background: rgb(2 6 23 / 86%);
      font: 12px "Segoe UI", sans-serif;
      line-height: 1.2;
      pointer-events: none;
      white-space: nowrap;
    }
    #hint {
      position: fixed;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 12px;
      border-radius: 6px;
      color: #e5e7eb;
      background: rgb(17 24 39 / 88%);
      font: 13px "Segoe UI", sans-serif;
    }
  </style>
</head>
<body>
  <img id="shot" alt="" src="${dataUrl}" />
  <div id="shade"></div>
  <div id="rect"></div>
  <div id="size"></div>
  <div id="hint">拖拽选择截图区域，Esc 取消</div>
  <script>
    const rectEl = document.getElementById('rect')
    const sizeEl = document.getElementById('size')
    let start = null
    let current = null

    function draw() {
      if (!start || !current) return
      const x = Math.min(start.x, current.x)
      const y = Math.min(start.y, current.y)
      const width = Math.abs(current.x - start.x)
      const height = Math.abs(current.y - start.y)
      rectEl.style.display = 'block'
      rectEl.style.left = x + 'px'
      rectEl.style.top = y + 'px'
      rectEl.style.width = width + 'px'
      rectEl.style.height = height + 'px'
      sizeEl.style.display = 'block'
      sizeEl.textContent = Math.round(width) + ' x ' + Math.round(height)
      const preferredLeft = x + width + 8
      const preferredTop = y + height + 8
      sizeEl.style.left = Math.min(preferredLeft, window.innerWidth - 92) + 'px'
      sizeEl.style.top = Math.min(preferredTop, window.innerHeight - 28) + 'px'
    }

    function selectedRect() {
      if (!start || !current) return null
      return {
        x: Math.min(start.x, current.x),
        y: Math.min(start.y, current.y),
        width: Math.abs(current.x - start.x),
        height: Math.abs(current.y - start.y)
      }
    }

    window.addEventListener('pointerdown', (event) => {
      start = { x: event.clientX, y: event.clientY }
      current = start
      draw()
    })

    window.addEventListener('pointermove', (event) => {
      if (!start) return
      current = { x: event.clientX, y: event.clientY }
      draw()
    })

    window.addEventListener('pointerup', async (event) => {
      if (!start) return
      current = { x: event.clientX, y: event.clientY }
      const rect = selectedRect()
      if (rect && rect.width >= 8 && rect.height >= 8) {
        await window.screenshotSelection.complete(rect)
      }
    })

    window.addEventListener('keydown', async (event) => {
      if (event.key === 'Escape') await window.screenshotSelection.cancel()
      if (event.key === 'Enter') {
        const rect = selectedRect()
        if (rect) await window.screenshotSelection.complete(rect)
      }
    })
  </script>
</body>
</html>`
}

function screenshotSuiteHtml(dataUrl: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: #111827;
      color: #f9fafb;
      font: 13px "Segoe UI", sans-serif;
    }
    body {
      display: grid;
      grid-template-rows: 44px minmax(0, 1fr);
    }
    #toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 8px;
      border-bottom: 1px solid rgb(255 255 255 / 12%);
      background: #0f172a;
    }
    button, select {
      height: 30px;
      border: 1px solid rgb(255 255 255 / 20%);
      border-radius: 6px;
      color: #f9fafb;
      background: rgb(255 255 255 / 9%);
      font: inherit;
    }
    button {
      min-width: 58px;
      padding: 0 9px;
      cursor: pointer;
    }
    button.active {
      border-color: #38bdf8;
      background: rgb(56 189 248 / 22%);
    }
    #main {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 300px;
      min-height: 0;
    }
    #stageWrap {
      display: grid;
      place-items: center;
      min-width: 0;
      min-height: 0;
      overflow: auto;
      background: #1f2937;
    }
    #stage {
      position: relative;
      display: inline-block;
      margin: 18px;
      box-shadow: 0 18px 50px rgb(0 0 0 / 32%);
    }
    canvas {
      display: block;
      max-width: calc(100vw - 360px);
      max-height: calc(100vh - 92px);
      background: #fff;
      cursor: crosshair;
    }
    #panel {
      min-width: 0;
      padding: 12px;
      border-left: 1px solid rgb(255 255 255 / 12%);
      background: #111827;
      overflow: auto;
    }
    #panel h2 {
      margin: 0 0 8px;
      font-size: 15px;
      letter-spacing: 0;
    }
    textarea {
      width: 100%;
      min-height: 118px;
      resize: vertical;
      padding: 8px;
      border: 1px solid rgb(255 255 255 / 16%);
      border-radius: 6px;
      color: #f9fafb;
      background: #020617;
      font: 12px Consolas, "Microsoft YaHei", monospace;
    }
    #status {
      min-height: 18px;
      margin: 8px 0;
      color: #bae6fd;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div id="toolbar">
    <button data-tool="pen" class="active">画笔</button>
    <button data-tool="rect">矩形</button>
    <button data-tool="arrow">箭头</button>
    <button data-tool="text">文字</button>
    <button id="undo">撤销</button>
    <button id="clear">清空</button>
    <button id="pin">钉图</button>
    <button id="copyImage">复制图</button>
    <button id="save">保存</button>
    <button id="ocr">OCR</button>
    <button id="translate">翻译</button>
    <button id="copyText">复制文字</button>
    <button id="close">关闭</button>
  </div>
  <div id="main">
    <div id="stageWrap"><div id="stage"><canvas id="canvas"></canvas></div></div>
    <aside id="panel">
      <h2>识别文字</h2>
      <textarea id="ocrText" placeholder="OCR 结果会显示在这里"></textarea>
      <h2>翻译结果</h2>
      <textarea id="translationText" placeholder="翻译结果会显示在这里"></textarea>
      <div id="status"></div>
    </aside>
  </div>
  <script>
    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')
    const ocrText = document.getElementById('ocrText')
    const translationText = document.getElementById('translationText')
    const statusEl = document.getElementById('status')
    const image = new Image()
    let tool = 'pen'
    let drawing = false
    let start = null
    let strokes = []
    let currentStroke = null

    image.onload = () => {
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      redraw()
    }
    image.src = '${dataUrl}'

    function status(message) {
      statusEl.textContent = message
    }

    function point(event) {
      const rect = canvas.getBoundingClientRect()
      return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height)
      }
    }

    function redraw(preview) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0)
      for (const stroke of strokes) drawStroke(stroke)
      if (preview) drawStroke(preview)
    }

    function drawStroke(stroke) {
      ctx.save()
      ctx.strokeStyle = '#ef4444'
      ctx.fillStyle = '#ef4444'
      ctx.lineWidth = Math.max(2, Math.round(canvas.width / 600))
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (stroke.type === 'pen') {
        ctx.beginPath()
        stroke.points.forEach((item, index) => {
          if (index === 0) ctx.moveTo(item.x, item.y)
          else ctx.lineTo(item.x, item.y)
        })
        ctx.stroke()
      }
      if (stroke.type === 'rect') {
        ctx.strokeRect(stroke.x, stroke.y, stroke.width, stroke.height)
      }
      if (stroke.type === 'arrow') {
        drawArrow(stroke.x1, stroke.y1, stroke.x2, stroke.y2)
      }
      if (stroke.type === 'text') {
        ctx.font = Math.max(18, Math.round(canvas.width / 36)) + 'px "Microsoft YaHei", sans-serif'
        ctx.fillText(stroke.text, stroke.x, stroke.y)
      }
      ctx.restore()
    }

    function drawArrow(x1, y1, x2, y2) {
      const angle = Math.atan2(y2 - y1, x2 - x1)
      const head = 16
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x2, y2)
      ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6))
      ctx.closePath()
      ctx.fill()
    }

    function dataUrl() {
      redraw()
      return canvas.toDataURL('image/png')
    }

    document.querySelectorAll('[data-tool]').forEach((button) => {
      button.addEventListener('click', () => {
        tool = button.dataset.tool
        document.querySelectorAll('[data-tool]').forEach((item) => item.classList.toggle('active', item === button))
      })
    })

    canvas.addEventListener('pointerdown', (event) => {
      start = point(event)
      if (tool === 'text') {
        const text = prompt('输入标注文字')
        if (text) {
          strokes.push({ type: 'text', x: start.x, y: start.y, text })
          redraw()
        }
        return
      }
      drawing = true
      currentStroke = tool === 'pen' ? { type: 'pen', points: [start] } : null
    })

    canvas.addEventListener('pointermove', (event) => {
      if (!drawing || !start) return
      const current = point(event)
      if (tool === 'pen') {
        currentStroke.points.push(current)
        redraw(currentStroke)
      }
      if (tool === 'rect') redraw({ type: 'rect', x: start.x, y: start.y, width: current.x - start.x, height: current.y - start.y })
      if (tool === 'arrow') redraw({ type: 'arrow', x1: start.x, y1: start.y, x2: current.x, y2: current.y })
    })

    canvas.addEventListener('pointerup', (event) => {
      if (!drawing || !start) return
      const current = point(event)
      if (tool === 'pen') strokes.push(currentStroke)
      if (tool === 'rect') strokes.push({ type: 'rect', x: start.x, y: start.y, width: current.x - start.x, height: current.y - start.y })
      if (tool === 'arrow') strokes.push({ type: 'arrow', x1: start.x, y1: start.y, x2: current.x, y2: current.y })
      drawing = false
      start = null
      currentStroke = null
      redraw()
    })

    document.getElementById('undo').addEventListener('click', () => {
      strokes.pop()
      redraw()
    })
    document.getElementById('clear').addEventListener('click', () => {
      strokes = []
      redraw()
    })
    document.getElementById('pin').addEventListener('click', async () => {
      const result = await window.screenshotSuite.pin(dataUrl())
      status(result.ok ? '已钉图' : result.error || '钉图失败')
    })
    document.getElementById('copyImage').addEventListener('click', async () => {
      const result = await window.screenshotSuite.copyImage(dataUrl())
      status(result.ok ? '已复制图片' : result.error || '复制失败')
    })
    document.getElementById('save').addEventListener('click', async () => {
      const result = await window.screenshotSuite.saveImage(dataUrl())
      status(result.ok ? '已保存图片' : result.error || '保存失败')
    })
    document.getElementById('ocr').addEventListener('click', async () => {
      status('OCR 识别中...')
      const result = await window.screenshotSuite.ocr(dataUrl())
      ocrText.value = result.text || ''
      status(result.ok ? 'OCR 完成' : result.error || 'OCR 失败')
    })
    document.getElementById('translate').addEventListener('click', async () => {
      const text = ocrText.value.trim()
      if (!text) {
        status('没有可翻译的 OCR 文本')
        return
      }
      status('翻译中...')
      const result = await window.screenshotSuite.translate(text)
      translationText.value = result.translatedText || ''
      status(result.ok ? '翻译完成：' + result.provider : result.error || '翻译失败')
    })
    document.getElementById('copyText').addEventListener('click', async () => {
      const text = translationText.value.trim() || ocrText.value.trim()
      await window.screenshotSuite.copyText(text)
      status(text ? '已复制文字' : '没有可复制文字')
    })
    document.getElementById('close').addEventListener('click', () => window.screenshotSuite.close())
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') window.screenshotSuite.close()
      if (event.ctrlKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        strokes.pop()
        redraw()
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        void window.screenshotSuite.copyImage(dataUrl()).then(() => status('已复制图片'))
      }
      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void window.screenshotSuite.saveImage(dataUrl()).then((result) => status(result.ok ? '已保存图片' : result.error || '保存失败'))
      }
    })
  </script>
</body>
</html>`
}

function pinnedImageHtml(dataUrl: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: #111827;
    }
    img {
      width: 100vw;
      height: 100vh;
      object-fit: contain;
      display: block;
      user-select: none;
      -webkit-user-drag: none;
    }
    #toolbar {
      position: fixed;
      top: 10px;
      right: 10px;
      display: flex;
      gap: 6px;
      padding: 6px;
      border-radius: 8px;
      background: rgb(17 24 39 / 82%);
      opacity: 0;
      transition: opacity 120ms ease;
    }
    body:hover #toolbar {
      opacity: 1;
    }
    button {
      height: 28px;
      padding: 0 9px;
      border: 1px solid rgb(255 255 255 / 22%);
      border-radius: 6px;
      color: #f9fafb;
      background: rgb(255 255 255 / 10%);
      font: 12px "Segoe UI", sans-serif;
      cursor: pointer;
    }
    #status {
      position: fixed;
      left: 10px;
      bottom: 10px;
      max-width: calc(100vw - 20px);
      padding: 6px 9px;
      border-radius: 6px;
      color: #f9fafb;
      background: rgb(17 24 39 / 86%);
      font: 12px "Segoe UI", sans-serif;
      opacity: 0;
      transition: opacity 120ms ease;
      pointer-events: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #status.visible {
      opacity: 1;
    }
  </style>
</head>
<body>
  <img alt="Pinned screenshot" src="${dataUrl}" />
  <div id="toolbar">
    <button id="copy">复制</button>
    <button id="save">保存</button>
    <button id="close">关闭</button>
  </div>
  <div id="status"></div>
  <script>
    const statusEl = document.getElementById('status')
    let statusTimer = null

    function showStatus(message) {
      if (statusTimer) clearTimeout(statusTimer)
      statusEl.textContent = message
      statusEl.classList.add('visible')
      statusTimer = setTimeout(() => statusEl.classList.remove('visible'), 1800)
    }

    async function copyImage() {
      const result = await window.pinnedImage.copy()
      showStatus(result && result.ok ? '已复制到剪贴板' : (result && result.error) || '复制失败')
    }

    async function saveImage() {
      const result = await window.pinnedImage.save()
      if (!result) {
        showStatus('保存失败')
        return
      }
      showStatus(result.ok ? '已保存' : result.error || '保存失败')
    }

    document.getElementById('copy').addEventListener('click', copyImage)
    document.getElementById('save').addEventListener('click', saveImage)
    document.getElementById('close').addEventListener('click', () => window.pinnedImage.close())
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') window.pinnedImage.close()
      if (event.ctrlKey && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        void copyImage()
      }
      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveImage()
      }
    })
  </script>
</body>
</html>`
}
