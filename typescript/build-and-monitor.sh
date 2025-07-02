#!/bin/bash

# Comprehensive Build and Monitor Script for Vibekit Agents (Ubuntu/Linux)
# This script builds all containers, monitors resource usage, and provides deployment recommendations

# Default parameters
BUILD_ONLY=false
MONITOR_ONLY=false
MONITOR_INTERVAL=5
LOG_DIR="monitoring-logs"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --monitor-only)
            MONITOR_ONLY=true
            shift
            ;;
        --monitor-interval)
            MONITOR_INTERVAL="$2"
            shift 2
            ;;
        --log-dir)
            LOG_DIR="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --build-only           Only build containers, don't run them"
            echo "  --monitor-only         Only run monitoring (no build/run)"
            echo "  --monitor-interval N   Monitoring interval in seconds (default: 5)"
            echo "  --log-dir DIR         Directory for log files (default: monitoring-logs)"
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

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_color "$CYAN" "🔍 Checking prerequisites..."
    
    # Check Docker
    if command -v docker >/dev/null 2>&1; then
        DOCKER_VERSION=$(docker --version)
        print_color "$GREEN" "✅ Docker: $DOCKER_VERSION"
    else
        print_color "$RED" "❌ Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_VERSION=$(docker compose version)
        print_color "$GREEN" "✅ Docker Compose: $COMPOSE_VERSION"
    else
        print_color "$RED" "❌ Docker Compose is not available"
        exit 1
    fi
    
    # Check available disk space
    DISK_INFO=$(df / | tail -1)
    FREE_SPACE_KB=$(echo $DISK_INFO | awk '{print $4}')
    FREE_SPACE_GB=$(echo "scale=2; $FREE_SPACE_KB / 1024 / 1024" | bc)
    
    if (( $(echo "$FREE_SPACE_GB < 20" | bc -l) )); then
        print_color "$YELLOW" "⚠️  Warning: Low disk space (${FREE_SPACE_GB} GB free). Recommended: 20+ GB"
    else
        print_color "$GREEN" "✅ Disk Space: ${FREE_SPACE_GB} GB available"
    fi
    
    # Check RAM
    TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    TOTAL_RAM_GB=$(echo "scale=2; $TOTAL_RAM_KB / 1024 / 1024" | bc)
    print_color "$GREEN" "✅ Total RAM: ${TOTAL_RAM_GB} GB"
    
    if (( $(echo "$TOTAL_RAM_GB < 8" | bc -l) )); then
        print_color "$YELLOW" "⚠️  Warning: Limited RAM (${TOTAL_RAM_GB} GB). Recommended: 8+ GB"
    fi
    
    # Check CPU info
    CPU_MODEL=$(grep "model name" /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)
    CPU_CORES=$(nproc)
    print_color "$GREEN" "✅ CPU: $CPU_MODEL ($CPU_CORES cores)"
    
    echo ""
}

# Function to get service list from compose.yml
get_service_list() {
    if [ ! -f "compose.yml" ]; then
        print_color "$RED" "❌ compose.yml not found in current directory"
        exit 1
    fi
    
    # Extract service names from compose.yml
    grep -E "^  [a-zA-Z0-9-_]+:" compose.yml | sed 's/://g' | sed 's/^  //' | grep -v "^volumes$"
}

# Function to start resource monitoring
start_resource_monitoring() {
    local phase=$1
    local log_file=$2
    
    print_color "$CYAN" "📊 Starting resource monitoring for $phase phase..."
    
    # Start monitoring in background
    if [ -f "./monitor-resources.sh" ]; then
        ./monitor-resources.sh -l "$log_file" -i "$MONITOR_INTERVAL" -p "$phase" &
        MONITOR_PID=$!
        echo $MONITOR_PID
    else
        print_color "$YELLOW" "⚠️  Monitoring script not found. Continuing without monitoring..."
        echo ""
    fi
}

# Function to stop resource monitoring
stop_resource_monitoring() {
    local monitor_pid=$1
    
    if [ ! -z "$monitor_pid" ]; then
        print_color "$YELLOW" "🛑 Stopping resource monitoring..."
        kill $monitor_pid 2>/dev/null
        wait $monitor_pid 2>/dev/null
    fi
}

# Function to build phase
build_phase() {
    print_color "$GREEN" "🏗️  STARTING BUILD PHASE"
    print_color "$GREEN" "========================="
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    local build_log_file="$LOG_DIR/build-monitoring-$(date '+%Y%m%d-%H%M%S').log"
    local monitor_pid=$(start_resource_monitoring "build" "$build_log_file")
    
    local success=true
    
    {
        print_color "$CYAN" "🔨 Building all containers..."
        local build_start=$(date +%s)
        
        # Build with verbose output
        if docker compose build --parallel --progress=plain 2>&1 | tee "$LOG_DIR/docker-build.log"; then
            local build_end=$(date +%s)
            local build_duration=$(echo "scale=2; ($build_end - $build_start) / 60" | bc)
            print_color "$GREEN" "✅ Build completed successfully in ${build_duration} minutes"
        else
            print_color "$RED" "❌ Build failed"
            success=false
        fi
        
    } || {
        success=false
    }
    
    stop_resource_monitoring "$monitor_pid"
    
    if [ "$success" = true ]; then
        return 0
    else
        return 1
    fi
}

