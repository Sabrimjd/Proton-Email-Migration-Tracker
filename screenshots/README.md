# Screenshots Gallery

Mock dataset shown in these screenshots: **120 services**, **20 migrated**.

## 01 - Overview
![Overview](01-overview.png)

Main dashboard showing migration progress, stats, and category distribution.

## 02 - Categories
![Categories](02-categories.png)

Category cards with progress bars showing migration status per category.

## 03 - Charts
![Charts](03-charts.png)

Visual charts for status distribution, category breakdown, and email volume over time.

## 04 - Services List
![Services List](04-services-list.png)

Searchable, filterable list of all services with bulk actions support.

## 05 - Service Modal
![Service Modal](05-service-modal.png)

Detailed view of a single service with email history and notes.

## 06 - Recently Migrated
![Recently Migrated](06-recently-migrated.png)

Quick view of recently migrated services.

---

## New: Configuration Manager

The Config tab provides a comprehensive UI for managing application settings:

### Features:
- **Email Addresses**: Configure old Gmail address and new migration target domains
- **IMAP Settings**: ProtonMail Bridge connection settings with password visibility toggle
- **Scheduler**: Enable/disable automatic scans and configure cron schedule
- **Categories**: View and customize category keywords and colors
- **Priority Domains**: Manage domains that always get high priority
- **Dashboard**: Customize title, subtitle, and accent color

### Actions:
- Export configuration as JSON
- Create manual backups
- Reset to defaults (with confirmation)

### Safety:
- All changes go to `config.local.yml` (preserves original `config.yml`)
- Automatic backups before each change
- Validation for email addresses and cron schedules

---

## New: Database Manager

The Database tab provides tools for monitoring and managing the SQLite database:

### Health Monitoring:
- **Integrity Check**: SQLite PRAGMA integrity_check status
- **File Stats**: Size, created/modified timestamps
- **Page Count**: Database page usage
- **Table Stats**: Row counts for all tables (services, emails, scan_runs, migration_history)

### Database Actions:
- **Backup**: Create timestamped backup files
- **Download**: Export database file as binary download
- **Vacuum**: Optimize database and reclaim space
- **Seed Data**: Populate with mock data for testing
- **Clear Data**: Delete records with table selection and confirmation

### Backup Management:
- View and restore from backup files
- Automatic pre-restore backup creation
- Keeps last 20 backups

### Safety:
- Clear data requires typing "CONFIRM"
- Table selection for granular clearing
- Automatic backup before destructive operations
