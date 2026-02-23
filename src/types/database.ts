export interface Service {
  id: number;
  name: string;
  domain: string;
  email_address: string;
  category: string;
  priority: string;
  status: string;
  emails_received: number;
  emails_sent: number;
  last_email_date: string | null;
  first_email_date: string | null;
  notes: string | null;
  old_email: string | null;
  new_email: string | null;
  migration_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Email {
  id: number;
  service_id: number;
  subject: string;
  sender: string;
  sender_email: string;
  recipient_email: string;
  received_at: string;
  is_read: number;
  created_at: string;
}

export interface ScanRun {
  id: number;
  run_at: string;
  emails_scanned: number;
  services_found: number;
  status: string;
}

export interface MigrationHistory {
  id: number;
  service_id: number;
  old_status: string;
  new_status: string;
  changed_at: string;
  notes: string | null;
}

export interface DatabaseStats {
  path: string;
  sizeBytes: number;
  sizeFormatted: string;
  created: Date;
  modified: Date;
}

export interface IntegrityCheck {
  status: string;
  passed: boolean;
  error?: string;
}

export interface TableStats {
  name: string;
  rowCount: number;
}

export interface DatabaseIndex {
  name: string;
  tbl_name: string;
}

export interface BackupFile {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  created: Date;
  modified: Date;
}