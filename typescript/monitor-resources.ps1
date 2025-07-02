# PowerShell Resource Monitoring Script for Docker Containers
# This script monitors CPU, RAM, Disk, and Network usage during Docker operations

param(
    [string]$LogFile = "resource-monitoring.log",
    [int]$IntervalSeconds = 5,
    [string]$Phase = "build" # build or runtime
)

# Create log file with headers
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$header = @"
=== RESOURCE MONITORING LOG - $Phase PHASE ===
Started: $timestamp
System: Windows $(Get-WmiObject Win32_OperatingSystem | Select-Object -ExpandProperty Caption)
CPU: $((Get-WmiObject Win32_Processor).Name)
Total RAM: $([math]::Round((Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)) GB
Monitoring Interval: $IntervalSeconds seconds

Timestamp,CPU_Usage_%,RAM_Used_GB,RAM_Available_GB,RAM_Usage_%,Disk_Used_GB,Disk_Free_GB,Disk_Usage_%,Docker_CPU_%,Docker_Memory_MB,Active_Containers
"@

$header | Out-File -FilePath $LogFile -Encoding UTF8

Write-Host "🔍 Starting resource monitoring for $Phase phase..." -ForegroundColor Green
Write-Host "📊 Logging to: $LogFile" -ForegroundColor Yellow
Write-Host "⏱️  Monitoring interval: $IntervalSeconds seconds" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Cyan

# Function to get disk usage for the current drive
function Get-DiskUsage {
    $drive = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
    $used = [math]::Round(($drive.Size - $drive.FreeSpace) / 1GB, 2)
    $free = [math]::Round($drive.FreeSpace / 1GB, 2)
    $usage = [math]::Round((($drive.Size - $drive.FreeSpace) / $drive.Size) * 100, 2)
    return @{Used = $used; Free = $free; Usage = $usage}
}

# Function to get Docker container stats
function Get-DockerStats {
    try {
        $containers = docker ps --format "table {{.Names}}\t{{.CPUPerc}}\t{{.MemUsage}}" --no-trunc 2>$null
        if ($containers) {
            $totalCPU = 0
            $totalMemory = 0
            $containerCount = 0
            
            foreach ($line in $containers[1..$containers.Length]) {
                if ($line -and $line.Trim()) {
                    $parts = $line -split '\s+'
                    if ($parts.Length -ge 3) {
                        $cpuStr = $parts[1] -replace '%', ''
                        $memStr = $parts[2] -split '/' | Select-Object -First 1
                        
                        if ($cpuStr -match '[\d.]+') {
                            $totalCPU += [float]$matches[0]
                        }
                        
                        if ($memStr -match '([\d.]+)([KMGT]iB)') {
                            $value = [float]$matches[1]
                            $unit = $matches[2]
                            
                            switch ($unit) {
                                'KiB' { $totalMemory += $value / 1024 }
                                'MiB' { $totalMemory += $value }
                                'GiB' { $totalMemory += $value * 1024 }
                                'TiB' { $totalMemory += $value * 1024 * 1024 }
                            }
                        }
                        $containerCount++
                    }
                }
            }
            
            return @{
                CPU = [math]::Round($totalCPU, 2)
                Memory = [math]::Round($totalMemory, 2)
                Count = $containerCount
            }
        }
    } catch {
        # Docker not available or no containers running
    }
    
    return @{CPU = 0; Memory = 0; Count = 0}
}

# Initialize peak tracking
$peakCPU = 0
$peakRAM = 0
$peakDisk = 0
$peakDockerCPU = 0
$peakDockerMemory = 0

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
        
        # Get Docker stats
        $dockerStats = Get-DockerStats
        
        # Update peaks
        if ($cpu -gt $peakCPU) { $peakCPU = $cpu }
        if ($ramUsage -gt $peakRAM) { $peakRAM = $ramUsage }
        if ($disk.Usage -gt $peakDisk) { $peakDisk = $disk.Usage }
        if ($dockerStats.CPU -gt $peakDockerCPU) { $peakDockerCPU = $dockerStats.CPU }
        if ($dockerStats.Memory -gt $peakDockerMemory) { $peakDockerMemory = $dockerStats.Memory }
        
        # Create log entry
        $logEntry = "$timestamp,$cpu,$usedRAM,$freeRAM,$ramUsage,$($disk.Used),$($disk.Free),$($disk.Usage),$($dockerStats.CPU),$($dockerStats.Memory),$($dockerStats.Count)"
        $logEntry | Out-File -FilePath $LogFile -Append -Encoding UTF8
        
        # Display current stats
        Clear-Host
        Write-Host "🔍 RESOURCE MONITORING - $Phase PHASE" -ForegroundColor Green
        Write-Host "===============================================" -ForegroundColor Green
        Write-Host "⏰ Time: $timestamp" -ForegroundColor White
        Write-Host ""
        
        Write-Host "💻 SYSTEM RESOURCES:" -ForegroundColor Cyan
        Write-Host "   CPU Usage:       $cpu% (Peak: $peakCPU%)" -ForegroundColor $(if($cpu -gt 80) {"Red"} elseif($cpu -gt 60) {"Yellow"} else {"Green"})
        Write-Host "   RAM Usage:       $usedRAM GB / $totalRAM GB ($ramUsage%) (Peak: $peakRAM%)" -ForegroundColor $(if($ramUsage -gt 80) {"Red"} elseif($ramUsage -gt 60) {"Yellow"} else {"Green"})
        Write-Host "   Disk Usage:      $($disk.Used) GB / $($disk.Used + $disk.Free) GB ($($disk.Usage)%) (Peak: $peakDisk%)" -ForegroundColor $(if($disk.Usage -gt 80) {"Red"} elseif($disk.Usage -gt 60) {"Yellow"} else {"Green"})
        Write-Host ""
        
        Write-Host "🐳 DOCKER RESOURCES:" -ForegroundColor Magenta
        Write-Host "   Container CPU:   $($dockerStats.CPU)% (Peak: $peakDockerCPU%)" -ForegroundColor $(if($dockerStats.CPU -gt 80) {"Red"} elseif($dockerStats.CPU -gt 60) {"Yellow"} else {"Green"})
        Write-Host "   Container RAM:   $($dockerStats.Memory) MB (Peak: $peakDockerMemory MB)" -ForegroundColor $(if($dockerStats.Memory -gt 8192) {"Red"} elseif($dockerStats.Memory -gt 4096) {"Yellow"} else {"Green"})
        Write-Host "   Active Containers: $($dockerStats.Count)" -ForegroundColor White
        Write-Host ""
        
        Write-Host "📊 Log: $LogFile" -ForegroundColor Yellow
        Write-Host "Press Ctrl+C to stop monitoring..." -ForegroundColor Gray
        
        Start-Sleep -Seconds $IntervalSeconds
    }
} catch [System.Management.Automation.PipelineStoppedException] {
    Write-Host ""
    Write-Host "🛑 Monitoring stopped by user" -ForegroundColor Red
} finally {
    # Write summary to log
    $summary = @"

=== MONITORING SUMMARY ===
Peak CPU Usage: $peakCPU%
Peak RAM Usage: $peakRAM%
Peak Disk Usage: $peakDisk%
Peak Docker CPU: $peakDockerCPU%
Peak Docker Memory: $peakDockerMemory MB
Monitoring ended: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@
    
    $summary | Out-File -FilePath $LogFile -Append -Encoding UTF8
    
    Write-Host ""
    Write-Host "📊 MONITORING SUMMARY:" -ForegroundColor Green
    Write-Host "Peak CPU Usage: $peakCPU%" -ForegroundColor White
    Write-Host "Peak RAM Usage: $peakRAM%" -ForegroundColor White
    Write-Host "Peak Disk Usage: $peakDisk%" -ForegroundColor White
    Write-Host "Peak Docker CPU: $peakDockerCPU%" -ForegroundColor White
    Write-Host "Peak Docker Memory: $peakDockerMemory MB" -ForegroundColor White
    Write-Host ""
    Write-Host "📄 Full log saved to: $LogFile" -ForegroundColor Yellow
} 