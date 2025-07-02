param(
    [string]$LogFile = "simple-resource-monitoring.log",
    [int]$IntervalSeconds = 5
)

# Create log file with headers
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$totalRAM = [math]::Round((Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
$cpuName = (Get-WmiObject Win32_Processor).Name

$header = @"
=== SIMPLE RESOURCE MONITORING LOG ===
Started: $timestamp
System: Windows $((Get-WmiObject Win32_OperatingSystem).Caption)
CPU: $cpuName
Total RAM: $totalRAM GB
Monitoring Interval: $IntervalSeconds seconds

Timestamp,CPU_Usage_%,RAM_Used_GB,RAM_Available_GB,RAM_Usage_%,Disk_Used_GB,Disk_Free_GB,Disk_Usage_%,Active_Containers
"@

$header | Out-File -FilePath $LogFile -Encoding UTF8

Write-Host "Starting resource monitoring..." -ForegroundColor Green
Write-Host "Logging to: $LogFile" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Cyan

# Function to get disk usage for the current drive
function Get-DiskUsage {
    $drive = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
    $used = [math]::Round(($drive.Size - $drive.FreeSpace) / 1GB, 2)
    $free = [math]::Round($drive.FreeSpace / 1GB, 2)
    $usage = [math]::Round((($drive.Size - $drive.FreeSpace) / $drive.Size) * 100, 2)
    return @{Used = $used; Free = $free; Usage = $usage}
}

# Initialize peak tracking
$peakCPU = 0
$peakRAM = 0
$peakDisk = 0

try {
    while ($true) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        
        # Get CPU usage
        $cpu = Get-WmiObject win32_processor | Measure-Object -property LoadPercentage -Average | Select-Object -ExpandProperty Average
        
        # Get RAM usage
        $ram = Get-WmiObject Win32_OperatingSystem
        $totalRAM = [math]::Round($ram.TotalVisibleMemorySize / 1MB, 2)
        $freeRAM = [math]::Round($ram.FreePhysicalMemory / 1MB, 2)
        $usedRAM = [math]::Round($totalRAM - $freeRAM, 2)
        $ramUsage = [math]::Round(($usedRAM / $totalRAM) * 100, 2)
        
        # Get disk usage
        $disk = Get-DiskUsage
        
        # Count Docker containers
        $containerCount = 0
        try {
            $containerCount = (docker ps --format "table {{.Names}}" 2>$null | Measure-Object -Line).Lines - 1
            if ($containerCount -lt 0) { $containerCount = 0 }
        } catch {
            $containerCount = 0
        }
        
        # Update peaks
        if ($cpu -gt $peakCPU) { $peakCPU = $cpu }
        if ($ramUsage -gt $peakRAM) { $peakRAM = $ramUsage }
        if ($disk.Usage -gt $peakDisk) { $peakDisk = $disk.Usage }
        
        # Create log entry
        $logEntry = "$timestamp,$cpu,$usedRAM,$freeRAM,$ramUsage,$($disk.Used),$($disk.Free),$($disk.Usage),$containerCount"
        $logEntry | Out-File -FilePath $LogFile -Append -Encoding UTF8
        
        # Display current stats
        Clear-Host
        Write-Host "RESOURCE MONITORING" -ForegroundColor Green
        Write-Host "===================" -ForegroundColor Green
        Write-Host "Time: $timestamp" -ForegroundColor White
        Write-Host ""
        
        Write-Host "SYSTEM RESOURCES:" -ForegroundColor Cyan
        Write-Host "   CPU Usage:       $cpu% (Peak: $peakCPU%)" -ForegroundColor $(if($cpu -gt 80) {"Red"} elseif($cpu -gt 60) {"Yellow"} else {"Green"})
        Write-Host "   RAM Usage:       $usedRAM GB / $totalRAM GB ($ramUsage%) (Peak: $peakRAM%)" -ForegroundColor $(if($ramUsage -gt 80) {"Red"} elseif($ramUsage -gt 60) {"Yellow"} else {"Green"})
        Write-Host "   Disk Usage:      $($disk.Used) GB / $($disk.Used + $disk.Free) GB ($($disk.Usage)%) (Peak: $peakDisk%)" -ForegroundColor $(if($disk.Usage -gt 80) {"Red"} elseif($disk.Usage -gt 60) {"Yellow"} else {"Green"})
        Write-Host ""
        
        Write-Host "DOCKER RESOURCES:" -ForegroundColor Magenta
        Write-Host "   Active Containers: $containerCount" -ForegroundColor White
        Write-Host ""
        
        Write-Host "Log: $LogFile" -ForegroundColor Yellow
        Write-Host "Press Ctrl+C to stop monitoring..." -ForegroundColor Gray
        
        Start-Sleep -Seconds $IntervalSeconds
    }
} catch [System.Management.Automation.PipelineStoppedException] {
    Write-Host ""
    Write-Host "Monitoring stopped by user" -ForegroundColor Red
} finally {
    # Write summary to log
    $summary = @"

=== MONITORING SUMMARY ===
Peak CPU Usage: $peakCPU%
Peak RAM Usage: $peakRAM%
Peak Disk Usage: $peakDisk%
Monitoring ended: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@
    
    $summary | Out-File -FilePath $LogFile -Append -Encoding UTF8
    
    Write-Host ""
    Write-Host "MONITORING SUMMARY:" -ForegroundColor Green
    Write-Host "Peak CPU Usage: $peakCPU%" -ForegroundColor White
    Write-Host "Peak RAM Usage: $peakRAM%" -ForegroundColor White
    Write-Host "Peak Disk Usage: $peakDisk%" -ForegroundColor White
    Write-Host ""
    Write-Host "Full log saved to: $LogFile" -ForegroundColor Yellow
} 