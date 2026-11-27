#!/usr/bin/env bash
# ==============================================================================
# Cloudflare D1 Disaster Recovery, Backup & Replica Management Utility
# ==============================================================================
# Supported Commands:
#   ./scripts/d1-backup-restore.sh backup [database_name]
#   ./scripts/d1-backup-restore.sh restore <sql_file_path> [database_name]
#   ./scripts/d1-backup-restore.sh timetravel <rfc3339_timestamp> [database_name]
#   ./scripts/d1-backup-restore.sh replica-create <new_replica_name> [source_db_name]
#   ./scripts/d1-backup-restore.sh info [database_name]
# ==============================================================================

set -euo pipefail

DEFAULT_DB="ieeeitsvit"
BACKUP_DIR="./backups"

mkdir -p "$BACKUP_DIR"

CMD="${1:-help}"

case "$CMD" in
  backup)
    DB_NAME="${2:-$DEFAULT_DB}"
    TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
    OUT_FILE="$BACKUP_DIR/d1_${DB_NAME}_${TIMESTAMP}.sql"
    echo "Initiating full Cloudflare D1 backup for database: $DB_NAME"
    npx wrangler d1 export "$DB_NAME" --remote --output="$OUT_FILE"
    echo "Backup completed successfully: $OUT_FILE"
    ;;

  restore)
    if [ -z "${2:-}" ]; then
      echo "Error: Path to SQL restore file is required."
      echo "Usage: ./scripts/d1-backup-restore.sh restore <path_to_file.sql> [database_name]"
      exit 1
    fi
    RESTORE_FILE="$2"
    DB_NAME="${3:-$DEFAULT_DB}"
    if [ ! -f "$RESTORE_FILE" ]; then
      echo "Error: File $RESTORE_FILE does not exist."
      exit 1
    fi
    echo "Restoring database '$DB_NAME' from file: $RESTORE_FILE"
    echo "Warning: This will apply migrations/queries directly to $DB_NAME."
    npx wrangler d1 execute "$DB_NAME" --remote --file="$RESTORE_FILE"
    echo "Restore completed successfully."
    ;;

  timetravel)
    if [ -z "${2:-}" ]; then
      echo "Error: Timestamp is required for Point-In-Time-Recovery (RFC3339 format)."
      echo "Example: ./scripts/d1-backup-restore.sh timetravel 2026-11-28T00:00:00Z"
      exit 1
    fi
    TIMESTAMP="$2"
    DB_NAME="${3:-$DEFAULT_DB}"
    echo "Executing Point-In-Time-Recovery for '$DB_NAME' to timestamp: $TIMESTAMP"
    npx wrangler d1 time-travel restore "$DB_NAME" --timestamp="$TIMESTAMP"
    echo "Time Travel recovery completed."
    ;;

  replica-create)
    if [ -z "${2:-}" ]; then
      echo "Error: New replica database name is required."
      echo "Usage: ./scripts/d1-backup-restore.sh replica-create <new_replica_name> [source_db_name]"
      exit 1
    fi
    NEW_REPLICA="$2"
    SRC_DB="${3:-$DEFAULT_DB}"
    TEMP_DUMP="$BACKUP_DIR/temp_replica_seed_${NEW_REPLICA}.sql"
    echo "Creating parallel replica '$NEW_REPLICA' from source '$SRC_DB'..."
    npx wrangler d1 export "$SRC_DB" --remote --output="$TEMP_DUMP"
    echo "Provisioning new D1 database: $NEW_REPLICA"
    npx wrangler d1 create "$NEW_REPLICA"
    echo "Importing source snapshot into replica..."
    npx wrangler d1 execute "$NEW_REPLICA" --remote --file="$TEMP_DUMP"
    rm -f "$TEMP_DUMP"
    echo "Replica '$NEW_REPLICA' created and seeded successfully."
    ;;

  info)
    DB_NAME="${2:-$DEFAULT_DB}"
    echo "Fetching D1 database details and Time Travel bookmarks for: $DB_NAME"
    npx wrangler d1 time-travel info "$DB_NAME"
    ;;

  *)
    echo "Cloudflare D1 Disaster Recovery, Backup & Replica Manager"
    echo "Usage:"
    echo "  $0 backup [database_name]                - Create full remote SQL snapshot"
    echo "  $0 restore <file.sql> [database_name]    - Restore database from SQL snapshot"
    echo "  $0 timetravel <timestamp> [db_name]      - Point-in-time recovery (e.g. 2026-11-28T00:00:00Z)"
    echo "  $0 replica-create <new_db> [source_db]   - Clone and seed a parallel replica database"
    echo "  $0 info [database_name]                  - Show backup bookmarks and retention status"
    exit 0
    ;;
esac
