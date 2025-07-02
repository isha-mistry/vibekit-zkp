#!/bin/bash

# Bash Resource Monitoring Script for Docker Containers
# This script monitors CPU, RAM, Disk, and Network usage during Docker operations

# Default parameters
LOG_FILE="resource-monitoring.log"
INTERVAL_SECONDS=5
PHASE="build"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -l|--log-file)
            LOG_FILE="$2"
            shift 2
            ;;
        -i|--interval)
            INTERVAL_SECONDS="$2"
            shift 2
            ;;
        -p|--phase)
            PHASE="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -l, --log-file FILE    Log file name (default: resource-monitoring.log)"
            echo "  -i, --interval SEC     Monitoring interval in seconds (default: 5)"
            echo "  -p, --phase PHASE      Monitoring phase: build or runtime (default: build)"
            echo "  -h, --help            Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Check if required tools are available
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed." >&2; exit 1; }

# Create log file with headers
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
SYSTEM_INFO=$(lsb_release -d 2>/dev/null | cut -f2 || echo "Linux")
CPU_INFO=$(grep "model name" /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)
TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_RAM_GB=$(echo "scale=2; $TOTAL_RAM_KB / 1024 / 1024" | bc)

cat > "$LOG_FILE" << EOF
=== RESOURCE MONITORING LOG - $PHASE PHASE ===
Started: $TIMESTAMP
System: $SYSTEM_INFO
CPU: $CPU_INFO
Total RAM: ${TOTAL_RAM_GB} GB
Monitoring Interval: $INTERVAL_SECONDS seconds

Timestamp,CPU_Usage_%,RAM_Used_GB,RAM_Available_GB,RAM_Usage_%,Disk_Used_GB,Disk_Free_GB,Disk_Usage_%,Docker_CPU_%,Docker_Memory_MB,Active_Containers,Load_1min,Load_5min,Load_15min
EOF

echo -e "${GREEN}🔍 Starting resource monitoring for $PHASE phase...${NC}"
echo -e "${YELLOW}📊 Logging to: $LOG_FILE${NC}"
echo -e "${YELLOW}⏱️  Monitoring interval: $INTERVAL_SECONDS seconds${NC}"
echo -e "${CYAN}Press Ctrl+C to stop monitoring${NC}"

# Function to get CPU usage
get_cpu_usage() {
    grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$3+$4+$5)} END {print usage}'
}

# Function to get RAM usage
get_ram_usage() {
    local mem_info=$(cat /proc/meminfo)
    local total=$(echo "$mem_info" | grep MemTotal | awk '{print $2}')
    local available=$(echo "$mem_info" | grep MemAvailable | awk '{print $2}')
    local used=$((total - available))
    
    local total_gb=$(echo "scale=2; $total / 1024 / 1024" | bc)
    local used_gb=$(echo "scale=2; $used / 1024 / 1024" | bc)
    local available_gb=$(echo "scale=2; $available / 1024 / 1024" | bc)
    local usage_percent=$(echo "scale=2; $used * 100 / $total" | bc)
    
    echo "$used_gb,$available_gb,$usage_percent"
}

# Function to get disk usage
get_disk_usage() {
    local disk_info=$(df / | tail -1)
    local used_kb=$(echo $disk_info | awk '{print $3}')
    local available_kb=$(echo $disk_info | awk '{print $4}')
    local usage_percent=$(echo $disk_info | awk '{print $5}' | sed 's/%//')
    
    local used_gb=$(echo "scale=2; $used_kb / 1024 / 1024" | bc)
    local available_gb=$(echo "scale=2; $available_kb / 1024 / 1024" | bc)
    
    echo "$used_gb,$available_gb,$usage_percent"
}

