import { existsSync } from 'node:fs'
import { join } from 'node:path'

export function resolvePreloadPath(name: 'index' | 'plugin'): string {
  const jsPath = join(__dirname, `../preload/${name}.js`)
  if (existsSync(jsPath)) return jsPath

  const mjsPath = join(__dirname, `../preload/${name}.mjs`)
  if (existsSync(mjsPath)) return mjsPath

  return jsPath
}
