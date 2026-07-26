[CmdletBinding()]
param(
    [switch]$Local
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$SqlPath = Join-Path $PSScriptRoot "product-metrics.sql"
$Wrangler = Join-Path $RepoRoot "node_modules\.bin\wrangler.cmd"
$Target = if ($Local) { "--local" } else { "--remote" }
$Sql = (Get-Content $SqlPath) -join " "

$Output = & $Wrangler d1 execute algo-lane $Target --json --command $Sql
if ($LASTEXITCODE -ne 0) {
    throw "D1 metrics query failed with exit code $LASTEXITCODE"
}

$Payload = ($Output -join [Environment]::NewLine) | ConvertFrom-Json
$Row = $Payload[0].results[0]
if (-not $Row) {
    throw "D1 metrics query returned no result"
}

function Get-Percent {
    param(
        [int]$Numerator,
        [int]$Denominator
    )

    if ($Denominator -eq 0) { return 0.0 }
    return [Math]::Round(($Numerator / $Denominator) * 100, 1)
}

$Users = [int]$Row.users
$Opened = [int]$Row.problem_opened
$Solved = [int]$Row.solved_marked

[ordered]@{
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    service = "algo-lane"
    environment = if ($Local) { "local" } else { "production" }
    funnel = [ordered]@{
        users = $Users
        lane_generated = [int]$Row.lane_generated
        history_imported = [int]$Row.history_imported
        problem_opened = $Opened
        solved_marked = $Solved
        exported = [int]$Row.exported
        returned = [int]$Row.returned
        users_7d = [int]$Row.users_7d
        solved_marked_7d = [int]$Row.solved_marked_7d
    }
    rates = [ordered]@{
        open_percent = Get-Percent $Opened $Users
        solved_percent = Get-Percent $Solved $Opened
        return_percent = Get-Percent ([int]$Row.returned) $Opened
    }
} | ConvertTo-Json -Depth 4
