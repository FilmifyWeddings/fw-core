# ============================================================================== #
# StudioCore Storage Hub - Automatic Multi-PC Background Disk Agent              #
# Monitors USB/HDD insertions, reads hardware serials, indexes wedding media,    #
# and sends live heartbeat and real-time updates to StudioCore.                  #
# ============================================================================== #

param (
    [Parameter(Mandatory=$true)]
    [string]$AgentToken,

    [Parameter(Mandatory=$false)]
    [string]$ApiBaseUrl = "https://studiocore.in",

    [Parameter(Mandatory=$false)]
    [string]$MachineName = $env:COMPUTERNAME
)

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ErrorActionPreference = "SilentlyContinue"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  StudioCore Real-Time Storage Agent Initialized      " -ForegroundColor Green
Write-Host "  Machine Name : $MachineName" -ForegroundColor Yellow
Write-Host "  API Endpoint : $ApiBaseUrl" -ForegroundColor Gray
Write-Host "======================================================" -ForegroundColor Cyan

$PhotoExts = @('.cr2', '.cr3', '.nef', '.arw', '.jpg', '.jpeg', '.png', '.dng', '.raw', '.raf', '.orf', '.rw2', '.tif', '.tiff')
$VideoExts = @('.mp4', '.mov', '.mxf', '.braw', '.avi', '.mkv', '.prores', '.crm', '.r3d', '.wmv')

function Detect-Category ($folderName) {
    $lower = $folderName.ToLower()
    if ($lower -match "deliverable|final|output|master|export") { return "DELIVERABLES" }
    if ($lower -match "select|chosen|shortlist|culling") { return "SELECTION" }
    if ($lower -match "edit|teaser|trailer|highlight|retouch|psd|prproj|drp") { return "EDITS" }
    if ($lower -match "cine|video|footage|drone|cam|clip") { return "RAW_VIDEOS" }
    return "RAW_PHOTOS"
}

