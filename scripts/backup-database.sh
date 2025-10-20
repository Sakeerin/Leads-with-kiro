#!/bin/bash

# Database backup script for Lead Management System
# This script creates automated backups with retention policies

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:password@localhost:5432/lead_management}"
BACKUP_PREFIX="lead_management_backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_PREFIX}_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Logging
LOG_FILE="${BACKUP_DIR}/backup.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "=== Database Backup Started at $(date) ==="

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    log "Cleanup completed"
}

# Function to verify backup
verify_backup() {
    local backup_file="$1"
    log "Verifying backup file: $backup_file"
    
    if [ ! -f "$backup_file" ]; then
        log "ERROR: Backup file not found: $backup_file"
        return 1
    fi
    
    # Check if file is not empty
    if [ ! -s "$backup_file" ]; then
        log "ERROR: Backup file is empty: $backup_file"
        return 1
    fi
    
    # Check if it's a valid gzip file
    if ! gzip -t "$backup_file" 2>/dev/null; then
        log "ERROR: Backup file is not a valid gzip file: $backup_file"
        return 1
    fi
    
    log "Backup verification successful"
    return 0
}

# Function to send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # In production, you would send to Slack, email, etc.
    log "NOTIFICATION [$status]: $message"
    
    # Example Slack notification (uncomment and configure)
    # if [ -n "$SLACK_WEBHOOK_URL" ]; then
    #     curl -X POST -H 'Content-type: application/json' \
    #         --data "{\"text\":\"Database Backup [$status]: $message\"}" \
    #         "$SLACK_WEBHOOK_URL"
    # fi
}

# Main backup function
perform_backup() {
    log "Starting database backup..."
    log "Database URL: ${DATABASE_URL%@*}@***"
    log "Backup file: $COMPRESSED_FILE"
    
    # Create the backup
    if pg_dump "$DATABASE_URL" \
        --verbose \
        --no-password \
        --format=custom \
        --compress=9 \
        --file="$BACKUP_FILE"; then
        
        log "Database dump completed successfully"
        
        # Compress the backup
        if gzip "$BACKUP_FILE"; then
            log "Backup compression completed"
            
            # Verify the backup
            if verify_backup "$COMPRESSED_FILE"; then
                local file_size=$(du -h "$COMPRESSED_FILE" | cut -f1)
                log "Backup created successfully: $COMPRESSED_FILE ($file_size)"
                send_notification "SUCCESS" "Database backup completed: $COMPRESSED_FILE ($file_size)"
                return 0
            else
                log "ERROR: Backup verification failed"
                send_notification "ERROR" "Backup verification failed: $COMPRESSED_FILE"
                return 1
            fi
        else
            log "ERROR: Backup compression failed"
            send_notification "ERROR" "Backup compression failed: $BACKUP_FILE"
            return 1
        fi
    else
        log "ERROR: Database dump failed"
        send_notification "ERROR" "Database dump failed"
        return 1
    fi
}

# Function to create point-in-time recovery info
create_recovery_info() {
    local recovery_file="${BACKUP_DIR}/recovery_info_${TIMESTAMP}.json"
    
    cat > "$recovery_file" << EOF
{
    "backup_timestamp": "$TIMESTAMP",
    "backup_file": "$COMPRESSED_FILE",
    "database_url": "${DATABASE_URL%@*}@***",
    "backup_type": "full",
    "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "retention_until": "$(date -u -d "+$RETENTION_DAYS days" +"%Y-%m-%dT%H:%M:%SZ")",
    "backup_size": "$(du -b "$COMPRESSED_FILE" 2>/dev/null | cut -f1 || echo 0)",
    "checksum": "$(sha256sum "$COMPRESSED_FILE" | cut -d' ' -f1)"
}
EOF
    
    log "Recovery info created: $recovery_file"
}

# Main execution
main() {
    log "Database backup process started"
    
    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        log "ERROR: pg_dump command not found. Please install PostgreSQL client tools."
        send_notification "ERROR" "pg_dump command not found"
        exit 1
    fi
    
    # Perform the backup
    if perform_backup; then
        create_recovery_info
        cleanup_old_backups
        log "Database backup process completed successfully"
        exit 0
    else
        log "Database backup process failed"
        exit 1
    fi
}

# Handle script interruption
trap 'log "Backup process interrupted"; exit 1' INT TERM

# Run main function
main "$@"