# Function to runtime phase
runtime_phase() {
    print_color "$GREEN" "🚀 STARTING RUNTIME PHASE"
    print_color "$GREEN" "=========================="
    
    local runtime_log_file="$LOG_DIR/runtime-monitoring-$(date '+%Y%m%d-%H%M%S').log"
    local monitor_pid=$(start_resource_monitoring "runtime" "$runtime_log_file")
    
    local success=true
    
    {
        print_color "$CYAN" "🔄 Starting all containers..."
        local start_time=$(date +%s)
        
        # Start containers
        if docker compose up -d 2>&1 | tee "$LOG_DIR/docker-startup.log"; then
            print_color "$GREEN" "✅ All containers started successfully"
        else
            print_color "$RED" "❌ Failed to start containers"
            success=false
            stop_resource_monitoring "$monitor_pid"
            return 1
        fi
        
        # Wait for containers to be fully ready
        print_color "$YELLOW" "⏳ Waiting for containers to initialize..."
        sleep 30
        
        # Check container status
        print_color "$CYAN" "📋 Container Status:"
        docker compose ps
        
        # Run containers for monitoring period
        print_color "$CYAN" "📊 Monitoring runtime performance for 5 minutes..."
        print_color "$GRAY" "   You can stop monitoring early with Ctrl+C"
        
        local end_time=$((start_time + 300))  # 5 minutes
        
        # Set up trap for Ctrl+C
        trap 'print_color "$YELLOW" "\n⚠️  Monitoring stopped by user"; break' INT
        
        while [ $(date +%s) -lt $end_time ]; do
            local remaining=$((end_time - $(date +%s)))
            printf "\r⏱️  Time remaining: %02d:%02d" $((remaining / 60)) $((remaining % 60))
            sleep 10
            
            # Check if any containers have stopped
            local running_containers=$(docker compose ps --services --filter "status=running" | wc -l)
            local all_services=$(get_service_list | wc -l)
            
            if [ $running_containers -lt $all_services ]; then
                print_color "$YELLOW" "\n⚠️  Some containers have stopped. Checking status..."
                docker compose ps
            fi
        done
        
        # Reset trap
        trap - INT
        echo ""
        
    } || {
        success=false
    }
    
    print_color "$YELLOW" "🛑 Stopping containers..."
    docker compose down 2>&1 | tee "$LOG_DIR/docker-shutdown.log"
    
    stop_resource_monitoring "$monitor_pid"
    
    if [ "$success" = true ]; then
        return 0
    else
        return 1
    fi
}

