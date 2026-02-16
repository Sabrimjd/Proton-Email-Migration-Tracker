import { NextResponse } from 'next/server';
import { runScheduledAnalysis } from '@/lib/scheduler';

export async function POST() {
  try {
    console.log('[API] Manual trigger requested');
    
    // Run in background and return immediately
    runScheduledAnalysis()
      .then((result) => {
        console.log('[API] Manual analysis completed:', result);
      })
      .catch((error) => {
        console.error('[API] Manual analysis failed:', error);
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
