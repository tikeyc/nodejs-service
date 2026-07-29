/**
 * Sequelize MySQL 数据库连接封装
 *
 * 统一创建并导出 Sequelize 实例，支持通过环境变量配置连接参数、
 * 连接池、日志输出，并提供连接测试与优雅关闭方法。
 *
 * 用法：
 *   // 1. 直接使用实例定义模型
 *   const { sequelize, DataTypes } = require('../config/database')
 *   const User = sequelize.define('User', {
 *     name: { type: DataTypes.STRING, allowNull: false }
 *   })
 *
 *   // 2. 启动时测试连接（如在 bin/www 或 app.js 中）
 *   const { testConnection } = require('./config/database')
 *   await testConnection()
 *
 * 环境变量（均有默认值，生产环境请通过 .env 或部署平台注入）：
 *   DB_HOST      数据库地址          默认 127.0.0.1
 *   DB_PORT      端口               默认 3306
 *   DB_USER      用户名             默认 root
 *   DB_PASSWORD  密码               默认 ''
 *   DB_NAME      数据库名           默认 test
 *   DB_POOL_MAX  连接池最大连接数     默认 10
 *   DB_POOL_MIN  连接池最小连接数     默认 0
 */

const { Sequelize, DataTypes, Op } = require('sequelize')
const logger = require('../utils/log4js')

// 数据库专用日志分类，便于区分来源
const dbLogger = logger.getLogger('db')

// 从环境变量读取配置，提供合理默认值
const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'test'
}

// 创建 Sequelize 实例
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: 'mysql',
  timezone: '+08:00', // 东八区，写入时间按本地时区处理

  // 将 SQL 输出交给 log4js（debug 级别），关闭级别时自动静默
  logging: (sql) => dbLogger.debug(sql),

  // 连接池配置
  pool: {
    max: Number(process.env.DB_POOL_MAX) || 10,
    min: Number(process.env.DB_POOL_MIN) || 0,
    acquire: 30000, // 获取连接最大等待毫秒数
    idle: 10000     // 连接空闲多久后释放（毫秒）
  },

  define: {
    freezeTableName: true, // 表名不自动复数化
    underscored: true,     // 字段自动转 snake_case
    timestamps: true       // 自动维护 created_at / updated_at
  },

  dialectOptions: {
    // 返回 DECIMAL / BIGINT 时保留为字符串，避免精度丢失
    decimalNumbers: true,
    charset: 'utf8mb4'
  }
})

/**
 * 测试数据库连接是否可用。
 * 建议在服务启动时调用，连接失败时抛出异常由上层处理。
 * @returns {Promise<void>}
 */
async function testConnection() {
  try {
    await sequelize.authenticate()
    await sequelize.sync()
    dbLogger.info(`数据库连接成功 ${config.host}:${config.port}/${config.database}`)
  } catch (err) {
    dbLogger.error('数据库连接失败', err)
    throw err
  }
}

/**
 * 关闭数据库连接池（进程退出前调用，避免连接泄漏）。
 * @returns {Promise<void>}
 */
async function close() {
  try {
    await sequelize.close()
    dbLogger.info('数据库连接已关闭')
  } catch (err) {
    dbLogger.error('关闭数据库连接出错', err)
  }
}

module.exports = {
  sequelize,
  Sequelize,
  DataTypes,
  Op,
  testConnection,
  close
}
