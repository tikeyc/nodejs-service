/**
 * log4js 日志封装
 *
 * 提供分级日志打印方法（trace / debug / info / warn / error / fatal），
 * 并支持按天滚动写入文件、控制台彩色输出，以及请求日志中间件。
 *
 * 用法：
 *   const logger = require('./utils/log4js')
 *   logger.info('服务启动', { port: 3001 })
 *   logger.error('数据库连接失败', err)
 *
 * Koa 请求日志中间件：
 *   app.use(logger.koaLogger())
 */

const path = require('path')
const log4js = require('log4js')

// 日志文件根目录（项目根下 logs/）
const LOG_DIR = path.join(__dirname, '../logs')

// 通过环境变量控制日志级别，默认 info；开发环境可设为 debug
const LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

log4js.configure({
  // 输出目的地
  appenders: {
    // 控制台（带颜色）
    console: {
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: '%[[%d{yyyy-MM-dd hh:mm:ss.SSS}] [%p] %c -%] %m'
      }
    },
    // 全量日志，按天滚动
    app: {
      type: 'dateFile',
      filename: path.join(LOG_DIR, 'app.log'),
      pattern: 'yyyy-MM-dd',
      keepFileExt: true,
      alwaysIncludePattern: true,
      numBackups: 30, // 保留 30 天
      layout: {
        type: 'pattern',
        pattern: '[%d{yyyy-MM-dd hh:mm:ss.SSS}] [%p] %c - %m'
      }
    },
    // 仅错误及以上级别单独归档
    errorFile: {
      type: 'dateFile',
      filename: path.join(LOG_DIR, 'error.log'),
      pattern: 'yyyy-MM-dd',
      keepFileExt: true,
      alwaysIncludePattern: true,
      numBackups: 30,
      layout: {
        type: 'pattern',
        pattern: '[%d{yyyy-MM-dd hh:mm:ss.SSS}] [%p] %c - %m%n%s'
      }
    },
    // 用 logLevelFilter 让 errorFile 只收 error 及以上
    errors: {
      type: 'logLevelFilter',
      appender: 'errorFile',
      level: 'error'
    }
  },
  // 分类：default 走控制台 + 全量文件 + 错误文件
  categories: {
    default: {
      appenders: ['console', 'app', 'errors'],
      level: LEVEL,
      enableCallStack: true
    }
  }
})

// 默认分类的 logger
const logger = log4js.getLogger()

/**
 * 获取指定分类（category）的 logger，便于在不同模块区分来源。
 * @param {string} [category] 分类名，如 'db' / 'router'
 * @returns {log4js.Logger}
 */
function getLogger(category) {
  return log4js.getLogger(category)
}

/**
 * Koa 请求日志中间件：记录方法、路径、状态码、耗时。
 * @returns {import('koa').Middleware}
 */
function koaLogger() {
  const httpLogger = log4js.getLogger('http')
  return async (ctx, next) => {
    const start = Date.now()
    try {
      await next()
      const ms = Date.now() - start
      httpLogger.info(`${ctx.method} ${ctx.url} ${ctx.status} - ${ms}ms`)
    } catch (err) {
      const ms = Date.now() - start
      httpLogger.error(`${ctx.method} ${ctx.url} ${ctx.status || 500} - ${ms}ms`, err)
      throw err
    }
  }
}

module.exports = {
  // 分级打印方法，直接透传给 log4js，支持多参数与占位符
  trace: (...args) => logger.trace(...args),
  debug: (...args) => logger.debug(...args),
  info: (...args) => logger.info(...args),
  warn: (...args) => logger.warn(...args),
  error: (...args) => logger.error(...args),
  fatal: (...args) => logger.fatal(...args),

  // 高级用法
  getLogger,
  koaLogger,

  // 优雅关闭时刷新日志缓冲（如进程退出前调用）
  shutdown: log4js.shutdown
}
