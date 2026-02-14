import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serviceId = parseInt(id, 10);

    if (isNaN(serviceId)) {
      return NextResponse.json({ error: 'Invalid service ID' }, { status: 400 });
    }

    // Get the service
    const service = db.prepare(`
      SELECT * FROM services WHERE id = ?
    `).get(serviceId) as any;

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Get last 10 emails for this service
    const emails = db.prepare(`
      SELECT
        id,
        subject,
        sender,
        sender_email,
        recipient_email,
        received_at,
        is_read
      FROM emails
      WHERE service_id = ?
      ORDER BY received_at DESC
      LIMIT 10
    `).all(serviceId) as any[];

    // Format dates
    const formattedEmails = emails.map(email => ({
      ...email,
      received_at_formatted: email.received_at
        ? new Date(email.received_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Unknown',
      received_at_relative: email.received_at
        ? getRelativeTime(new Date(email.received_at))
        : '',
    }));

    return NextResponse.json({
      service: {
        id: service.id,
        name: service.name,
        domain: service.domain,
        email_address: service.email_address,
        category: service.category,
        priority: service.priority,
        status: service.status,
        emails_received: service.emails_received,
        notes: service.notes,
      },
      emails: formattedEmails,
      total: emails.length,
    });
  } catch (error) {
    console.error('Error fetching service emails:', error);
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${diffYears}y ago`;
}
