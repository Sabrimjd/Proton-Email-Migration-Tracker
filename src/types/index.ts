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
  last_email_date: string;
  first_email_date: string;
  notes: string;
  old_email: string | null;
  new_email: string | null;
  migration_date: string | null;
}

export interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  migrated: number;
  skipped: number;
  totalEmails: number;
  highPriority: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface CategoryProgressData {
  name: string;
  migrated: number;
  pending: number;
}

export interface EmailVolumeData {
  month: string;
  emails: number;
  services: number;
}

export interface ChartData {
  categoryDistribution: ChartDataPoint[];
  categoryProgress: CategoryProgressData[];
  emailVolumeOverTime: EmailVolumeData[];
  statusDistribution: ChartDataPoint[];
}

export interface DebugInfo {
  timestamp: string;
  database: {
    path: string;
    sizeBytes: number;
    sizeFormatted: string;
    lastModified: string;
    servicesCount: number;
    emailsCount: number;
    domainsCount: number;
  };
  scanHistory: Array<{
    id: number;
    run_at: string;
    emails_scanned: number;
    services_found: number;
    status: string;
  }>;
  distribution: {
    status: Array<{ status: string; count: number }>;
    category: Array<{ category: string; count: number }>;
    priority: Array<{ priority: string; count: number }>;
  };
  recentMigrated: Array<{
    email_address: string;
    name: string;
    old_email: string;
    new_email: string;
    migration_date: string;
  }>;
  topSenders: Array<{
    sender_email: string;
    count: number;
  }>;
  config: any;
}

export interface CategoryDetail {
  name: string;
  count: number;
  pending: number;
  migrated: number;
  inProgress: number;
  skipped: number;
  totalEmails: number;
  services: Service[];
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}