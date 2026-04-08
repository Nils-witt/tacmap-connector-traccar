import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const fileTransport = new DailyRotateFile({
  level: 'info',
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.printf(
      ({
        timestamp,
        level,
        message,
        stack,
        ...meta
      }: {
        timestamp?: unknown;
        level: unknown;
        message: unknown;
        stack?: unknown;
        [key: string]: unknown;
      }) => {
        const metaKeys = Object.keys(meta);
        const metaText = metaKeys.length > 0 ? ` ${JSON.stringify(meta, null, 2)}` : '';
        const messageText = stack || message;

        return `${(timestamp as string) ?? ''} [${level as string}] ${messageText as string}${metaText}`;
      },
    ),
  ),
  transports: [new winston.transports.Console(), fileTransport],
});

export default logger;
