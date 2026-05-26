param(
  [string]$RuntimeDir = (Join-Path $env:APPDATA 'yang-tools\ocr-runtime'),
  [string]$Python = '',
  [string]$PaddlePackage = 'paddlepaddle',
  [string]$PaddleOcrPackage = 'paddleocr'
)

$ErrorActionPreference = 'Stop'

function Resolve-Python {
  param([string]$RequestedPython)

  if ($RequestedPython) {
    if (-not (Test-Path -LiteralPath $RequestedPython)) {
      throw "Requested Python path does not exist: $RequestedPython"
    }
    Assert-SupportedPython -PythonCommand $RequestedPython
    return $RequestedPython
  }

  $pyLauncher = Get-Command py -ErrorAction SilentlyContinue
  if ($pyLauncher) {
    $installed = & py -0p 2>$null
    foreach ($version in @('3.13', '3.12', '3.11', '3.10', '3.9')) {
      $line = $installed | Where-Object { $_ -match "-V:$version" } | Select-Object -First 1
      if ($line -and $line -match '([A-Z]:\\.+python\.exe)') {
        $probe = $Matches[1]
        if (Test-Path -LiteralPath $probe) {
          Assert-SupportedPython -PythonCommand $probe
          return $probe
        }
      }
    }
  }

  $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
  if ($pythonCommand) {
    Assert-SupportedPython -PythonCommand $pythonCommand.Source
    return $pythonCommand.Source
  }

  throw 'Supported Python was not found. Install Python 3.9-3.13 first, or pass -Python C:\Path\To\python.exe. Python 3.14 is not supported by PaddlePaddle yet.'
}

function Get-PythonVersion {
  param([string]$PythonCommand)

  $versionText = & $PythonCommand -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $versionText) {
    throw "Unable to run Python: $PythonCommand"
  }
  return [version]$versionText.Trim()
}

function Assert-SupportedPython {
  param([string]$PythonCommand)

  $version = Get-PythonVersion -PythonCommand $PythonCommand
  if ($version.Major -ne 3 -or $version.Minor -lt 9 -or $version.Minor -gt 13) {
    throw "Unsupported Python $version at $PythonCommand. PaddlePaddle currently requires Python 3.9-3.13 on Windows."
  }
}

New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null

$pythonCommand = Resolve-Python -RequestedPython $Python
$venvDir = Join-Path $RuntimeDir '.venv'
$venvPython = Join-Path $venvDir 'Scripts\python.exe'

if (Test-Path -LiteralPath $venvPython) {
  try {
    Assert-SupportedPython -PythonCommand $venvPython
  } catch {
    Write-Host "Existing OCR venv uses unsupported Python. Recreating: $venvDir"
    Remove-Item -LiteralPath $venvDir -Recurse -Force
  }
}

if (-not (Test-Path -LiteralPath $venvPython)) {
  & $pythonCommand -m venv $venvDir
}

& $venvPython -m pip install --upgrade pip setuptools wheel
& $venvPython -m pip install $PaddlePackage
& $venvPython -m pip install $PaddleOcrPackage
& $venvPython -c "import paddle; paddle.utils.run_check(); import paddleocr; print('paddleocr import ok')"

$pythonPathFile = Join-Path $RuntimeDir 'python-path.txt'
Set-Content -LiteralPath $pythonPathFile -Value $venvPython -Encoding UTF8

Write-Host "PaddleOCR runtime installed."
Write-Host "RuntimeDir: $RuntimeDir"
Write-Host "PythonPath: $venvPython"
Write-Host "Copy PythonPath into Yang Tools -> AI Settings -> PaddleOCR -> Python path."
