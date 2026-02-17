import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

// GET /api/database - Get database health and info
export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'migration.db');
    const backupsDir = path.join(process.cwd(), 'data', 'backups');
    
    // Database file info
    let dbStats = null;
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      dbStats = {
        path: dbPath,
        sizeBytes: stats.size,
        sizeFormatted: formatBytes(stats.size),
        created: stats.birthtime,
        modified: stats.mtime,
      };
    }
    
    // Database integrity check
    let integrityCheck = null;
    try {
      const integrity = db.pragma('integrity_check') as any[];
      integrityCheck = {
        status: integrity[0]?.integrity_check || 'unknown',
        passed: integrity[0]?.integrity_check === 'ok',
      };
    } catch (error) {
      integrityCheck = {
        status: 'error',
        passed: false,
        error: String(error),
      };
    }
    
    // Database page count and size
    const pageCount = db.pragma('page_count') as number;
    const pageSize = db.pragma('page_size') as number;
    
    // Table stats
    const tables = [
      'services',
      'emails',
      'scan_runs',
      'migration_history',
    ];
    
    const tableStats = tables.map(table => {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
        return { name: table, rowCount: count.count };
      } catch {
        return { name: table, rowCount: 0 };
      }
    });
    
    // Indexes
    const indexes = db.prepare(`
      SELECT name, tbl_name 
      FROM sqlite_master 
      WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
    `).all() as any[];
    
    // Available backups
    const backups: any[] = [];
    if (fs.existsSync(backupsDir)) {
      const files = fs.readdirSync(backupsDir)
        .filter(f => f.endsWith('.db'))
        .map(f => {
          const filePath = path.join(backupsDir, f);
          const stats = fs.statSync(filePath);
          return {
            filename: f,
            sizeBytes: stats.size,
            sizeFormatted: formatBytes(stats.size),
            created: stats.birthtime,
            modified: stats.mtime,
          };
        })
        .sort((a, b) => b.modified.getTime() - a.modified.getTime());
      backups.push(...files);
    }
    
    return NextResponse.json({
      success: true,
      database: {
        stats: dbStats,
        integrity: integrityCheck,
        pageCount,
        pageSize,
        totalPages: pageCount,
        totalSize: pageCount * pageSize,
        totalSizeFormatted: formatBytes(pageCount * pageSize),
      },
      tables: tableStats,
      indexes,
      backups: {
        count: backups.length,
        recent: backups.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Error getting database info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get database info' },
      { status: 500 }
    );
  }
}

// POST /api/database - Perform database actions
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, data } = body;
    
    switch (action) {
      case 'backup':
        return await createBackup();
      
      case 'restore':
        return await restoreBackup(data?.filename);
      
      case 'clear':
        return await clearDatabase(data?.tables, data?.confirm);
      
      case 'seed':
        return await seedDatabase();
      
      case 'vacuum':
        return await vacuumDatabase();
      
      case 'download':
        return await downloadDatabase();
      
      case 'switch-mock':
        return await switchToMockDatabase();
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in database action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform database action' },
      { status: 500 }
    );
  }
}

// Create a database backup
async function createBackup(): Promise<NextResponse> {
  const dbPath = path.join(process.cwd(), 'data', 'migration.db');
  const backupsDir = path.join(process.cwd(), 'data', 'backups');
  
  if (!fs.existsSync(dbPath)) {
    return NextResponse.json(
      { success: false, error: 'Database file not found' },
      { status: 404 }
    );
  }
  
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `backup-${timestamp}.db`;
  const backupPath = path.join(backupsDir, backupFilename);
  
  // Use SQLite's backup API for consistency
  const backupDb = require('better-sqlite3')(backupPath);
  backupDb.exec(`ATTACH DATABASE '${dbPath}' AS source`);
  backupDb.exec(`SELECT sqlcipher_export('main', 'source')`);
  backupDb.exec(`DETACH DATABASE source`);
  backupDb.close();
  
  // If that fails, fall back to file copy
  if (!fs.existsSync(backupPath) || fs.statSync(backupPath).size === 0) {
    fs.copyFileSync(dbPath, backupPath);
  }
  
  // Clean old backups (keep last 20)
  const files = fs.readdirSync(backupsDir)
    .filter(f => f.endsWith('.db'))
    .sort();
  
  while (files.length > 20) {
    const toRemove = files.shift()!;
    fs.unlinkSync(path.join(backupsDir, toRemove));
  }
  
  const stats = fs.statSync(backupPath);
  
  return NextResponse.json({
    success: true,
    message: 'Database backup created successfully',
    backup: {
      filename: backupFilename,
      sizeBytes: stats.size,
      sizeFormatted: formatBytes(stats.size),
    },
  });
}

