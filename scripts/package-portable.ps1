$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$releaseRoot = Join-Path $root 'release'
$portableName = 'Yang-Tools-0.1.0-portable'
$portable = Join-Path $releaseRoot $portableName
$zip = Join-Path $releaseRoot "$portableName.zip"

if (-not (Test-Path -LiteralPath (Join-Path $root 'out\main\index.js'))) {
  throw 'Build output missing. Run npm.cmd run build before packaging.'
}

if (-not (Test-Path -LiteralPath (Join-Path $root 'node_modules\electron\dist\electron.exe'))) {
  throw 'Electron runtime missing. Run npm.cmd install --cache .\.npm-cache first.'
}

if (Test-Path -LiteralPath $portable) {
  Remove-Item -LiteralPath $portable -Recurse -Force
}

New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
Copy-Item -Path (Join-Path $root 'node_modules\electron\dist') -Destination $portable -Recurse
Rename-Item -LiteralPath (Join-Path $portable 'electron.exe') -NewName 'Yang Tools.exe'

$appDir = Join-Path $portable 'resources\app'
New-Item -ItemType Directory -Path $appDir -Force | Out-Null
Copy-Item -Path (Join-Path $root 'out') -Destination (Join-Path $appDir 'out') -Recurse
Copy-Item -Path (Join-Path $root 'package.json') -Destination (Join-Path $appDir 'package.json')
Copy-Item -Path (Join-Path $root 'scripts') -Destination (Join-Path $appDir 'scripts') -Recurse

$toolkitDir = Join-Path $appDir 'node_modules\@electron-toolkit'
New-Item -ItemType Directory -Path $toolkitDir -Force | Out-Null
Copy-Item -Path (Join-Path $root 'node_modules\@electron-toolkit\utils') -Destination (Join-Path $toolkitDir 'utils') -Recurse

$sampleLibrary = Join-Path $root 'local-plugin-library'
if (Test-Path -LiteralPath $sampleLibrary) {
  Copy-Item -Path $sampleLibrary -Destination (Join-Path $portable 'resources\local-plugin-library') -Recurse
}

$readme = @(
  'Yang Tools 0.1.0 Portable'
  ''
  'Run: double-click "Yang Tools.exe".'
  ''
  'Notes:'
  '- This is a portable test build.'
  '- local-plugin-library is copied to resources/local-plugin-library when present.'
  '- PaddleOCR models/runtime are not bundled. Configure OCR Python path in AI Settings.'
  '- User data, trust state, and installed plugins are written to Electron userData.'
  '- Windows SmartScreen warnings are expected for this unsigned test build.'
) -join [Environment]::NewLine

Set-Content -LiteralPath (Join-Path $portable 'README.txt') -Value $readme -Encoding UTF8

if (Test-Path -LiteralPath $zip) {
  Remove-Item -LiteralPath $zip -Force
}

Compress-Archive -Path (Join-Path $portable '*') -DestinationPath $zip -Force

Write-Host "Portable folder: $portable"
Write-Host "Portable zip: $zip"
