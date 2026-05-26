import { globalShortcut } from 'electron'
import type { WindowManager } from './windowManager'

const DEFAULT_HOTKEY = 'Alt+Space'
const SCREENSHOT_HOTKEY = 'CommandOrControl+Shift+S'

export class HotkeyManager {
  constructor(
    private readonly windowManager: WindowManager,
    private readonly captureScreenshot: () => void
  ) {}

  registerAll(): void {
    this.register(DEFAULT_HOTKEY, () => this.windowManager.toggleMainWindow())
    this.register(SCREENSHOT_HOTKEY, this.captureScreenshot)
  }

  unregisterAll(): void {
    globalShortcut.unregisterAll()
  }

  private register(accelerator: string, handler: () => void): void {
    const ok = globalShortcut.register(accelerator, handler)

    if (!ok) {
      console.warn(`Failed to register global shortcut: ${accelerator}`)
    }
  }
}
