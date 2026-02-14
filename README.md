# Email Migration Tracker

A beautiful dashboard to track your email migration progress. Automatically discovers services using your old email address and helps you manage the migration to your new email.

![Dashboard Preview](https://via.placeholder.com/800x400/0a0b0f/00d4aa?text=Email+Migration+Tracker)

## Features

- **Automatic Service Discovery** - Scans your ProtonMail to find all services using your old email
- **Smart Migration Detection** - Auto-detects services you've already migrated based on email patterns
- **Category Management** - Auto-categorizes services (financial, social, work, shopping, etc.)
- **Priority Tracking** - Focus on high-priority services like banks and government
- **Email Metadata** - View recent emails from each service with timestamps
- **Progress Visualization** - Charts and stats to track your migration progress
- **Daily Automation** - Optional cron job for automatic daily scans
- **Fully Configurable** - Customize via `config.yml` for your setup

## Quick Start

### Prerequisites

- Node.js 18+
- ProtonMail account with [mcporter](https://github.com/yourusername/mcporter) configured
- Proton Bridge running (for email access)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/email-migration-tracker.git
cd email-migration-tracker
npm install
```

### 2. Configure

Copy the example config and customize it:

```bash
cp config.yml config.local.yml
```

Edit `config.local.yml` with your details:

```yaml
emails:
  old_address: "yourname@gmail.com"           # Your old email
  new_domains:                                # Your new email domains
    - "yourdomain.com"
  personal_domains:                           # Your own domains (excluded from tracking)
    - "gmail.com"
    - "protonmail.com"
    - "yourdomain.com"

protonmail:
  config_path: "~/.config/mcporter.json"     # mcporter config location
  email_scan_limit: 500                       # How many emails to scan

database:
  path: "data/migration.db"                   # SQLite database location

server:
  port: 3000                                  # Dashboard port

dashboard:
  title: "Email Migration Tracker"
  subtitle: "Track your email migration progress"
  theme: "dark"
  accent_color: "#00d4aa"
```

### 3. Run Email Analysis

```bash
npm run analyze-emails
```

This will:
- Connect to ProtonMail via mcporter
- Scan your contacts and recent emails
- Detect services using your old email
- Auto-detect already-migrated services (those sending to your new domains)
- Populate the SQLite database

### 4. Start the Dashboard

```bash
npm run dev
```

Visit http://localhost:3000

## Configuration Reference

### Email Settings

| Setting | Description |
|---------|-------------|
| `emails.old_address` | The email address you're migrating FROM |
| `emails.new_domains` | Domains you've migrated TO (used for auto-detection) |
| `emails.personal_domains` | Your own domains to exclude from tracking |

### ProtonMail Settings

| Setting | Description |
|---------|-------------|
| `protonmail.config_path` | Path to mcporter config file |
| `protonmail.email_scan_limit` | Number of recent emails to analyze |

### Categories

Customize service categories with keywords:

```yaml
categories:
  financial:
    keywords:
      - paypal
      - bank
      - stripe
    color: "#ef4444"      # Red
    icon: "DollarSign"
    priority: high        # Always high priority
```

Available icons: `DollarSign`, `Users`, `ShoppingBag`, `Briefcase`, `Building`, `Heart`, `Plane`, `Gamepad2`, `GraduationCap`, `Utensils`, `Code`, `Zap`, `Newspaper`

### Priority Domains

Services from these domains will always be marked as high priority:

```yaml
priority:
  high_domains:
    - paypal
    - bank
    - gov
```

## Usage

### Migration Workflow

1. **Review Services** - Browse all discovered services in the dashboard
2. **Check Categories** - Services are auto-categorized; adjust as needed
3. **Set Priorities** - High-priority items (financial, government) are flagged
4. **Migrate** - Click a service to update your email with them
5. **Mark Complete** - Update status to "Migrated" or "In Progress"
6. **Track Progress** - Watch your migration percentage grow!

### Smart Migration Detection

The tracker automatically detects services you've already migrated:

- If a service starts sending emails to your `new_domains`, it's auto-marked as "Migrated"
- The migration date is recorded automatically
- No manual updates needed for already-migrated services

### Viewing Email Details

Click on any service to see:
- Last 10 emails received
- Email subjects and senders
- Timestamps (with relative time like "2 hours ago")
- Read/unread status

### Daily Automation

Set up automatic daily scans with cron:

```bash
# Edit crontab
crontab -e

# Add this line (runs at 6 AM daily)
0 6 * * * /home/you/email-migration-tracker/scripts/daily-analyze.sh
```

Logs are saved to `logs/analyze-YYYY-MM-DD.log`.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/services` | GET | List all services with stats |
| `/api/services/[id]` | PATCH | Update service status/category/priority |
| `/api/services/[id]/emails` | GET | Get recent emails for a service |
| `/api/stats` | GET | Get migration statistics |
| `/api/history` | GET | View scan history |
| `/api/categories` | GET | Get all categories |
| `/api/recategorize` | POST | Recategorize all services |

## Tech Stack

- **Frontend:** Next.js 16 + React 19 + TypeScript
- **Styling:** Tailwind CSS 4
- **Charts:** Recharts
- **Database:** SQLite (better-sqlite3)
- **UI Components:** shadcn/ui style
- **Configuration:** YAML

## Project Structure

```
email-migration-tracker/
├── config.yml              # Default configuration (commit this)
├── config.local.yml        # Your local config (gitignored)
├── scripts/
│   ├── analyze-emails.ts   # Email scanning script
│   └── daily-analyze.sh    # Cron script for daily runs
├── src/
│   ├── app/                # Next.js app routes
│   ├── components/         # React components
│   └── lib/                # Utilities and config loader
├── data/                   # SQLite database (gitignored)
└── logs/                   # Scan logs (gitignored)
```

## Customization

### Adding New Categories

Edit `config.local.yml`:

```yaml
categories:
  gaming:
    keywords:
      - steam
      - epic
      - playstation
    color: "#9333ea"
    icon: "Gamepad2"
```

### Changing Theme Colors

Edit `src/app/globals.css` or update your config:

```yaml
dashboard:
  accent_color: "#ff6b6b"  # Change accent color
```

## Troubleshooting

### "No config file found"

Make sure you've copied and edited the config:
```bash
cp config.yml config.local.yml
# Edit config.local.yml with your details
```

### "Stored 0 email records"

Check that:
1. mcporter is installed and configured
2. Proton Bridge is running
3. The config path is correct

Test manually:
```bash
mcporter call protonmail.get_emails limit=10 --config ~/.config/mcporter.json
```

### Database locked errors

Only one process can write to SQLite at a time. Make sure:
- The dashboard isn't running during `analyze-emails`
- Or wait a few seconds between operations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use and modify for your own migration tracking needs.
