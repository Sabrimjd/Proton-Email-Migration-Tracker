import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    // Get all services grouped by category with details
    const services = db.prepare(`
      SELECT * FROM services
      ORDER BY category, emails_received DESC
    `).all() as any[];

    // Group by category
    const categories: Record<string, {
      name: string;
      count: number;
      pending: number;
      migrated: number;
      inProgress: number;
      skipped: number;
      totalEmails: number;
      services: any[];
    }> = {};

    for (const service of services) {
      const cat = service.category || 'other';
      if (!categories[cat]) {
        categories[cat] = {
          name: cat,
          count: 0,
          pending: 0,
          migrated: 0,
          inProgress: 0,
          skipped: 0,
          totalEmails: 0,
          services: [],
        };
      }
      categories[cat].count++;
      categories[cat].totalEmails += service.emails_received || 0;
      categories[cat].services.push({
        id: service.id,
        name: service.name,
        domain: service.domain,
        email_address: service.email_address,
        priority: service.priority,
        status: service.status,
        emails_received: service.emails_received,
        last_email_date: service.last_email_date,
        notes: service.notes,
      });

      if (service.status === 'pending') categories[cat].pending++;
      else if (service.status === 'migrated') categories[cat].migrated++;
      else if (service.status === 'in_progress') categories[cat].inProgress++;
      else if (service.status === 'skipped') categories[cat].skipped++;
    }

    // Convert to array and sort by count
    const categoryList = Object.values(categories).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      categories: categoryList,
      total: services.length,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
