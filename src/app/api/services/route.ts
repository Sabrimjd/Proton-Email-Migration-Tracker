import { NextResponse } from 'next/server';
import db from '@/lib/db';

interface ServiceData {
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

interface CategoryData {
  services: ServiceData[];
  total: number;
  pending: number;
  migrated: number;
  emails: number;
}

interface MonthData {
  emails: number;
  services: number;
}

export async function GET() {
  try {
    const services = db.prepare(`
      SELECT * FROM services
      ORDER BY
        last_email_date DESC NULLS LAST,
        emails_received DESC,
        priority DESC,
        name ASC
    `).all() as ServiceData[];

    const stats = {
      total: services.length,
      pending: services.filter((s) => s.status === 'pending').length,
      inProgress: services.filter((s) => s.status === 'in_progress').length,
      migrated: services.filter((s) => s.status === 'migrated').length,
      skipped: services.filter((s) => s.status === 'skipped').length,
      totalEmails: services.reduce((sum, s) => sum + (s.emails_received || 0), 0),
      highPriority: services.filter((s) => s.priority === 'high').length,
    };

    // Category distribution with counts
    const byCategory: Record<string, CategoryData> = services.reduce((acc, s) => {
      if (!acc[s.category]) {
        acc[s.category] = {
          services: [],
          total: 0,
          pending: 0,
          migrated: 0,
          emails: 0,
        };
      }
      acc[s.category].services.push(s);
      acc[s.category].total++;
      acc[s.category].emails += s.emails_received || 0;
      if (s.status === 'pending' || s.status === 'in_progress') acc[s.category].pending++;
      if (s.status === 'migrated') acc[s.category].migrated++;
      return acc;
    }, {} as Record<string, CategoryData>);

    const byPriority: Record<string, number> = services.reduce((acc, s) => {
      if (!acc[s.priority]) acc[s.priority] = 0;
      acc[s.priority]++;
      return acc;
    }, {} as Record<string, number>);

    // Chart data: Category distribution
    const categoryDistribution = Object.entries(byCategory).map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: data.total,
      emails: data.emails,
      pending: data.pending,
      migrated: data.migrated,
    }));

    // Chart data: Migration progress by category
    const categoryProgress = Object.entries(byCategory).map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      pending: data.pending,
      migrated: data.migrated,
      total: data.total,
      progress: data.total > 0 ? Math.round((data.migrated / data.total) * 100) : 0,
    }));

    // Email volume over time (by month)
    const emailVolumeByMonth: Record<string, MonthData> = services.reduce((acc, s) => {
      if (s.last_email_date) {
        const date = new Date(s.last_email_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[monthKey]) {
          acc[monthKey] = { emails: 0, services: 0 };
        }
        acc[monthKey].emails += s.emails_received || 0;
        acc[monthKey].services++;
      }
      return acc;
    }, {} as Record<string, MonthData>);

    const emailVolumeOverTime = Object.entries(emailVolumeByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // Last 12 months
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        emails: data.emails,
        services: data.services,
      }));

    // Status distribution
    const statusDistribution = [
      { name: 'Pending', value: stats.pending, color: '#fbbf24' },
      { name: 'In Progress', value: stats.inProgress, color: '#3b82f6' },
      { name: 'Migrated', value: stats.migrated, color: '#10b981' },
      { name: 'Skipped', value: stats.skipped, color: '#6b7280' },
    ];

    return NextResponse.json({
      services,
      stats,
      byCategory,
      byPriority,
      categoryDistribution,
      categoryProgress,
      emailVolumeOverTime,
      statusDistribution,
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}
