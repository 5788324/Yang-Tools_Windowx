import { Menu, Tray, app, nativeImage } from 'electron'
import type { WindowManager } from './windowManager'

const ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKUlEQVR4AWP4//8/AyWYYVQDqGJkYGBg+M/AwMDA8J+BgeE/AwMDABrUBgR/FR0BAAAAAElFTkSuQmCC'

export class TrayManager {
  private tray: Tray | null = null

  constructor(
    private readonly windowManager: WindowManager,
    private readonly captureScreenshot: () => void
  ) {}

  create(): void {
    if (this.tray) return

    const image = nativeImage.createFromDataURL(ICON_DATA_URL)
    image.setTemplateImage(false)

    this.tray = new Tray(image)
    this.tray.setToolTip('Yang Tools')
    this.tray.setContextMenu(this.createMenu())
    this.tray.on('click', () => this.windowManager.toggleMainWindow())
  }

  private createMenu(): Menu {
    return Menu.buildFromTemplate([
      {
        label: '显示 Yang Tools',
        click: () => this.windowManager.showMainWindow()
      },
      {
        label: '隐藏主窗口',
        click: () => this.windowManager.hideMainWindow()
      },
      {
        label: '截图钉图',
        click: this.captureScreenshot
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          this.windowManager.quit()
          app.quit()
        }
      }
    ])
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = null
  }
}
