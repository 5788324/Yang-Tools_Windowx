import type { YangToolsApi } from '../../preload'

declare global {
  interface Window {
    yangTools: YangToolsApi
    ztools?: unknown
    utools?: unknown
  }
}
