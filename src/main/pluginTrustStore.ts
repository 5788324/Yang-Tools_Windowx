import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { PluginTrustGrant } from '../shared/pluginTypes'

interface TrustState {
  trusted: Record<string, { grantedAt: string }>
}

const EMPTY_STATE: TrustState = { trusted: {} }

export function isPluginTrusted(grant: PluginTrustGrant): boolean {
  const state = readState()
  return Boolean(state.trusted[trustKey(grant)])
}

export function trustPlugin(grant: PluginTrustGrant): { ok: boolean } {
  const state = readState()
  state.trusted[trustKey(grant)] = { grantedAt: new Date().toISOString() }
  writeState(state)
  return { ok: true }
}

export function revokePluginTrust(grant: PluginTrustGrant): { ok: boolean } {
  const state = readState()
  delete state.trusted[trustKey(grant)]
  writeState(state)
  return { ok: true }
}

function readState(): TrustState {
  const file = trustFilePath()
  if (!existsSync(file)) return emptyState()

  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<TrustState>
    return { trusted: parsed.trusted ?? {} }
  } catch {
    return emptyState()
  }
}

function writeState(state: TrustState): void {
  const file = trustFilePath()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(state, null, 2), 'utf8')
}

function trustFilePath(): string {
  return join(app.getPath('userData'), 'plugin-trust.json')
}

function emptyState(): TrustState {
  return { trusted: { ...EMPTY_STATE.trusted } }
}

function trustKey(grant: PluginTrustGrant): string {
  const permissions = [...grant.permissions].sort().join(',')
  return `${grant.source}:${grant.id}:${grant.version}:${permissions}`
}
