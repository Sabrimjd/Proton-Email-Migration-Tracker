import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'migration.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize database with new schema matching analyze-emails.ts
db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    email_address TEXT NOT NULL UNIQUE,
    category TEXT DEFAULT 'other',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    emails_received INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    last_email_date TEXT,
    first_email_date TEXT,
    notes TEXT,
    old_email TEXT,
    new_email TEXT,
    migration_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    subject TEXT,
    sender TEXT,
    sender_email TEXT,
    recipient_email TEXT,
    received_at TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS scan_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_at TEXT DEFAULT CURRENT_TIMESTAMP,
    emails_scanned INTEGER DEFAULT 0,
    services_found INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed'
  );

  CREATE TABLE IF NOT EXISTS migration_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (service_id) REFERENCES services(id)
  );

  CREATE INDEX IF NOT EXISTS idx_services_domain ON services(domain);
  CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
  CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
  CREATE INDEX IF NOT EXISTS idx_services_priority ON services(priority);
  CREATE INDEX IF NOT EXISTS idx_services_email_address ON services(email_address);
  CREATE INDEX IF NOT EXISTS idx_emails_service_id ON emails(service_id);
  CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at);
`);

export default db;
