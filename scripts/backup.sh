/#!/bin/bash

# Rhulani Tuck Shop - Database Backup & Recovery Script
# This script manages database backups and restoration

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-.backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
MYSQL_HOST="${DATABASE_HOST:-localhost}"
MYSQL_PORT="${DATABASE_PORT:-3306}"
MYSQL_USER="${DATABASE_USER:-root}"
MYSQL_DB="${DATABASE_NAME:-rhulanituckshop}"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

# Success message
success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Warning message
warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# =====================================================
# BACKUP FUNCTIONS
# =====================================================

backup_database() {
    log "Starting database backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/db_$TIMESTAMP.sql"
    
    # Read password from environment variable to avoid prompt
    if [ -z "$DATABASE_PASSWORD" ]; then
        read -sp "Enter MySQL password: " MYSQL_PASS
        echo
    else
        MYSQL_PASS="$DATABASE_PASSWORD"
    fi
    
    # Backup database
    if mysqldump -h "$MYSQL_HOST" -P "$MYSQL_PORT" \
                 -u "$MYSQL_USER" -p"$MYSQL_PASS" \
                 "$MYSQL_DB" > "$BACKUP_FILE" 2>/dev/null; then
        
        # Compress backup
        gzip "$BACKUP_FILE"
        success "Database backup completed: ${BACKUP_FILE}.gz"
        
        # Get file size
        SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
        log "Backup size: $SIZE"
        
        # Clean old backups
        cleanup_old_backups
        
        return 0
    else
        error_exit "Failed to backup database. Check credentials and connection."
    fi
}

backup_application() {
    log "Starting application files backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/app_$TIMESTAMP.tar.gz"
    
    if tar -czf "$BACKUP_FILE" \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=.git \
        --exclude=.env.local \
        --exclude=.backups \
        . 2>/dev/null; then
        
        success "Application backup completed: $BACKUP_FILE"
        
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log "Backup size: $SIZE"
        
        return 0
    else
        error_exit "Failed to backup application files."
    fi
}

backup_all() {
    log "Starting full system backup..."
    backup_database
    backup_application
    success "Full system backup completed!"
}

