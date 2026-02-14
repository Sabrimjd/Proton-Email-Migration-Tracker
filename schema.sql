-- Migration Tracker Database Schema

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  email_address TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  emails_received INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  last_email_date TEXT,
  first_email_date TEXT,
  notes TEXT,
  migration_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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

CREATE TABLE IF NOT EXISTS scan_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at TEXT DEFAULT CURRENT_TIMESTAMP,
  emails_scanned INTEGER DEFAULT 0,
  services_found INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_domain ON services(domain);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_priority ON services(priority);
