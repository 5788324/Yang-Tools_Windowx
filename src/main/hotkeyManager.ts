import { globalShortcut } from 'electron'
import type { WindowManager } from './windowManager'

const DEFAULT_HOTKEY = 'Alt+Space'

export class HotkeyManager {
  constructor(private readonly windowManager: WindowManager) {}

  registerAll(): void {
    this.register(DEFAULT_HOTKEY)
  }

  unregisterAll(): void {
    globalShortcut.unregisterAll()
  }

  private register(accelerator: string): void {
    const ok = globalShortcut.register(accelerator, () => {
      this.windowManager.toggleMainWindow()
    })

    if (!ok) {
      console.warn(`Failed to register global shortcut: ${accelerator}`)
    }
  }
}
