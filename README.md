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

- **IMAP errors**: verify Proton Bridge is running and credentials are from Bridge (not Proton web login password)
- **No data**: run a manual scan once (`npm run analyze-emails`) and check logs
- **Port conflict**: change mapped port in `docker-compose.yml` (e.g. `3201:3000`)

## License

MIT
