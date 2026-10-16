Set-Location $PSScriptRoot
$runtime = Get-Command node -ErrorAction SilentlyContinue
if ($runtime) { $nodePath = $runtime.Source } else {
  $nodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
}
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js 22+ tidak ditemukan. Install Node.js dahulu.' }
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
& $nodePath --env-file=.env bot.mjs @args
