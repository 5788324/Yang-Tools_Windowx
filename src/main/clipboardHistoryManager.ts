import { clipboard } from 'electron'

export interface ClipboardTextHistoryItem {
  id: string
  type: 'text'
  content: string
  preview: string
  timestamp: number
}

export interface ClipboardHistoryPage {
  items: ClipboardTextHistoryItem[]
  total: number
}

const MAX_ITEMS = 200
const MAX_TEXT_LENGTH = 10000
const POLL_INTERVAL_MS = 900

export class ClipboardHistoryManager {
  private items: ClipboardTextHistoryItem[] = []
  private timer: NodeJS.Timeout | null = null
  private lastText = ''

  start(): void {
    if (this.timer) return
    this.captureCurrentText()
    this.timer = setInterval(() => this.captureCurrentText(), POLL_INTERVAL_MS)
  }

  stop(): void {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
  }

  getHistory(page = 1, pageSize = 50): ClipboardHistoryPage {
    const normalizedPage = Math.max(1, Math.floor(Number(page) || 1))
    const normalizedPageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSize) || 50)))
    const start = (normalizedPage - 1) * normalizedPageSize

    return {
      items: this.items.slice(start, start + normalizedPageSize),
      total: this.items.length
    }
  }

  search(query: string): ClipboardTextHistoryItem[] {
    const normalizedQuery = String(query || '').trim().toLowerCase()
    if (!normalizedQuery) return this.items.slice(0, 100)

    return this.items
      .filter((item) => item.content.toLowerCase().includes(normalizedQuery))
      .slice(0, 100)
  }

  private captureCurrentText(): void {
    const text = clipboard.readText().trim()
    if (!text || text === this.lastText) return

    this.lastText = text
    this.pushText(text)
  }

  private pushText(text: string): void {
    const content = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text
    const timestamp = Date.now()

    const item: ClipboardTextHistoryItem = {
      id: `text/${timestamp}`,
      type: 'text',
      content,
      preview: content.slice(0, 200),
      timestamp
    }

    this.items = [item, ...this.items.filter((historyItem) => historyItem.content !== content)].slice(
      0,
      MAX_ITEMS
    )
  }
}
