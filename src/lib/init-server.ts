// Server initialization - runs once on startup
import { startScheduler } from './scheduler';

let initialized = false;

export function initializeServer() {
  if (initialized) return;
  
  console.log('[Server] Initializing...');
  
  // Start the scheduler daemon
  startScheduler();
  
  initialized = true;
  console.log('[Server] Initialization complete');
}
