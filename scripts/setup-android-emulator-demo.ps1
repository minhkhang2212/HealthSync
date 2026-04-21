param(
    [int]$FrontendPort = 5173,
    [int]$BackendPort = 8000,
    [string]$AdbPath = '',
    [switch]$ResetExisting
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-AdbPath {
    param(
        [string]$PreferredPath
    )

    if ($PreferredPath) {
        if (Test-Path -LiteralPath $PreferredPath) {
            return (Resolve-Path -LiteralPath $PreferredPath).Path
        }
        throw "ADB executable not found at: $PreferredPath"
    }

    $adbCommand = Get-Command adb -ErrorAction SilentlyContinue
    if ($adbCommand) {
        return $adbCommand.Source
    }

    $candidates = @()

    if ($env:LOCALAPPDATA) {
        $candidates += (Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe')
    }
    if ($env:ANDROID_HOME) {
        $candidates += (Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe')
    }
    if ($env:ANDROID_SDK_ROOT) {
        $candidates += (Join-Path $env:ANDROID_SDK_ROOT 'platform-tools\adb.exe')
    }
    if ($env:USERPROFILE) {
        $candidates += (Join-Path $env:USERPROFILE 'AppData\Local\Android\Sdk\platform-tools\adb.exe')
    }

    foreach ($candidate in ($candidates | Select-Object -Unique)) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    throw 'ADB executable was not found. Install Android Studio platform-tools or pass -AdbPath explicitly.'
}

function Invoke-Adb {
    param(
        [string[]]$Arguments
    )

    Write-Host "adb $($Arguments -join ' ')" -ForegroundColor DarkGray
    & $script:ResolvedAdbPath @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "ADB command failed with exit code $LASTEXITCODE."
    }
}

$script:ResolvedAdbPath = Resolve-AdbPath -PreferredPath $AdbPath
Write-Host "Using adb: $script:ResolvedAdbPath" -ForegroundColor Cyan

$deviceOutput = & $script:ResolvedAdbPath devices
if ($LASTEXITCODE -ne 0) {
    throw 'Unable to query adb devices.'
}

$onlineDevices = @(
    $deviceOutput |
        Select-Object -Skip 1 |
        Where-Object { $_ -match '^\S+\s+device$' } |
        ForEach-Object { ($_ -split '\s+')[0] }
)

if ($onlineDevices.Count -eq 0) {
    throw 'No running Android emulator/device detected. Start an emulator in Android Studio Device Manager first.'
}

Write-Host "Detected device(s): $($onlineDevices -join ', ')" -ForegroundColor Green

if ($ResetExisting) {
    Invoke-Adb -Arguments @('reverse', '--remove-all')
}

Invoke-Adb -Arguments @('reverse', "tcp:$FrontendPort", "tcp:$FrontendPort")
Invoke-Adb -Arguments @('reverse', "tcp:$BackendPort", "tcp:$BackendPort")

Write-Host ''
Write-Host 'Android emulator localhost bridge is ready.' -ForegroundColor Green
Write-Host "Open this URL in emulator Chrome: http://localhost:$FrontendPort" -ForegroundColor Yellow
Write-Host ''
Write-Host 'Expected local servers:' -ForegroundColor Cyan
Write-Host "  Backend: php artisan serve --host=127.0.0.1 --port=$BackendPort"
Write-Host "  Frontend: cd frontend/web-app && npm run dev -- --host 127.0.0.1 --port $FrontendPort"
