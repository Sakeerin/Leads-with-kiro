#!/bin/bash

# Database restore script for Lead Management System
# This script restores database from backup files

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:password@localhost:5432/lead_management}"
RESTORE_DATABASE="${RESTORE_DATABASE:-lead_management_restore}"

# Logging
LOG_FILE="${BACKUP_DIR}/restore.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "=== Database Restore Started at $(date) ==="

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS] BACKUP_FILE

Restore database from backup file.

OPTIONS:
    -h, --help              Show this help message
    -d, --database NAME     Target database name (default: $RESTORE_DATABASE)
    -u, --url URL          Database connection URL
    -f, --force            Force restore without confirmation
    -c, --create-db        Create target database if it doesn't exist
    -v, --verify           Verify backup before restore

EXAMPLES:
    $0 /backups/lead_management_backup_20231020_120000.sql.gz
    $0 --database test_restore --force backup.sql.gz
    $0 --create-db --verify /path/to/backup.sql.gz

EOF
}

# Function to verify backup file
verify_backup() {
    local backup_file="$1"
    
    log "Verifying backup file: $backup_file"
    
    if [ ! -f "$backup_file" ]; then
        log "ERROR: Backup file not found: $backup_file"
        return 1
    fi
    
    # Check if file is compressed
    if [[ "$backup_file" == *.gz ]]; then
        if ! gzip -t "$backup_file" 2>/dev/null; then
            log "ERROR: Invalid gzip file: $backup_file"
            return 1
        fi
        log "Backup file is a valid gzip archive"
    else
        log "Backup file is uncompressed"
    fi
    
    log "Backup verification successful"
    return 0
}

# Function to create database
create_database() {
    local db_name="$1"
    local base_url="${DATABASE_URL%/*}"
    
    log "Creating database: $db_name"
    
    if psql "$base_url/postgres" -c "CREATE DATABASE \"$db_name\";" 2>/dev/null; then
        log "Database created successfully: $db_name"
    else
        log "Database might already exist or creation failed: $db_name"
    fi
}

# Function to drop database
drop_database() {
    local db_name="$1"
    local base_url="${DATABASE_URL%/*}"
    
    log "Dropping database: $db_name"
    
    # Terminate existing connections
    psql "$base_url/postgres" -c "
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '$db_name' AND pid <> pg_backend_pid();
    " 2>/dev/null || true
    
    # Drop database
    if psql "$base_url/postgres" -c "DROP DATABASE IF EXISTS \"$db_name\";" 2>/dev/null; then
        log "Database dropped successfully: $db_name"
    else
        log "Failed to drop database: $db_name"
        return 1
    fi
}

# Function to restore database
restore_database() {
    local backup_file="$1"
    local target_db="$2"
    local target_url="${DATABASE_URL%/*}/$target_db"
    
    log "Starting database restore..."
    log "Backup file: $backup_file"
    log "Target database: $target_db"
    
    # Prepare restore command based on file type
    if [[ "$backup_file" == *.gz ]]; then
        log "Restoring from compressed backup..."
        if gunzip -c "$backup_file" | pg_restore \
            --verbose \
            --no-password \
            --dbname="$target_url" \
            --clean \
            --if-exists \
            --no-owner \
            --no-privileges; then
            log "Database restore completed successfully"
            return 0
        else
            log "ERROR: Database restore failed"
            return 1
        fi
    else
        log "Restoring from uncompressed backup..."
        if pg_restore \
            --verbose \
            --no-password \
            --dbname="$target_url" \
            --clean \
            --if-exists \
            --no-owner \
            --no-privileges \
            "$backup_file"; then
            log "Database restore completed successfully"
            return 0
        else
            log "ERROR: Database restore failed"
            return 1
        fi
    fi
}