// Restore database from backup
async function restoreBackup(filename?: string): Promise<NextResponse> {
  if (!filename) {
    return NextResponse.json(
      { success: false, error: 'Backup filename is required' },
      { status: 400 }
    );
  }
  
  const dbPath = path.join(process.cwd(), 'data', 'migration.db');
  const backupsDir = path.join(process.cwd(), 'data', 'backups');
  const backupPath = path.join(backupsDir, filename);
  
  if (!fs.existsSync(backupPath)) {
    return NextResponse.json(
      { success: false, error: 'Backup file not found' },
      { status: 404 }
    );
  }
  
  // Create backup of current database before restore
  if (fs.existsSync(dbPath)) {
    const preRestoreBackup = `pre-restore-${Date.now()}.db`;
    fs.copyFileSync(dbPath, path.join(backupsDir, preRestoreBackup));
  }
  
  // Restore by copying backup file
  fs.copyFileSync(backupPath, dbPath);
  
  return NextResponse.json({
    success: true,
    message: `Database restored from ${filename}`,
  });
}

// Clear database tables
async function clearDatabase(tables?: string[], confirm?: string): Promise<NextResponse> {
  if (confirm !== 'CONFIRM') {
    return NextResponse.json(
      { success: false, error: 'Confirmation required. Send { confirm: "CONFIRM" }' },
      { status: 400 }
    );
  }
  
  const validTables = ['services', 'emails', 'scan_runs', 'migration_history'];
  const tablesToClear = tables && tables.length > 0 
    ? tables.filter(t => validTables.includes(t))
    : validTables;
  
  if (tablesToClear.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No valid tables specified' },
      { status: 400 }
    );
  }
  
  // Create backup before clearing
  await createBackup();
  
  const results: any = {};
  
  for (const table of tablesToClear) {
    try {
      const result = db.prepare(`DELETE FROM ${table}`).run();
      results[table] = { cleared: true, rowsAffected: result.changes };
    } catch (error) {
      results[table] = { cleared: false, error: String(error) };
    }
  }
  
  return NextResponse.json({
    success: true,
    message: 'Database tables cleared',
    results,
  });
}

// Seed database with mock data
async function seedDatabase(): Promise<NextResponse> {
  const mockServices = [
    { name: 'Amazon', domain: 'amazon.com', email_address: 'no-reply@amazon.com', category: 'shopping', priority: 'medium', status: 'pending', emails_received: 45 },
    { name: 'Netflix', domain: 'netflix.com', email_address: 'info@netflix.com', category: 'entertainment', priority: 'low', status: 'migrated', emails_received: 23 },
    { name: 'LinkedIn', domain: 'linkedin.com', email_address: 'notifications@linkedin.com', category: 'social', priority: 'medium', status: 'in_progress', emails_received: 156 },
    { name: 'PayPal', domain: 'paypal.com', email_address: 'service@paypal.com', category: 'financial', priority: 'high', status: 'pending', emails_received: 12 },
    { name: 'GitHub', domain: 'github.com', email_address: 'noreply@github.com', category: 'technology', priority: 'high', status: 'migrated', emails_received: 89 },
    { name: 'Spotify', domain: 'spotify.com', email_address: 'no-reply@spotify.com', category: 'entertainment', priority: 'low', status: 'pending', emails_received: 34 },
    { name: 'Uber', domain: 'uber.com', email_address: 'no-reply@uber.com', category: 'travel', priority: 'low', status: 'pending', emails_received: 8 },
    { name: 'Bank of America', domain: 'bofa.com', email_address: 'alerts@bofa.com', category: 'financial', priority: 'high', status: 'migrated', emails_received: 5 },
    { name: 'Coursera', domain: 'coursera.org', email_address: 'no-reply@coursera.org', category: 'education', priority: 'medium', status: 'pending', emails_received: 67 },
    { name: 'Airbnb', domain: 'airbnb.com', email_address: 'automated@airbnb.com', category: 'travel', priority: 'medium', status: 'in_progress', emails_received: 21 },
    { name: 'Twitter', domain: 'twitter.com', email_address: 'notify@twitter.com', category: 'social', priority: 'low', status: 'skipped', emails_received: 234 },
    { name: 'Slack', domain: 'slack.com', email_address: 'feedback@slack.com', category: 'work', priority: 'high', status: 'migrated', emails_received: 145 },
    { name: 'Dropbox', domain: 'dropbox.com', email_address: 'no-reply@dropbox.com', category: 'technology', priority: 'medium', status: 'pending', emails_received: 18 },
    { name: 'Medium', domain: 'medium.com', email_address: 'noreply@medium.com', category: 'newsletters', priority: 'low', status: 'pending', emails_received: 56 },
    { name: 'Adobe', domain: 'adobe.com', email_address: 'mail@adobe.com', category: 'technology', priority: 'medium', status: 'in_progress', emails_received: 9 },
  ];
  
  const insert = db.prepare(`
    INSERT OR IGNORE INTO services 
    (name, domain, email_address, category, priority, status, emails_received, last_email_date, first_email_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || (abs(random()) % 30) || ' days'), datetime('now', '-' || (abs(random()) % 365) || ' days'))
  `);
  
  const results: any[] = [];
  
  for (const service of mockServices) {
    try {
      insert.run(
        service.name,
        service.domain,
        service.email_address,
        service.category,
        service.priority,
        service.status,
        service.emails_received
      );
      results.push({ name: service.name, inserted: true });
    } catch (error) {
      results.push({ name: service.name, inserted: false, error: String(error) });
    }
  }
  
  // Add a scan run record
  db.prepare(`
    INSERT INTO scan_runs (run_at, emails_scanned, services_found, status)
    VALUES (datetime('now'), ?, ?, 'completed')
  `).run(789, mockServices.length);
  
  return NextResponse.json({
    success: true,
    message: `Seeded ${mockServices.length} mock services`,
    results,
  });
}