# Function to get Docker stats
get_docker_stats() {
    local docker_output
    docker_output=$(docker stats --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$docker_output" ]; then
        local total_cpu=0
        local total_memory=0
        local container_count=0
        
        # Skip header line and process each container
        echo "$docker_output" | tail -n +2 | while read -r line; do
            if [ -n "$line" ]; then
                local cpu_percent=$(echo "$line" | awk '{print $1}' | sed 's/%//')
                local memory_usage=$(echo "$line" | awk '{print $2}' | cut -d'/' -f1)
                
                # Handle CPU percentage
                if [[ "$cpu_percent" =~ ^[0-9]*\.?[0-9]+$ ]]; then
                    total_cpu=$(echo "$total_cpu + $cpu_percent" | bc)
                fi
                
                # Handle memory usage (convert to MB)
                if [[ "$memory_usage" =~ ([0-9]*\.?[0-9]+)([KMGT]iB) ]]; then
                    local value="${BASH_REMATCH[1]}"
                    local unit="${BASH_REMATCH[2]}"
                    
                    case "$unit" in
                        "KiB") memory_mb=$(echo "scale=2; $value / 1024" | bc) ;;
                        "MiB") memory_mb="$value" ;;
                        "GiB") memory_mb=$(echo "scale=2; $value * 1024" | bc) ;;
                        "TiB") memory_mb=$(echo "scale=2; $value * 1024 * 1024" | bc) ;;
                        *) memory_mb="0" ;;
                    esac
                    
                    total_memory=$(echo "$total_memory + $memory_mb" | bc)
                fi
                
                container_count=$((container_count + 1))
            fi
        done
        
        # Count active containers
        container_count=$(docker ps -q | wc -l)
        
        # Get aggregated stats differently due to shell limitations
        if [ "$container_count" -gt 0 ]; then
            # Get CPU and Memory totals from docker stats
            local stats_output=$(docker stats --no-stream --format "{{.CPUPerc}} {{.MemUsage}}" 2>/dev/null)
            total_cpu=0
            total_memory=0
            
            if [ -n "$stats_output" ]; then
                while read -r cpu_perc mem_usage; do
                    # Remove % from CPU
                    cpu_val=$(echo "$cpu_perc" | sed 's/%//')
                    if [[ "$cpu_val" =~ ^[0-9]*\.?[0-9]+$ ]]; then
                        total_cpu=$(echo "$total_cpu + $cpu_val" | bc 2>/dev/null || echo "$total_cpu")
                    fi
                    
                    # Extract memory value
                    mem_val=$(echo "$mem_usage" | cut -d'/' -f1)
                    if [[ "$mem_val" =~ ([0-9]*\.?[0-9]+)([KMGT]iB) ]]; then
                        local value="${BASH_REMATCH[1]}"
                        local unit="${BASH_REMATCH[2]}"
                        
                        case "$unit" in
                            "KiB") memory_mb=$(echo "scale=2; $value / 1024" | bc) ;;
                            "MiB") memory_mb="$value" ;;
                            "GiB") memory_mb=$(echo "scale=2; $value * 1024" | bc) ;;
                            "TiB") memory_mb=$(echo "scale=2; $value * 1024 * 1024" | bc) ;;
                            *) memory_mb="0" ;;
                        esac
                        
                        total_memory=$(echo "$total_memory + $memory_mb" | bc 2>/dev/null || echo "$total_memory")
                    fi
                done <<< "$stats_output"
            fi
        fi
        
        echo "${total_cpu:-0},${total_memory:-0},$container_count"
    else
        echo "0,0,0"
    fi
}

# Function to get system load
get_system_load() {
    local load_avg=$(cat /proc/loadavg)
    echo "$load_avg" | awk '{print $1 "," $2 "," $3}'
}

# Function to get color based on usage percentage
get_color() {
    local usage=$1
    local high_threshold=${2:-80}
    local medium_threshold=${3:-60}
    
    if (( $(echo "$usage > $high_threshold" | bc -l) )); then
        echo "$RED"
    elif (( $(echo "$usage > $medium_threshold" | bc -l) )); then
        echo "$YELLOW"
    else
        echo "$GREEN"
    fi
}

# Initialize peak tracking
PEAK_CPU=0
PEAK_RAM=0
PEAK_DISK=0
PEAK_DOCKER_CPU=0
PEAK_DOCKER_MEMORY=0

# Trap Ctrl+C
trap 'echo -e "\n${RED}🛑 Monitoring stopped by user${NC}"; cleanup_and_exit' INT

cleanup_and_exit() {
    # Write summary to log
    local end_time=$(date '+%Y-%m-%d %H:%M:%S')
    cat >> "$LOG_FILE" << EOF

=== MONITORING SUMMARY ===
Peak CPU Usage: ${PEAK_CPU}%
Peak RAM Usage: ${PEAK_RAM}%
Peak Disk Usage: ${PEAK_DISK}%
Peak Docker CPU: ${PEAK_DOCKER_CPU}%
Peak Docker Memory: ${PEAK_DOCKER_MEMORY} MB
Monitoring ended: $end_time
EOF
    
    echo ""
    echo -e "${GREEN}📊 MONITORING SUMMARY:${NC}"
    echo -e "${WHITE}Peak CPU Usage: ${PEAK_CPU}%${NC}"
    echo -e "${WHITE}Peak RAM Usage: ${PEAK_RAM}%${NC}"
    echo -e "${WHITE}Peak Disk Usage: ${PEAK_DISK}%${NC}"
    echo -e "${WHITE}Peak Docker CPU: ${PEAK_DOCKER_CPU}%${NC}"
    echo -e "${WHITE}Peak Docker Memory: ${PEAK_DOCKER_MEMORY} MB${NC}"
    echo ""
    echo -e "${YELLOW}📄 Full log saved to: $LOG_FILE${NC}"
    exit 0
}

