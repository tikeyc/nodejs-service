/**
 * 用户控制器
 *
 * 提供三个接口的处理函数：
 *   list   GET  /users        获取所有用户（支持分页、按姓名模糊搜索）
 *   detail GET  /users/:id    获取指定用户
 *   create POST /users        创建用户
 *
 * 统一响应结构：{ code, message, data }
 *   code = 0 表示成功，非 0 表示业务失败
 */

const { Op } = require('../config/database')
const User = require('../model/user')
const logger = require('../utils/log4js')

const userLogger = logger.getLogger('user')

// 允许创建时写入的字段白名单，避免客户端注入 id / createdAt 等字段
const CREATABLE_FIELDS = ['name', 'age', 'sexlabel', 'birth', 'addr']

/** 成功响应 */
function success(ctx, data, message = 'ok') {
  ctx.status = 200
  ctx.body = { code: 0, message, data }
}

/** 失败响应 */
function fail(ctx, status, message, code = status) {
  ctx.status = status
  ctx.body = { code, message, data: null }
}

/**
 * 获取所有用户
 * GET /users?page=1&pageSize=20&name=张
 * 分页参数可省略，默认第 1 页、每页 20 条，pageSize 上限 100。
 */
async function list(ctx) {
  const { page, pageSize, name } = ctx.query

  const currentPage = Math.max(1, Number(page) || 1)
  const limit = Math.min(100, Math.max(1, Number(pageSize) || 20))
  const offset = (currentPage - 1) * limit

  // 姓名模糊搜索（参数化查询，Sequelize 自动转义）
  const where = {}
  if (name) {
    where.name = { [Op.like]: `%${name}%` }
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    limit,
    offset,
    order: [['id', 'DESC']]
  })

  success(ctx, {
    list: rows,
    total: count,
    page: currentPage,
    pageSize: limit
  })
}

/**
 * 获取指定用户
 * GET /users/:id
 */
async function detail(ctx) {
  const id = Number(ctx.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return fail(ctx, 400, 'id 必须为正整数')
  }

  const user = await User.findByPk(id)
  if (!user) {
    return fail(ctx, 404, `用户不存在：id=${id}`)
  }

  success(ctx, user)
}

/**
 * 创建用户
 * POST /users
 * body: { name, age?, sexlabel?, birth?, addr? }
 */
async function create(ctx) {
  const body = ctx.request.body || {}

  // 只取白名单字段
  const payload = {}
  for (const field of CREATABLE_FIELDS) {
    if (body[field] !== undefined) {
      payload[field] = body[field]
    }
  }

  // name 为必填
  if (typeof payload.name !== 'string' || payload.name.trim() === '') {
    return fail(ctx, 400, 'name 不能为空')
  }
  payload.name = payload.name.trim()

  // age 若传入需为 0-150 的整数
  if (payload.age !== undefined) {
    const age = Number(payload.age)
    if (!Number.isInteger(age) || age < 0 || age > 150) {
      return fail(ctx, 400, 'age 必须为 0-150 之间的整数')
    }
    payload.age = age
  }

  try {
    const user = await User.create(payload)
    userLogger.info(`创建用户成功 id=${user.id} name=${user.name}`)
    ctx.status = 201
    ctx.body = { code: 0, message: '创建成功', data: user }
  } catch (err) {
    // 模型层校验失败归类为客户端错误，其余交给全局错误处理
    if (err.name === 'SequelizeValidationError') {
      return fail(ctx, 400, err.errors.map((e) => e.message).join('; '))
    }
    throw err
  }
}

module.exports = {
  list,
  detail,
  create
}
