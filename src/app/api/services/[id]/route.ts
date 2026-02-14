import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, priority, notes, category } = body;

    // Get current service
    const current = db.prepare('SELECT * FROM services WHERE id = ?').get(id) as any;
    if (!current) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Update service
    const updates: string[] = [];
    const values: any[] = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);
      
      if (status === 'migrated') {
        updates.push('migration_date = ?');
        values.push(new Date().toISOString());
      }
    }
    if (priority) {
      updates.push('priority = ?');
      values.push(priority);
    }
    if (notes) {
      updates.push('notes = ?');
      values.push(notes);
    }
    if (category) {
      updates.push('category = ?');
      values.push(category);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());

    values.push(id);

    db.prepare(`
      UPDATE services 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    // Log history if status changed
    if (status && status !== current.status) {
      db.prepare(`
        INSERT INTO migration_history (service_id, old_status, new_status, notes)
        VALUES (?, ?, ?, ?)
      `).run(id, current.status, status, notes || null);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
  }
}
