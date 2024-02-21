import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info', // Minimum level of messages to log
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Timestamp format
    format.errors({ stack: true }), // Log the full stack trace on errors
    format.splat(), // String interpolation splat for %s
    format.json() // Log in JSON format
  ),
  // Different transports can be added here (e.g., file, console)
  transports: [
    // Console transport
    new transports.Console({
      format: format.combine(
        format.colorize(), // Colorize log levels
        format.printf(
          info => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
        )
      )
    }),
    // File transport
    new transports.File({ filename: 'logs/access.log' })
  ]
});

export default logger;
