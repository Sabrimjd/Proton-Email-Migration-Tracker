# Email Migration Tracker - Setup Guide

## Quick Start

1. **Copy the example config:**
   ```bash
   cp config.yml.example config.yml
   ```

2. **Edit `config.yml` with your details:**
   - `old_address`: Your old email (Gmail)
   - `new_domains`: Your new email domains
   - `protonmail.imap_user`: Your ProtonMail email
   - `protonmail.imap_password`: Your Proton Bridge password

3. **Start Proton Bridge:**
   ```bash
   sudo systemctl start proton-bridge.service
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Initialize the database:**
   ```bash
   npm run analyze-emails
   ```

6. **Run the development server:**
   ```bash
   npm run dev
   ```

7. **Open your browser:**
   http://localhost:3000

## Docker Deployment

1. **Edit `config.yml`:**
   ```bash
   cp config.yml.example config.yml
   # Edit config.yml with your credentials
   ```

2. **Start the container:**
   ```bash
   docker compose up -d
   ```

3. **View logs:**
   ```bash
   docker logs email-migration-tracker
   ```

## Features

- **Service Discovery:** Automatically detects services from your email contacts
- **Smart Categorization:** 13 pre-configured categories (social, financial, shopping, etc.)
- **Priority Management:** High-priority services flagged automatically
- **Migration Tracking:** Track progress (not started → in progress → completed)
- **History Tracking:** See migration history for each service
- **Email Popup:** View last 10 emails for each service
- **Re-categorization:** Change categories on the fly

## Security Notes

- **Never commit `config.yml`** - it contains sensitive credentials
- **Use `config.yml.example` as a template** - it's in `.gitignore`
- **Proton Bridge required** - For IMAP access to ProtonMail
- **Database stored locally** - SQLite database in `data/migration.db`

## Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **SQLite** - Database (better-sqlite3)
- **Docker** - Container deployment

## License

Private - Personal use only