function Send-Heartbeat {
    try {
        $activeDrives = @()
        $drives = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -in @(2, 3) }
        foreach ($d in $drives) {
            $activeDrives += @{
                drive_letter = $d.DeviceID
                volume_name = $d.VolumeName
                total_bytes = [int64]$d.Size
                free_bytes = [int64]$d.FreeSpace
            }
        }

        $payload = @{
            agent_token = $AgentToken
            machine_name = $MachineName
            machine_os = "Windows ($([System.Environment]::OSVersion.VersionString))"
            active_drives = $activeDrives
        } | ConvertTo-Json -Depth 4

        $res = Invoke-RestMethod -Uri "$ApiBaseUrl/api/agent/heartbeat" -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 10
        Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] Heartbeat sent. Active Disks: $($activeDrives.Count)" -ForegroundColor DarkGray
    } catch {
        Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] Heartbeat warning: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Scan-And-Sync-Drive ($driveLetter) {
    Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] Starting scan on $driveLetter ..." -ForegroundColor Yellow
    $diskSerial = "UNKNOWN-SERIAL"
    $diskLabel = "Storage Volume ($driveLetter)"
    $diskType = "EXTERNAL_HDD"
    $totalBytes = 0
    $freeBytes = 0

    try {
        $logicalDisk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$driveLetter'"
        if ($logicalDisk) {
            if ($logicalDisk.VolumeName) { $diskLabel = $logicalDisk.VolumeName }
            $totalBytes = [int64]$logicalDisk.Size
            $freeBytes = [int64]$logicalDisk.FreeSpace
            if ($logicalDisk.DriveType -eq 2) { $diskType = "EXTERNAL_HDD" }
        }
        $partitions = Get-CimInstance -Query "ASSOCIATORS OF {Win32_LogicalDisk.DeviceID='$driveLetter'} WHERE AssocClass = Win32_LogicalDiskToPartition"
        foreach ($part in $partitions) {
            $physicalDrives = Get-CimInstance -Query "ASSOCIATORS OF {Win32_DiskPartition.DeviceID='$($part.DeviceID)'} WHERE AssocClass = Win32_DiskDriveToDiskPartition"
            foreach ($pd in $physicalDrives) {
                if ($pd.SerialNumber) { $diskSerial = $pd.SerialNumber.Trim() }
                if ($pd.Model) { $diskLabel = "$($pd.Model.Trim()) ($driveLetter)" }
            }
        }
    } catch {
        $diskSerial = "VOL-$driveLetter-$($logicalDisk.VolumeSerialNumber)"
    }

    Write-Host "  Identified Disk: $diskLabel [SN: $diskSerial]" -ForegroundColor Green

    $foldersList = @()
    $rootPath = "$driveLetter\\"
    try {
        $allDirs = Get-ChildItem -Path $rootPath -Directory -Recurse -Depth 4 -ErrorAction SilentlyContinue
        $dirsToProcess = @(Get-Item -Path $rootPath) + $allDirs
        foreach ($dir in $dirsToProcess) {
            $files = Get-ChildItem -Path $dir.FullName -File -ErrorAction SilentlyContinue
            if ($files.Count -eq 0 -and $dir.FullName -ne $rootPath) { continue }
            $photoCount = 0
            $videoCount = 0
            $otherCount = 0
            $folderSize = 0
            foreach ($f in $files) {
                $folderSize += $f.Length
                $ext = $f.Extension.ToLower()
                if ($PhotoExts -contains $ext) { $photoCount++ }
                elseif ($VideoExts -contains $ext) { $videoCount++ }
                else { $otherCount++ }
            }
            $relPath = $dir.FullName.Substring($driveLetter.Length).Replace("\\", "/")
            if (-not $relPath) { $relPath = "/" }
            $cat = Detect-Category ($dir.Name)
            $foldersList += @{
                folder_name = if ($dir.Name) { $dir.Name } else { $diskLabel }
                folder_path = $dir.FullName
                relative_path = $relPath
                total_size_bytes = $folderSize
                photo_count = $photoCount
                video_count = $videoCount
                other_files_count = $otherCount
                event_category = $cat
                tags = @($cat.ToLower().Replace("_", " "))
                last_modified_at = $dir.LastWriteTime.ToString("yyyy-MM-ddTHH:mm:ssZ")
            }
        }
    } catch {
        Write-Host "  Scan error on $driveLetter: $($_.Exception.Message)" -ForegroundColor Red
    }

    $syncPayload = @{
        agent_token = $AgentToken
        machine_name = $MachineName
        disk = @{
            disk_serial = $diskSerial
            disk_name = $diskLabel
            disk_label = $diskLabel
            drive_letter = $driveLetter
            disk_type = $diskType
            total_capacity_bytes = $totalBytes
            free_capacity_bytes = $freeBytes
            total_capacity_gb = [Math]::Round($totalBytes / 1GB, 2)
            free_capacity_gb = [Math]::Round($freeBytes / 1GB, 2)
            is_currently_mounted = $true
        }
        items = $foldersList
    } | ConvertTo-Json -Depth 6

    try {
        $syncRes = Invoke-RestMethod -Uri "$ApiBaseUrl/api/agent/sync-disk" -Method POST -Body $syncPayload -ContentType "application/json" -TimeoutSec 30
        Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] Successfully indexed $($foldersList.Count) folders on $diskLabel!" -ForegroundColor Green
    } catch {
        Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] Sync failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Send-Heartbeat
$activeDrives = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -in @(2, 3) }
foreach ($d in $activeDrives) {
    Scan-And-Sync-Drive ($d.DeviceID)
}

$lastHeartbeat = [DateTime]::UtcNow
Write-Host "`nStudioCore Storage Agent is actively monitoring drives in real-time... (Press Ctrl+C to stop)`n" -ForegroundColor Cyan

while ($true) {
    Start-Sleep -Seconds 10
    if (([DateTime]::UtcNow - $lastHeartbeat).TotalSeconds -ge 60) {
        Send-Heartbeat
        $lastHeartbeat = [DateTime]::UtcNow
    }
}