cleanup_old_backups() {
    log "Cleaning old backups (retention: $RETENTION_DAYS days)..."
    
    DELETED_COUNT=$(find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
    
    if [ "$DELETED_COUNT" -gt 0 ]; then
        log "Deleted $DELETED_COUNT old backup files"
    fi
}

# =====================================================
# RESTORE FUNCTIONS
# =====================================================

restore_database() {
    if [ -z "$1" ]; then
        # List available backups
        echo "Available database backups:"
        ls -lh "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | awk '{print $9, "(" $5 ")"}'
        
        read -p "Enter backup filename: " BACKUP_FILE
    else
        BACKUP_FILE="$1"
    fi
    
    # Handle .gz files
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        TEMP_FILE="${BACKUP_FILE%.gz}"
        gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
        RESTORE_FILE="$TEMP_FILE"
    else
        RESTORE_FILE="$BACKUP_FILE"
    fi
    
    if [ ! -f "$RESTORE_FILE" ]; then
        error_exit "Backup file not found: $RESTORE_FILE"
    fi
    
    # Confirm restoration
    read -p "This will overwrite the current database. Continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        warning "Restoration cancelled"
        return 1
    fi
    
    log "Starting database restoration from $RESTORE_FILE..."
    
    if [ -z "$DATABASE_PASSWORD" ]; then
        read -sp "Enter MySQL password: " MYSQL_PASS
        echo
    else
        MYSQL_PASS="$DATABASE_PASSWORD"
    fi
    
    if mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" \
             -u "$MYSQL_USER" -p"$MYSQL_PASS" \
             "$MYSQL_DB" < "$RESTORE_FILE" 2>/dev/null; then
        
        success "Database restoration completed!"
        
        # Verify restoration
        TABLE_COUNT=$(mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" \
                            -u "$MYSQL_USER" -p"$MYSQL_PASS" \
                            -e "USE $MYSQL_DB; SHOW TABLES;" | wc -l)
        
        log "Database now contains $((TABLE_COUNT - 1)) tables"
        
        return 0
    else
        error_exit "Failed to restore database."
    fi
}

restore_application() {
    if [ -z "$1" ]; then
        # List available backups
        echo "Available application backups:"
        ls -lh "$BACKUP_DIR"/app_*.tar.gz 2>/dev/null | awk '{print $9, "(" $5 ")"}'
        
        read -p "Enter backup filename: " BACKUP_FILE
    else
        BACKUP_FILE="$1"
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        error_exit "Backup file not found: $BACKUP_FILE"
    fi
    
    # Confirm restoration
    read -p "This will overwrite current application files. Continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        warning "Restoration cancelled"
        return 1
    fi
    
    log "Starting application restoration from $BACKUP_FILE..."
    
    # Create backup of current state
    CURRENT_BACKUP="$BACKUP_DIR/app_pre_restore_$(date +%Y%m%d_%H%M%S).tar.gz"
    tar -czf "$CURRENT_BACKUP" \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=.git \
        --exclude=.backups \
        . 2>/dev/null
    log "Created safety backup: $CURRENT_BACKUP"
    
    # Restore files
    if tar -xzf "$BACKUP_FILE" 2>/dev/null; then
        success "Application restoration completed!"
        log "Reinstall dependencies with: npm install"
        return 0
    else
        error_exit "Failed to restore application files."
    fi
}

# =====================================================
# VERIFICATION FUNCTIONS
# =====================================================

verify_backup() {
    if [ -z "$1" ]; then
        read -p "Enter backup filename to verify: " BACKUP_FILE
    else
        BACKUP_FILE="$1"
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        error_exit "File not found: $BACKUP_FILE"
    fi
    
    log "Verifying backup integrity..."
    
    if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
        if tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
            SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
            success "Backup is valid (Size: $SIZE)"
            return 0
        else
            error_exit "Backup file is corrupted"
        fi
    elif [[ "$BACKUP_FILE" == *.sql.gz ]]; then
        if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
            SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
            success "Backup is valid (Size: $SIZE)"
            return 0
        else
            error_exit "Backup file is corrupted"
        fi
    else
        warning "Unknown backup file format"
        return 1
    fi
}

verify_connection() {
    log "Verifying database connection..."
    
    if [ -z "$DATABASE_PASSWORD" ]; then
        read -sp "Enter MySQL password: " MYSQL_PASS
        echo
    else
        MYSQL_PASS="$DATABASE_PASSWORD"
    fi
    
    if mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" \
             -u "$MYSQL_USER" -p"$MYSQL_PASS" \
             -e "SELECT 1" > /dev/null 2>&1; then
        success "Database connection verified"
        return 0
    else
        error_exit "Cannot connect to database"
    fi
}

# =====================================================
# LIST FUNCTIONS
# =====================================================

list_backups() {
    echo ""
    echo "Database Backups:"
    ls -lh "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | awk '{printf "  %s (%s)\n", $9, $5}'
    
    echo ""
    echo "Application Backups:"
    ls -lh "$BACKUP_DIR"/app_*.tar.gz 2>/dev/null | awk '{printf "  %s (%s)\n", $9, $5}'
    
    echo ""
    echo "Total backup size:"
    du -sh "$BACKUP_DIR" 2>/dev/null | awk '{printf "  %s\n", $1}'
}

# =====================================================
# USAGE
# =====================================================

show_usage() {
    cat << EOF
Rhulani Tuck Shop - Backup & Recovery Script

USAGE:
    $0 <command> [options]

COMMANDS:
    backup
        backup db              - Backup database only
        backup app             - Backup application files only
        backup all             - Backup database and application

    restore
        restore db [file]      - Restore database from backup
        restore app [file]     - Restore application files from backup

    verify
        verify <file>          - Verify backup integrity
        verify connection      - Verify database connection

    list                       - List all available backups
    cleanup                    - Clean old backups
    help                       - Show this help message

EXAMPLES:
    $0 backup db
    $0 backup all
    $0 restore db db_20260424_143000.sql.gz
    $0 verify db_20260424_143000.sql.gz
    $0 list
    $0 cleanup

ENVIRONMENT VARIABLES:
    DATABASE_HOST              - MySQL host (default: localhost)
    DATABASE_PORT              - MySQL port (default: 3306)
    DATABASE_USER              - MySQL user (default: root)
    DATABASE_NAME              - Database name (default: rhulanituckshop)
    DATABASE_PASSWORD          - MySQL password (prompted if not set)
    BACKUP_DIR                 - Backup directory (default: .backups)
    RETENTION_DAYS             - Backup retention days (default: 30)

EOF
}

# =====================================================
# MAIN
# =====================================================

main() {
    case "${1:-help}" in
        backup)
            case "${2:-all}" in
                db)
                    backup_database
                    ;;
                app)
                    backup_application
                    ;;
                all)
                    backup_all
                    ;;
                *)
                    error_exit "Invalid backup option: $2"
                    ;;
            esac
            ;;
        restore)
            case "${2:-help}" in
                db)
                    restore_database "$3"
                    ;;
                app)
                    restore_application "$3"
                    ;;
                *)
                    error_exit "Invalid restore option: $2"
                    ;;
            esac
            ;;
        verify)
            case "${2:-help}" in
                connection)
                    verify_connection
                    ;;
                *)
                    verify_backup "$2"
                    ;;
            esac
            ;;
        list)
            list_backups
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        help)
            show_usage
            ;;
        *)
            error_exit "Unknown command: $1"
            ;;
    esac
}

# Run main function
main "$@"
