$ErrorActionPreference = 'SilentlyContinue'

$root = Split-Path -Parent $PSScriptRoot
$app = Join-Path $root 'ribbon-designer'
$port = 4173
$url = "http://127.0.0.1:$port/"

$listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

if (-not $listening) {
    Start-Process -FilePath 'npm.cmd' `
        -ArgumentList @('run', 'dev', '--', '--host', '127.0.0.1', '--port', "$port") `
        -WorkingDirectory $app `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $app 'vite.log') `
        -RedirectStandardError (Join-Path $app 'vite.err.log')

    Start-Sleep -Milliseconds 1500
}

Start-Process $url
