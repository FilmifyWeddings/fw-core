param (
    [Parameter(Mandatory=$false)]
    [string]$AgentToken = "",
    [Parameter(Mandatory=$false)]
    [string]$ApiBaseUrl = "https://studiocore.in"
)
if (-not $AgentToken) {
    $AgentToken = Read-Host "Enter your StudioCore Machine AGENT_TOKEN"
}
$InstallDir = "$env:USERPROFILE\.studiocore"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}
$ScriptPath = "$InstallDir\studiocore-agent.ps1"
Write-Host "Downloading StudioCore Agent..." -ForegroundColor Cyan
Invoke-WebRequest -Uri "$ApiBaseUrl/agents/studiocore-agent.ps1" -OutFile $ScriptPath
Write-Host "Starting StudioCore Background Storage Agent..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File `"$ScriptPath`" -AgentToken `"$AgentToken`" -ApiBaseUrl `"$ApiBaseUrl`""
Write-Host "`nInstallation Complete! Your PC is now linked to StudioCore Data Manager." -ForegroundColor Green