// Vacuum/optimize database
async function vacuumDatabase(): Promise<NextResponse> {
  const beforePath = path.join(process.cwd(), 'data', 'migration.db');
  const beforeSize = fs.existsSync(beforePath) ? fs.statSync(beforePath).size : 0;
  
  try {
    db.exec('VACUUM');
    
    const afterSize = fs.statSync(beforePath).size;
    const savings = beforeSize - afterSize;
    
    return NextResponse.json({
      success: true,
      message: 'Database vacuumed successfully',
      stats: {
        beforeBytes: beforeSize,
        beforeFormatted: formatBytes(beforeSize),
        afterBytes: afterSize,
        afterFormatted: formatBytes(afterSize),
        savedBytes: savings,
        savedFormatted: formatBytes(savings),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to vacuum database' },
      { status: 500 }
    );
  }
}

// Download database file (as base64)
async function downloadDatabase(): Promise<NextResponse> {
  const dbPath = path.join(process.cwd(), 'data', 'migration.db');
  
  if (!fs.existsSync(dbPath)) {
    return NextResponse.json(
      { success: false, error: 'Database file not found' },
      { status: 404 }
    );
  }
  
  const buffer = fs.readFileSync(dbPath);
  const base64 = buffer.toString('base64');
  
  return NextResponse.json({
    success: true,
    filename: `migration-${new Date().toISOString().split('T')[0]}.db`,
    mimeType: 'application/x-sqlite3',
    sizeBytes: buffer.length,
    data: base64,
  });
}

// Switch to mock database (for testing)
async function switchToMockDatabase(): Promise<NextResponse> {
  const dbPath = path.join(process.cwd(), 'data', 'migration.db');
  const mockDbPath = path.join(process.cwd(), 'data', 'mock-migration.db');
  const realDbBackupPath = path.join(process.cwd(), 'data', 'migration-real-backup.db');
  
  // Backup real database
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, realDbBackupPath);
  }
  
  // Create or use existing mock database
  if (!fs.existsSync(mockDbPath)) {
    // Create new mock database
    const mockDb = require('better-sqlite3')(mockDbPath);
    mockDb.exec(`
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
    `);
    mockDb.close();
    
    // Seed it
    // (In a real implementation, we'd call seedDatabase() here)
  }
  
  // Copy mock to main database
  fs.copyFileSync(mockDbPath, dbPath);
  
  return NextResponse.json({
    success: true,
    message: 'Switched to mock database. Real database backed up.',
    note: 'Restart the server to use the mock database fully.',
  });
}

// Helper: Format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
