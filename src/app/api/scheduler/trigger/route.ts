import { NextResponse } from 'next/server';
import { runScheduledAnalysis } from '@/lib/scheduler';
import { Logger } from '@/lib/logger';

export async function POST() {
  try {
    Logger.info('[API] Manual trigger requested');
    
    // Run in background and return immediately
    runScheduledAnalysis()
      .then((result) => {
        Logger.info('[API] Manual analysis completed: ' + JSON.stringify(result));
      })
      .catch((error) => {
        Logger.error('[API] Manual analysis failed: ' + String(error));
      });

    return NextResponse.json({
      status: 'triggered',
      message: 'Analysis started in background',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to trigger analysis', details: String(error) },
      { status: 500 }
    );
  }
}
