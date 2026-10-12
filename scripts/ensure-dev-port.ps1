$ErrorActionPreference = 'Stop'

$port = 3004
$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

if (-not $connections) {
    Write-Output "Development port $port is available."
    exit 0
}

$listenerPids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($listenerPid in $listenerPids) {
    $listener = Get-CimInstance Win32_Process -Filter "ProcessId = $listenerPid" -ErrorAction SilentlyContinue
    if (-not $listener) {
        continue
    }

    $commandLine = [string]$listener.CommandLine
    $isWorkspaceNextServer = $listener.Name -eq 'node.exe' `
        -and $commandLine.IndexOf($workspaceRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 `
        -and ($commandLine -match 'next|start-server')

    if (-not $isWorkspaceNextServer) {
        throw "Port $port is occupied by PID $listenerPid ($($listener.Name)), which is not this workspace's Next.js server. Stop it manually or use another port."
    }

    $killPid = [int]$listenerPid
    $current = $listener
    while ($current.ParentProcessId -gt 0) {
        $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($current.ParentProcessId)" -ErrorAction SilentlyContinue
        if (-not $parent) {
            break
        }

        $parentCommandLine = [string]$parent.CommandLine
        if ($parent.Name -ne 'node.exe' `
            -or $parentCommandLine.IndexOf($workspaceRoot, [System.StringComparison]::OrdinalIgnoreCase) -lt 0 `
            -or $parentCommandLine -notmatch 'next') {
            break
        }

        $killPid = [int]$parent.ProcessId
        $current = $parent
    }

    Write-Output "Stopping stale workspace Next.js server on port $port (process tree $killPid)..."
    & taskkill /PID $killPid /T /F | Out-Null
}

$remaining = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($remaining) {
    throw "Port $port is still occupied after stopping the stale workspace server."
}

Write-Output "Development port $port is now available."
