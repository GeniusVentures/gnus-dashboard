interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

const LOG_LEVEL_PRIORITY = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

class Logger {
  private currentLevel: string;

  constructor() {
    this.currentLevel = process.env.LOG_LEVEL || 'info';
  }

  private shouldLog(level: string): boolean {
    const currentPriority = LOG_LEVEL_PRIORITY[this.currentLevel as keyof typeof LOG_LEVEL_PRIORITY] ?? 2;
    const messagePriority = LOG_LEVEL_PRIORITY[level as keyof typeof LOG_LEVEL_PRIORITY] ?? 2;
    return messagePriority <= currentPriority;
  }

  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      // Remove potential sensitive patterns
      return data
        .replace(/\b[0-9a-fA-F]{64}\b/g, '[PRIVATE_KEY_REDACTED]')
        .replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, '[API_KEY_REDACTED]')
        .replace(/Bearer\s+[^\s]+/g, 'Bearer [TOKEN_REDACTED]');
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (['password', 'token', 'key', 'secret', 'privateKey'].some(sensitive => 
          key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const sanitizedMeta = meta ? this.sanitizeData(meta) : undefined;
    
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...(sanitizedMeta && { meta: sanitizedMeta })
    });
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
}

export const logger = new Logger();
export default logger;