# Function to validate restored database
validate_restore() {
    local target_db="$1"
    local target_url="${DATABASE_URL%/*}/$target_db"
    
    log "Validating restored database..."
    
    # Check if database exists and is accessible
    if ! psql "$target_url" -c "SELECT 1;" &>/dev/null; then
        log "ERROR: Cannot connect to restored database"
        return 1
    fi
    
    # Check if main tables exist
    local table_count=$(psql "$target_url" -t -c "
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE';
    " | tr -d ' ')
    
    if [ "$table_count" -gt 0 ]; then
        log "Validation successful: Found $table_count tables in restored database"
        return 0
    else
        log "ERROR: No tables found in restored database"
        return 1
    fi
}

# Function to show restore summary
show_summary() {
    local backup_file="$1"
    local target_db="$2"
    local target_url="${DATABASE_URL%/*}/$target_db"
    
    log "=== Restore Summary ==="
    log "Backup file: $backup_file"
    log "Target database: $target_db"
    log "Database URL: ${target_url%@*}@***"
    
    # Get database size
    local db_size=$(psql "$target_url" -t -c "
        SELECT pg_size_pretty(pg_database_size('$target_db'));
    " 2>/dev/null | tr -d ' ' || echo "Unknown")
    
    log "Database size: $db_size"
    
    # Get table count
    local table_count=$(psql "$target_url" -t -c "
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE';
    " 2>/dev/null | tr -d ' ' || echo "Unknown")
    
    log "Table count: $table_count"
    log "Restore completed at: $(date)"
}

# Parse command line arguments
FORCE=false
CREATE_DB=false
VERIFY=false
BACKUP_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -d|--database)
            RESTORE_DATABASE="$2"
            shift 2
            ;;
        -u|--url)
            DATABASE_URL="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -c|--create-db)
            CREATE_DB=true
            shift
            ;;
        -v|--verify)
            VERIFY=true
            shift
            ;;
        -*)
            log "ERROR: Unknown option: $1"
            show_usage
            exit 1
            ;;
        *)
            BACKUP_FILE="$1"
            shift
            ;;
    esac
done

# Validate arguments
if [ -z "$BACKUP_FILE" ]; then
    log "ERROR: Backup file not specified"
    show_usage
    exit 1
fi

# Main execution
main() {
    log "Database restore process started"
    
    # Check if required tools are available
    if ! command -v pg_restore &> /dev/null; then
        log "ERROR: pg_restore command not found. Please install PostgreSQL client tools."
        exit 1
    fi
    
    if ! command -v psql &> /dev/null; then
        log "ERROR: psql command not found. Please install PostgreSQL client tools."
        exit 1
    fi
    
    # Verify backup file if requested
    if [ "$VERIFY" = true ]; then
        if ! verify_backup "$BACKUP_FILE"; then
            log "ERROR: Backup verification failed"
            exit 1
        fi
    fi
    
    # Confirm restore operation
    if [ "$FORCE" != true ]; then
        echo
        echo "WARNING: This will restore the database '$RESTORE_DATABASE' from backup."
        echo "All existing data in the target database will be lost!"
        echo
        echo "Backup file: $BACKUP_FILE"
        echo "Target database: $RESTORE_DATABASE"
        echo
        read -p "Are you sure you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log "Restore operation cancelled by user"
            exit 0
        fi
    fi
    
    # Create database if requested
    if [ "$CREATE_DB" = true ]; then
        create_database "$RESTORE_DATABASE"
    fi
    
    # Perform the restore
    if restore_database "$BACKUP_FILE" "$RESTORE_DATABASE"; then
        if validate_restore "$RESTORE_DATABASE"; then
            show_summary "$BACKUP_FILE" "$RESTORE_DATABASE"
            log "Database restore process completed successfully"
            exit 0
        else
            log "ERROR: Database validation failed after restore"
            exit 1
        fi
    else
        log "ERROR: Database restore process failed"
        exit 1
    fi
}

# Handle script interruption
trap 'log "Restore process interrupted"; exit 1' INT TERM

# Run main function
main "$@"