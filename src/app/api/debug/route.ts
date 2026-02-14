import { NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

export async function GET() {
  try {
    // Database stats
    const servicesCount = db.prepare('SELECT COUNT(*) as count FROM services').get() as { count: number };
    const emailsCount = db.prepare('SELECT COUNT(*) as count FROM emails').get() as { count: number };
    const scanRuns = db.prepare('SELECT * FROM scan_runs ORDER BY run_at DESC LIMIT 10').all() as any[];

    // Status distribution
    const statusDistribution = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM services
      GROUP BY status
    `).all() as any[];

    // Category distribution
    const categoryDistribution = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM services
      GROUP BY category
      ORDER BY count DESC
    `).all() as any[];

    // Priority distribution
    const priorityDistribution = db.prepare(`
      SELECT priority, COUNT(*) as count
      FROM services
      GROUP BY priority
    `).all() as any[];

    // Recent migrated services
    const recentMigrated = db.prepare(`
      SELECT name, email_address, migration_date, old_email, new_email
      FROM services
      WHERE status = 'migrated' AND migration_date IS NOT NULL
      ORDER BY migration_date DESC
      LIMIT 10
    `).all() as any[];

    // Database file size
    const dbPath = path.join(process.cwd(), 'data', 'migration.db');
    let dbSize = 0;
    let dbModified = null;
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      dbSize = stats.size;
      dbModified = stats.mtime;
    }

    // Load config
    let config = null;
    const configPath = path.join(process.cwd(), 'config.local.yml');
    const defaultConfigPath = path.join(process.cwd(), 'config.yml');
    const actualConfigPath = fs.existsSync(configPath) ? configPath : defaultConfigPath;

    if (fs.existsSync(actualConfigPath)) {
      const configFile = fs.readFileSync(actualConfigPath, 'utf8');
      config = yaml.parse(configFile);
      // Remove sensitive data
      if (config.protonmail) {
        delete config.protonmail;
      }
    }

    // Email senders analysis
    const topSenders = db.prepare(`
      SELECT sender_email, COUNT(*) as count
      FROM emails
      GROUP BY sender_email
      ORDER BY count DESC
      LIMIT 20
    `).all() as any[];

    // Unique domains count
    const domainsCount = db.prepare(`
      SELECT COUNT(DISTINCT domain) as count FROM services
    `).get() as { count: number };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      database: {
        path: dbPath,
        sizeBytes: dbSize,
        sizeFormatted: formatBytes(dbSize),
        lastModified: dbModified,
        servicesCount: servicesCount.count,
        emailsCount: emailsCount.count,
        domainsCount: domainsCount.count,
      },
      scanHistory: scanRuns,
      distribution: {
        status: statusDistribution,
        category: categoryDistribution,
        priority: priorityDistribution,
      },
      recentMigrated,
      topSenders,
      config: {
        source: fs.existsSync(configPath) ? 'config.local.yml' : 'config.yml',
        emails: config?.emails || null,
        database: config?.database || null,
        server: config?.server || null,
        dashboard: config?.dashboard || null,
      },
    });
  } catch (error) {
    console.error('Error fetching debug info:', error);
    return NextResponse.json({ error: 'Failed to fetch debug info' }, { status: 500 });
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