# Main monitoring loop
while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Get system metrics
    CPU_USAGE=$(get_cpu_usage)
    RAM_STATS=$(get_ram_usage)
    DISK_STATS=$(get_disk_usage)
    DOCKER_STATS=$(get_docker_stats)
    LOAD_STATS=$(get_system_load)
    
    # Parse stats
    RAM_USED=$(echo "$RAM_STATS" | cut -d',' -f1)
    RAM_AVAILABLE=$(echo "$RAM_STATS" | cut -d',' -f2)
    RAM_USAGE_PERCENT=$(echo "$RAM_STATS" | cut -d',' -f3)
    
    DISK_USED=$(echo "$DISK_STATS" | cut -d',' -f1)
    DISK_FREE=$(echo "$DISK_STATS" | cut -d',' -f2)
    DISK_USAGE_PERCENT=$(echo "$DISK_STATS" | cut -d',' -f3)
    
    DOCKER_CPU=$(echo "$DOCKER_STATS" | cut -d',' -f1)
    DOCKER_MEMORY=$(echo "$DOCKER_STATS" | cut -d',' -f2)
    CONTAINER_COUNT=$(echo "$DOCKER_STATS" | cut -d',' -f3)
    
    # Update peaks
    PEAK_CPU=$(echo "$CPU_USAGE $PEAK_CPU" | awk '{print ($1 > $2) ? $1 : $2}')
    PEAK_RAM=$(echo "$RAM_USAGE_PERCENT $PEAK_RAM" | awk '{print ($1 > $2) ? $1 : $2}')
    PEAK_DISK=$(echo "$DISK_USAGE_PERCENT $PEAK_DISK" | awk '{print ($1 > $2) ? $1 : $2}')
    PEAK_DOCKER_CPU=$(echo "$DOCKER_CPU $PEAK_DOCKER_CPU" | awk '{print ($1 > $2) ? $1 : $2}')
    PEAK_DOCKER_MEMORY=$(echo "$DOCKER_MEMORY $PEAK_DOCKER_MEMORY" | awk '{print ($1 > $2) ? $1 : $2}')
    
    # Write to log
    echo "$TIMESTAMP,$CPU_USAGE,$RAM_USED,$RAM_AVAILABLE,$RAM_USAGE_PERCENT,$DISK_USED,$DISK_FREE,$DISK_USAGE_PERCENT,$DOCKER_CPU,$DOCKER_MEMORY,$CONTAINER_COUNT,$LOAD_STATS" >> "$LOG_FILE"
    
    # Display current stats
    clear
    echo -e "${GREEN}🔍 RESOURCE MONITORING - $PHASE PHASE${NC}"
    echo -e "${GREEN}===============================================${NC}"
    echo -e "${WHITE}⏰ Time: $TIMESTAMP${NC}"
    echo ""
    
    echo -e "${CYAN}💻 SYSTEM RESOURCES:${NC}"
    CPU_COLOR=$(get_color "$CPU_USAGE")
    RAM_COLOR=$(get_color "$RAM_USAGE_PERCENT")
    DISK_COLOR=$(get_color "$DISK_USAGE_PERCENT")
    
    printf "   CPU Usage:       ${CPU_COLOR}%.2f%% (Peak: %.2f%%)${NC}\n" "$CPU_USAGE" "$PEAK_CPU"
    printf "   RAM Usage:       ${RAM_COLOR}%.2f GB / %.2f GB (%.2f%%) (Peak: %.2f%%)${NC}\n" "$RAM_USED" "$((${RAM_USED%.*} + ${RAM_AVAILABLE%.*}))" "$RAM_USAGE_PERCENT" "$PEAK_RAM"
    printf "   Disk Usage:      ${DISK_COLOR}%.2f GB / %.2f GB (%s%%) (Peak: %.2f%%)${NC}\n" "$DISK_USED" "$((${DISK_USED%.*} + ${DISK_FREE%.*}))" "$DISK_USAGE_PERCENT" "$PEAK_DISK"
    echo ""
    
    echo -e "${MAGENTA}🐳 DOCKER RESOURCES:${NC}"
    DOCKER_CPU_COLOR=$(get_color "$DOCKER_CPU")
    DOCKER_MEM_COLOR=$(get_color "$DOCKER_MEMORY" 8192 4096)
    
    printf "   Container CPU:   ${DOCKER_CPU_COLOR}%.2f%% (Peak: %.2f%%)${NC}\n" "$DOCKER_CPU" "$PEAK_DOCKER_CPU"
    printf "   Container RAM:   ${DOCKER_MEM_COLOR}%.2f MB (Peak: %.2f MB)${NC}\n" "$DOCKER_MEMORY" "$PEAK_DOCKER_MEMORY"
    printf "   Active Containers: ${WHITE}%s${NC}\n" "$CONTAINER_COUNT"
    echo ""
    
    echo -e "${BLUE}📊 System Load: $LOAD_STATS${NC}"
    echo -e "${YELLOW}📊 Log: $LOG_FILE${NC}"
    echo -e "${GRAY}Press Ctrl+C to stop monitoring...${NC}"
    
    sleep "$INTERVAL_SECONDS"
done 