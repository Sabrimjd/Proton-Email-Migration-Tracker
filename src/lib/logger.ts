// Simple in-memory logger for API logs
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

class Logger {
  private static logs: LogEntry[] = [];
  private static maxLogs = 500; // Keep last 500 logs

  static formatTimestamp(): string {
    return new Date().toISOString();
  }

  static info(message: string): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: 'info',
      message,
    };
    this.logs.push(entry);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Also print to console for container logs
    console.log(`[${entry.timestamp}] [INFO] ${message}`);
  }

  static warn(message: string): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: 'warn',
      message,
    };
    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    console.warn(`[${entry.timestamp}] [WARN] ${message}`);
  }

  static error(message: string): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: 'error',
      message,
    };
    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    console.error(`[${entry.timestamp}] [ERROR] ${message}`);
  }

  static getLogs(level?: 'info' | 'warn' | 'error'): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  static clear(): void {
    this.logs = [];
    console.log('[Logger] Logs cleared');
  }
}

export { Logger };
