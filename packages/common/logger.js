const winston = require('winston');
const colorize = require('json-colorizer');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'peachai-service' },
  transports: [
    new winston.transports.Console({
      // format: winston.format.simple(),
      // format: winston.format.colorize({all:true, colors: { info: 'blue' }}),
      // format: winston.format.prettyPrint({colorize:true}),
      format: winston.format.printf((info) => info.message),
    }),
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    //new winston.transports.File({ filename: 'error.log', level: 'error' }),
    //new winston.transports.File({ filename: 'combined.log' }),
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
/*
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}*/

// function indent(...args) {
//   logger.info(util.format(...msg))
// }

const colorOptions = {
  colors: {
    BRACE: '#888888',
    BRACKET: '#888888',
    COLON: '#888888',
    COMMA: '#888888',
    STRING_KEY: 'blue',
    STRING_LITERAL: 'green',
    NUMBER_LITERAL: 'yellow',
    BOOLEAN_LITERAL: '#888888',
    NULL_LITERAL: '#888888',
  },
};

class CustomLogger {
  constructor(indentLevel) {
    this.indentLevel = indentLevel;
  }

  static indent(amount) {
    let totalIndent = '';
    for (let i = 0; i < amount; i++) {
      totalIndent += '--';
    }
    return totalIndent;
  }

  header(...args) {
    let strings = args.map((x) => {
      if (typeof x === 'string') {
        return x;
      }
      return colorize(JSON.stringify(x), colorOptions);
    });
    logger.info(CustomLogger.indent(this.indentLevel) + '> ' + strings.join(' '));
  }

  info(...args) {
    let strings = args.map((x) => {
      if (typeof x === 'string') {
        return x;
      }
      return colorize(JSON.stringify(x), colorOptions);
    });
    logger.info(CustomLogger.indent(this.indentLevel + 1) + '- ' + strings.join(' '));
  }

  error(...args) {
    let strings = args.map((x) => {
      if (typeof x === 'string') {
        return x;
      }
      return colorize(JSON.stringify(x), colorOptions);
    });
    logger.error(CustomLogger.indent(this.indentLevel + 1) + '- ' + strings.join(' '));
  }

  static error(...args) {
    logger.error(args);
  }
}

module.exports = {
  logger,
  CustomLogger,
};