# Email Migration Tracker

Track your **Gmail → ProtonMail** migration progress with a clean dashboard and automatic service detection.

![Dashboard Preview](screenshots/01-overview.png)

> Mock dataset shown in screenshots: **120 services**, **20 migrated**.

## Screenshots

More screenshots and full gallery: [`screenshots/README.md`](screenshots/README.md)

## What this app does

- Scans your Proton inbox via IMAP (Proton Bridge)
- Detects services that still use your old Gmail address
- Auto-marks services as migrated when emails start arriving on your new domains
- Shows progress, categories, priority, and recent activity in a dashboard
- Runs automatic scans with the built-in scheduler

## Features

### Dashboard Tabs

- **Overview**: Migration progress, stats, and category distribution charts
- **Services**: Searchable list with bulk actions, filtering, and service details
- **Config**: Visual configuration manager for all app settings
- **Database**: Database health monitoring, backups, and management
- **Debug**: System status and scheduler monitoring

### First-Time Setup Wizard

The app guides you through a **two-step onboarding flow** on first launch:

**Step 1: Identity**
- Enter your old email address (the one you're migrating from)
- Add your new domains (where migrated services should send emails)
- Optionally configure personal domains to exclude from tracking

**Step 2: Connectivity**
- Configure IMAP connection settings
- Test your IMAP connection with one click
- Set up automatic scanning schedule

The wizard saves everything to `config.local.yml`, preserving your original `config.yml`.

**Re-run Setup**: Click "Setup Wizard" in the Config tab anytime to update your configuration through the guided flow.

### Configuration Manager

The Config tab provides a comprehensive UI for managing settings without editing YAML files:

- Email addresses (old Gmail, new domains, personal domains)
- IMAP connection settings with **real connection test**
- Scheduler configuration (enable/disable, cron schedule)
- Category customization
- Priority domains
- Dashboard appearance (title, subtitle, accent color)

All changes are saved to `config.local.yml`, preserving your original `config.yml`.

### Database Manager

Monitor and manage your SQLite database:

- Health checks and integrity verification
- Table statistics (services, emails, scan runs)
- Backup creation and restoration
- Database optimization (VACUUM)
- Seed data for testing
- Safe data clearing with confirmation

## Prerequisites

- Docker + Docker Compose (recommended)
- Proton Mail Bridge running locally
- Proton account with IMAP enabled
- For Gmail migration, configure Proton Easy Switch first: <https://proton.me/fr/easyswitch>

## Quick Start (Docker - recommended)

```bash
git clone https://github.com/Sabrimjd/email-migration-tracker.git
cd email-migration-tracker
cp config.yml.example config.yml
# edit config.yml
docker compose up -d --build
```

Open: <http://localhost:3200>

## Local development (npm)

```bash
npm install
npm run dev
```

Open: <http://localhost:3000>

## Minimal config guide

```yaml
emails:
  old_address: "yourname@gmail.com"   # Old Gmail address

  # New mailbox domains used as migration targets
  new_domains:
    - "proton.me"
    - "protonmail.com"
    - "pm.me"
    - "protonmail.ch"
    - "yourdomain.com"                # optional custom domain

  # Domains that are yours and should be excluded as service senders
  # (avoid putting all new_domains here unless they are truly your sender domains)
  personal_domains:
    - "gmail.com"
    - "yourdomain.com"                # optional

protonmail:
  imap_host: "127.0.0.1"
  imap_port: 1143
  imap_user: "you@proton.me"
  imap_password: "YOUR_BRIDGE_PASSWORD"
  email_scan_limit: 5000                # configurable: number of recent emails to fetch per scan
```

## Running scans

- Automatic: built-in scheduler runs based on `scheduler.cron` in `config.yml`
- Manual (optional):

```bash
npm run analyze-emails
```

## Useful commands

```bash
# Docker logs
docker compose logs -f

# Restart stack
docker compose restart

# Stop stack
docker compose down
```

## Troubleshooting (quick)

- **IMAP connection errors**: 
  - Verify Proton Bridge is running (`proton-bridge` or via system tray)
  - Use the **Test Connection** button in Config → IMAP Settings or Setup Wizard
  - Ensure you're using the Bridge password (shown in Proton Bridge app), not your Proton account password
- **Setup wizard not appearing**: The wizard only shows on first run if configuration is incomplete. Access it anytime via **Config → Setup Wizard**
- **No data**: run a manual scan once (`npm run analyze-emails`) or click "Scan Emails" in the dashboard
- **Port conflict**: change mapped port in `docker-compose.yml` (e.g. `3201:3000`)

## License

MIT
