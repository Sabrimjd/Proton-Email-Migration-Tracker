import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const runs = db.prepare(`
      SELECT * FROM scan_runs 
      ORDER BY run_at DESC 
      LIMIT 10
    `).all();

    const history = db.prepare(`
      SELECT 
        mh.*,
        s.name as service_name,
        s.domain as service_domain
      FROM migration_history mh
      JOIN services s ON mh.service_id = s.id
      ORDER BY mh.changed_at DESC
      LIMIT 50
    `).all();

    const totalEmailsScanned = db.prepare(`
      SELECT SUM(emails_scanned) as total FROM scan_runs
    `).get() as any;

    return NextResponse.json({
      scanRuns: runs,
      migrationHistory: history,
      totalEmailsScanned: totalEmailsScanned?.total || 0,
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
