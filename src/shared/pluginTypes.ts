export type PluginSource = 'ztools-local' | 'utools-remote' | 'yang-tools'

export type CommandMatcher =
  | string
  | {
      type?: 'regex' | 'over' | 'img' | 'files' | string
      label?: string
      match?: string
      fileType?: string
      extensions?: string[]
      minLength?: number
      maxLength?: number
      minNum?: number
      maxNum?: number
      [key: string]: unknown
    }

export interface PluginFeature {
  code: string
  explain?: string
  label?: string
  icon?: string
  mainPush?: boolean
  cmds?: CommandMatcher[]
}

export interface RawPluginManifest {
  id?: string
  name?: string
  pluginName?: string
  title?: string
  description?: string
  version?: string
  author?: string
  homepage?: string | null
  main?: string
  preload?: string
  logo?: string
  platform?: string[] | string
  features?: PluginFeature[]
  tools?: Record<string, unknown>
  pluginSetting?: Record<string, unknown>
  [key: string]: unknown
}

export interface PluginSummary {
  id: string
  name: string
  title: string
  description: string
  version: string
  source: PluginSource
  entry?: string
  preload?: string
  logo?: string
  platform: string[]
  featureCount: number
  commandCount: number
  triggerTypes: string[]
  compatibilityNotes: string[]
}

export interface PluginSampleReport {
  generatedAt: string
  ztools: {
    root: string
    plugins: PluginSummary[]
  }
  utools: {
    root: string
    remotePluginCount: number
    plugins: PluginSummary[]
  }
}