# Function to generate resource report
generate_resource_report() {
    print_color "$GREEN" "📊 GENERATING RESOURCE REPORT"
    print_color "$GREEN" "=============================="
    
    local report_file="$LOG_DIR/resource-report-$(date '+%Y%m%d-%H%M%S').md"
    
    # Get system info
    local os_info=$(lsb_release -d 2>/dev/null | cut -f2 || echo "Linux")
    local cpu_info=$(grep "model name" /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)
    local cpu_cores=$(nproc)
    local total_ram_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    local total_ram_gb=$(echo "scale=2; $total_ram_kb / 1024 / 1024" | bc)
    
    # Start building the report
    cat > "$report_file" << EOF
# Vibekit Agents Resource Usage Report
Generated: $(date '+%Y-%m-%d %H:%M:%S')

## System Specifications
- **OS**: $os_info
- **CPU**: $cpu_info
- **CPU Cores**: $cpu_cores
- **Total RAM**: ${total_ram_gb} GB

## Container Services
EOF

    # Add services list
    get_service_list | while read service; do
        echo "- $service" >> "$report_file"
    done
    
    echo "" >> "$report_file"
    echo "## Build Phase Results" >> "$report_file"
    
    # Add build phase results
    for log_file in "$LOG_DIR"/build-monitoring-*.log; do
        if [ -f "$log_file" ]; then
            echo "" >> "$report_file"
            echo "### Build Phase - $(basename "$log_file")" >> "$report_file"
            echo '```' >> "$report_file"
            
            # Extract summary from log
            if grep -A 10 "=== MONITORING SUMMARY ===" "$log_file" >> "$report_file"; then
                echo '```' >> "$report_file"
            else
                echo "No summary available" >> "$report_file"
                echo '```' >> "$report_file"
            fi
        fi
    done
    
    echo "" >> "$report_file"
    echo "## Runtime Phase Results" >> "$report_file"
    
    # Add runtime phase results
    for log_file in "$LOG_DIR"/runtime-monitoring-*.log; do
        if [ -f "$log_file" ]; then
            echo "" >> "$report_file"
            echo "### Runtime Phase - $(basename "$log_file")" >> "$report_file"
            echo '```' >> "$report_file"
            
            # Extract summary from log
            if grep -A 10 "=== MONITORING SUMMARY ===" "$log_file" >> "$report_file"; then
                echo '```' >> "$report_file"
            else
                echo "No summary available" >> "$report_file"
                echo '```' >> "$report_file"
            fi
        fi
    done
    
    # Add Ubuntu server recommendations
    cat >> "$report_file" << 'EOF'

## Ubuntu Server Recommendations

Based on the monitoring results above, here are the recommended specifications for your Ubuntu server:

### Minimum Requirements
- **RAM**: 8 GB (for basic operation)
- **CPU**: 4 cores, 2.4 GHz+
- **Storage**: 50 GB SSD
- **Network**: 100 Mbps

### Recommended Specifications
- **RAM**: 16 GB (for optimal performance)
- **CPU**: 6-8 cores, 3.0 GHz+
- **Storage**: 100 GB SSD (with 50% free space)
- **Network**: 1 Gbps

### Production Specifications
- **RAM**: 32 GB (for high availability and future scaling)
- **CPU**: 8+ cores, 3.2 GHz+
- **Storage**: 200 GB NVMe SSD
- **Network**: 1 Gbps with redundancy

### Additional Considerations
1. **Docker Resource Limits**: Configure per-container limits
2. **Monitoring**: Install monitoring tools (htop, docker stats, prometheus)
3. **Backup**: Implement regular backup strategy
4. **Security**: Configure firewall and update policies
5. **Load Balancing**: Consider nginx for production deployments

### Ubuntu Installation Commands
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Install monitoring tools
sudo apt-get install htop iotop nethogs bc

# Install system monitoring
sudo apt-get install sysstat dstat
```

### Resource Monitoring Commands for Ubuntu
```bash
# Monitor CPU, RAM, Disk in real-time
htop

# Monitor Docker containers
docker stats

# Monitor disk I/O
sudo iotop

# Monitor network usage
sudo nethogs

# System performance overview
dstat -cdngy
```

### Production Deployment Checklist
- [ ] Set up automated backups
- [ ] Configure log rotation
- [ ] Set up monitoring and alerting
- [ ] Configure firewall rules
- [ ] Set up SSL certificates
- [ ] Configure resource limits
- [ ] Set up health checks
- [ ] Configure auto-restart policies
- [ ] Set up centralized logging
- [ ] Plan scaling strategy

EOF
    
    print_color "$GREEN" "✅ Resource report generated: $report_file"
    echo "$report_file"
}

# Main function
main() {
    print_color "$MAGENTA" "🚀 VIBEKIT AGENTS BUILD & MONITOR TOOL (Ubuntu/Linux)"
    print_color "$MAGENTA" "======================================================="
    echo ""
    
    check_prerequisites
    
    if [ "$MONITOR_ONLY" = true ]; then
        print_color "$YELLOW" "📊 Monitor-only mode enabled"
        local runtime_log_file="$LOG_DIR/manual-monitoring-$(date '+%Y%m%d-%H%M%S').log"
        local monitor_pid=$(start_resource_monitoring "manual" "$runtime_log_file")
        
        print_color "$GRAY" "Press Enter to stop monitoring..."
        read
        
        stop_resource_monitoring "$monitor_pid"
        return
    fi
    
    local success=true
    
    if [ "$BUILD_ONLY" = false ]; then
        # Full process: Build + Runtime
        if build_phase; then
            if runtime_phase; then
                success=true
            else
                success=false
            fi
        else
            success=false
        fi
    else
        # Build only
        if build_phase; then
            success=true
        else
            success=false
        fi
    fi
    
    if [ "$success" = true ]; then
        local report_file=$(generate_resource_report)
        
        echo ""
        print_color "$GREEN" "🎉 PROCESS COMPLETED SUCCESSFULLY!"
        print_color "$GREEN" "==================================="
        print_color "$CYAN" "📄 Report: $report_file"
        print_color "$CYAN" "📁 Logs: $LOG_DIR/"
        
        # Display quick summary
        echo ""
        print_color "$WHITE" "🔍 Quick Summary:"
        
        # Find latest monitoring log
        local latest_log=$(ls -t "$LOG_DIR"/*-monitoring-*.log 2>/dev/null | head -1)
        if [ -f "$latest_log" ]; then
            grep "Peak" "$latest_log" | while read line; do
                print_color "$WHITE" "   $line"
            done
        fi
        
        echo ""
        print_color "$YELLOW" "💡 Next Steps:"
        print_color "$WHITE" "   1. Review the generated report for Ubuntu server sizing"
        print_color "$WHITE" "   2. Check individual container logs if any issues occurred"
        print_color "$WHITE" "   3. Use the monitoring data to plan your production deployment"
        
    else
        echo ""
        print_color "$RED" "❌ PROCESS FAILED"
        print_color "$YELLOW" "Check the logs in $LOG_DIR/ for details"
        exit 1
    fi
}

# Make sure we have bc for calculations
if ! command -v bc >/dev/null 2>&1; then
    print_color "$RED" "❌ 'bc' calculator is required but not installed"
    print_color "$YELLOW" "Install with: sudo apt-get install bc"
    exit 1
fi

# Execute main function
main 