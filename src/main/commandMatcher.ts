import type { CommandMatcher, PluginCommandMatch, PluginFeature, RawPluginManifest } from '../shared/pluginTypes'
import { listZtoolsPluginManifests } from './pluginSamples'

export function matchZtoolsCommands(query: string): PluginCommandMatch[] {
  const input = query.trim()
  if (!input) return []

  const matches: PluginCommandMatch[] = []

  for (const plugin of listZtoolsPluginManifests()) {
    for (const feature of plugin.manifest.features ?? []) {
      for (const command of feature.cmds ?? []) {
        const match = matchCommand(input, command, feature, plugin.summary.title)
        if (!match) continue

        matches.push({
          pluginId: plugin.summary.id,
          pluginTitle: plugin.summary.title,
          pluginSource: plugin.summary.source,
          featureCode: feature.code,
          featureExplain: feature.explain || feature.label || plugin.summary.description,
          triggerType: match.type,
          triggerLabel: match.label,
          payload: input,
          score: match.score
        })
      }
    }
  }

  return matches.sort((left, right) => right.score - left.score).slice(0, 8)
}

function matchCommand(
  input: string,
  command: CommandMatcher,
  feature: PluginFeature,
  pluginTitle: string
): { type: string; label: string; score: number } | null {
  if (typeof command === 'string') {
    const commandText = command.toLowerCase()
    const inputText = input.toLowerCase()
    if (commandText === inputText) return { type: 'keyword', label: command, score: 100 }
    if (commandText.includes(inputText) || inputText.includes(commandText)) {
      return { type: 'keyword', label: command, score: 60 }
    }
    return null
  }

  if (!withinLength(input, command.minLength, command.maxLength)) return null

  if (command.type === 'regex' && command.match && regexMatches(input, command.match)) {
    return {
      type: 'regex',
      label: command.label || feature.explain || pluginTitle,
      score: feature.mainPush ? 95 : 90
    }
  }

  if (command.type === 'over') {
    return {
      type: 'over',
      label: command.label || feature.explain || pluginTitle,
      score: 40
    }
  }

  return null
}

function withinLength(value: string, minLength?: number, maxLength?: number): boolean {
  if (typeof minLength === 'number' && value.length < minLength) return false
  if (typeof maxLength === 'number' && value.length > maxLength) return false
  return true
}

function regexMatches(value: string, rawPattern: string): boolean {
  const parsed = parseRegexLiteral(rawPattern)
  if (!parsed) return false

  try {
    const regex = new RegExp(parsed.source, parsed.flags)
    return regex.test(value)
  } catch {
    return false
  }
}

function parseRegexLiteral(rawPattern: string): { source: string; flags: string } | null {
  if (!rawPattern.startsWith('/')) return { source: rawPattern, flags: '' }

  const lastSlash = rawPattern.lastIndexOf('/')
  if (lastSlash <= 0) return null

  return {
    source: rawPattern.slice(1, lastSlash),
    flags: rawPattern.slice(lastSlash + 1)
  }
}
