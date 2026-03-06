#!/usr/bin/env node

import { mkdir, chmod, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(scriptDir, '..')
const binDir = path.join(packageRoot, 'node_modules', '.bin')
const cliRelativePath = path.join('..', '..', 'cli.mjs')

await mkdir(binDir, { recursive: true })

const shellScript = `#!/bin/sh
exec node "$(dirname "$0")/${cliRelativePath}" "$@"
`

await writeFile(path.join(binDir, 'killp'), shellScript)
await chmod(path.join(binDir, 'killp'), 0o755)

if (process.platform === 'win32') {
  const cmdScript = `@ECHO off
node "%~dp0\\${cliRelativePath.replace(/\\/g, '\\\\')}" %*
`
  const ps1Script = `#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent
node "$basedir\\${cliRelativePath.replace(/\\/g, '\\')}" $args
`

  await writeFile(path.join(binDir, 'killp.cmd'), cmdScript)
  await writeFile(path.join(binDir, 'killp.ps1'), ps1Script)
}
