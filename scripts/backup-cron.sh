#!/bin/bash

# Automated backup scheduler for Lead Management System
# This script sets up cron jobs for regular database backups

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-database.sh"
CRON_USER="${CRON_USER:-root}"
BACKUP_SCHEDULE="${BACKUP_SCHEDULE:-0 2 * * *}"  # Daily at 2 AM
LOG_FILE="/var/log/backup-cron.log"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS] COMMAND

Manage automated database backup scheduling.

COMMANDS:
    install     Install cron job for automated backups
    uninstall   Remove cron job for automated backups
    status      Show current cron job status
    test        Test backup script execution

OPTIONS:
    -h, --help              Show this help message
    -u, --user USER         Cron user (default: $CRON_USER)
    -s, --schedule CRON     Cron schedule (default: $BACKUP_SCHEDULE)

EXAMPLES:
    $0 install
    $0 --user postgres --schedule "0 */6 * * *" install
    $0 status
    $0 uninstall

CRON SCHEDULE FORMAT:
    * * * * *
    │ │ │ │ │
    │ │ │ │ └─── Day of week (0-7, Sunday = 0 or 7)
    │ │ │ └───── Month (1-12)
    │ │ └─────── Day of month (1-31)
    │ └───────── Hour (0-23)
    └─────────── Minute (0-59)

EXAMPLES:
    "0 2 * * *"     - Daily at 2:00 AM
    "0 */6 * * *"   - Every 6 hours
    "0 2 * * 0"     - Weekly on Sunday at 2:00 AM
    "0 2 1 * *"     - Monthly on 1st day at 2:00 AM

EOF
}

# Function to check if cron job exists
cron_job_exists() {
    local user="$1"
    if crontab -u "$user" -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
        return 0
    else
        return 1
    fi
}

# Function to install cron job
install_cron_job() {
    local user="$1"
    local schedule="$2"
    
    log "Installing cron job for user: $user"
    log "Schedule: $schedule"
    log "Backup script: $BACKUP_SCRIPT"
    
    # Check if backup script exists and is executable
    if [ ! -f "$BACKUP_SCRIPT" ]; then
        log "ERROR: Backup script not found: $BACKUP_SCRIPT"
        return 1
    fi
    
    if [ ! -x "$BACKUP_SCRIPT" ]; then
        log "Making backup script executable..."
        chmod +x "$BACKUP_SCRIPT"
    fi
    
    # Check if cron job already exists
    if cron_job_exists "$user"; then
        log "WARNING: Cron job already exists for user $user"
        log "Use 'uninstall' command first to remove existing job"
        return 1
    fi
    
    # Create cron job entry
    local cron_entry="$schedule $BACKUP_SCRIPT >> $LOG_FILE 2>&1"
    
    # Add to crontab
    (crontab -u "$user" -l 2>/dev/null; echo "$cron_entry") | crontab -u "$user" -
    
    if cron_job_exists "$user"; then
        log "Cron job installed successfully"
        log "Backup will run according to schedule: $schedule"
        return 0
    else
        log "ERROR: Failed to install cron job"
        return 1
    fi
}

# Function to uninstall cron job
uninstall_cron_job() {
    local user="$1"
    
    log "Uninstalling cron job for user: $user"
    
    if ! cron_job_exists "$user"; then
        log "No cron job found for user $user"
        return 0
    fi
    
    # Remove cron job
    crontab -u "$user" -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab -u "$user" -
    
    if ! cron_job_exists "$user"; then
        log "Cron job uninstalled successfully"
        return 0
    else
        log "ERROR: Failed to uninstall cron job"
        return 1
    fi
}

# Function to show cron job status
show_status() {
    local user="$1"
    
    log "Checking cron job status for user: $user"
    
    if cron_job_exists "$user"; then
        log "Cron job is installed"
        log "Current crontab for user $user:"
        crontab -u "$user" -l 2>/dev/null | grep "$BACKUP_SCRIPT" || true
    else
        log "No cron job found for user $user"
    fi
    
    # Show recent backup logs
    if [ -f "$LOG_FILE" ]; then
        log "Recent backup activity (last 10 lines):"
        tail -n 10 "$LOG_FILE" 2>/dev/null || true
    else
        log "No backup log file found: $LOG_FILE"
    fi
}

# Function to test backup script
test_backup() {
    log "Testing backup script execution..."
    
    if [ ! -f "$BACKUP_SCRIPT" ]; then
        log "ERROR: Backup script not found: $BACKUP_SCRIPT"
        return 1
    fi
    
    if [ ! -x "$BACKUP_SCRIPT" ]; then
        log "ERROR: Backup script is not executable: $BACKUP_SCRIPT"
        return 1
    fi
    
    log "Running backup script test..."
    if "$BACKUP_SCRIPT"; then
        log "Backup script test completed successfully"
        return 0
    else
        log "ERROR: Backup script test failed"
        return 1
    fi
}

# Function to setup log rotation
setup_log_rotation() {
    local logrotate_config="/etc/logrotate.d/backup-cron"
    
    log "Setting up log rotation for backup logs..."
    
    cat > "$logrotate_config" << EOF
$LOG_FILE {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF
    
    log "Log rotation configured: $logrotate_config"
}

# Parse command line arguments
COMMAND=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -u|--user)
            CRON_USER="$2"
            shift 2
            ;;
        -s|--schedule)
            BACKUP_SCHEDULE="$2"
            shift 2
            ;;
        install|uninstall|status|test)
            COMMAND="$1"
            shift
            ;;
        *)
            log "ERROR: Unknown argument: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate command
if [ -z "$COMMAND" ]; then
    log "ERROR: No command specified"
    show_usage
    exit 1
fi

# Main execution
main() {
    log "Backup cron management started"
    log "Command: $COMMAND"
    log "User: $CRON_USER"
    log "Schedule: $BACKUP_SCHEDULE"
    
    case "$COMMAND" in
        install)
            if install_cron_job "$CRON_USER" "$BACKUP_SCHEDULE"; then
                setup_log_rotation
                log "Backup automation setup completed successfully"
                exit 0
            else
                log "ERROR: Failed to setup backup automation"
                exit 1
            fi
            ;;
        uninstall)
            if uninstall_cron_job "$CRON_USER"; then
                log "Backup automation removed successfully"
                exit 0
            else
                log "ERROR: Failed to remove backup automation"
                exit 1
            fi
            ;;
        status)
            show_status "$CRON_USER"
            exit 0
            ;;
        test)
            if test_backup; then
                log "Backup test completed successfully"
                exit 0
            else
                log "ERROR: Backup test failed"
                exit 1
            fi
            ;;
        *)
            log "ERROR: Unknown command: $COMMAND"
            show_usage
            exit 1
            ;;
    esac
}

# Create log file if it doesn't exist
touch "$LOG_FILE" 2>/dev/null || true

# Run main function
main "$@"