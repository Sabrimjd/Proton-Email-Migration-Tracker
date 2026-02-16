import cron, { ScheduledTask } from 'node-cron';
import { runEmailAnalysis } from './email-analyzer';
import { loadConfig } from './config';

let scheduledTask: ScheduledTask | null = null;
let isRunning = false;
let lastRunAt: Date | null = null;
let lastRunResult: any = null;
let lastError: string | null = null;

export function startScheduler() {
  const config = loadConfig();
  
  if (!config.scheduler?.enabled) {
    console.log('[Scheduler] Disabled in config');
    return;
  }

  if (scheduledTask) {
    console.log('[Scheduler] Already running');
    return;
  }

  const schedule = config.scheduler.cron || '0 6 * * *'; // Default: 6 AM daily

  try {
    scheduledTask = cron.schedule(schedule, async () => {
      console.log(`[Scheduler] Triggered at ${new Date().toISOString()}`);
      await runScheduledAnalysis();
    });

    console.log(`[Scheduler] Started with schedule: ${schedule}`);
  } catch (error) {
    console.error('[Scheduler] Failed to start:', error);
  }
}

export function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[Scheduler] Stopped');
  }
}

export async function runScheduledAnalysis() {
  if (isRunning) {
    console.log('[Scheduler] Analysis already running, skipping...');
    return { status: 'skipped', reason: 'already_running' };
  }

  isRunning = true;
  lastRunAt = new Date();
  lastError = null;

  try {
    console.log('[Scheduler] Starting scheduled email analysis...');
    const result = await runEmailAnalysis();
    lastRunResult = {
      ...result,
      timestamp: lastRunAt.toISOString(),
      status: 'completed',
    };
    console.log('[Scheduler] Analysis completed successfully');
    return lastRunResult;
  } catch (error) {
    lastError = String(error);
    lastRunResult = {
      timestamp: lastRunAt.toISOString(),
      status: 'failed',
      error: lastError,
    };
    console.error('[Scheduler] Analysis failed:', error);
    throw error;
  } finally {
    isRunning = false;
  }
}

export function getSchedulerStatus() {
  const config = loadConfig();
  
  return {
    enabled: config.scheduler?.enabled || false,
    schedule: config.scheduler?.cron || '0 6 * * *',
    isRunning: scheduledTask !== null,
    currentlyAnalyzing: isRunning,
    lastRunAt: lastRunAt?.toISOString() || null,
    lastRunResult,
    lastError,
  };
}

export function getNextRunTime(): Date | null {
  const config = loadConfig();
  if (!scheduledTask || !config.scheduler?.enabled) return null;

  const schedule = config.scheduler.cron || '0 6 * * *';
  
  try {
    // Parse cron expression to estimate next run
    // This is a simplified calculation - cron.schedule doesn't expose next run time
    const parts = schedule.split(' ');
    if (parts.length < 5) return null;

    const now = new Date();
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // Simple case: daily at specific time
    if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      const targetHour = parseInt(hour);
      const targetMinute = parseInt(minute);
      
      const next = new Date(now);
      next.setHours(targetHour, targetMinute, 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      
      return next;
    }

    // For complex schedules, return null (would need full cron parser)
    return null;
  } catch {
    return null;
  }
}
