import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

import pino, { LoggerOptions } from 'pino';

const isProd = process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'stage';
const logDir = path.resolve(process.cwd(), 'logs');

if (isProd && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const prodTargets = [
  {
    target: 'pino/file',
    options: {
      destination: './logs/combined.log',
    },
    level: 'info',
  },
  {
    target: 'pino/file',
    options: {
      destination: './logs/error.log',
    },
    level: 'error',
  },
];

const devTransport = {
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  },
};

export const AppLogger: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  transport: isProd ? { targets: prodTargets } : devTransport,
  timestamp: isProd ? pino.stdTimeFunctions.isoTime : undefined,
  serializers: {
    req(req: any) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
      };
    },
    res(res: any) {
      return {
        statusCode: res.statusCode,
        user: res?.request?.user?.id,
      };
    },
    err(err: any) {
      return {
        type: err.type,
        message: err.message,
        stack: err.stack,
      };
    },
  },
};

export const logger = pino(AppLogger);
