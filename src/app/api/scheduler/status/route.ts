import { NextResponse } from 'next/server';
import { getSchedulerStatus, getNextRunTime } from '@/lib/scheduler';

export async function GET() {
  try {
    const status = getSchedulerStatus();
    const nextRun = getNextRunTime();

    return NextResponse.json({
      ...status,
      nextRunAt: nextRun?.toISOString() || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get scheduler status', details: String(error) },
      { status: 500 }
    );
  }
}
