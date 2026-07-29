const router = require('koa-router')()
const userController = require('../controller/user')

router.prefix('/users')

// 获取所有用户（支持分页与姓名搜索）
router.get('/list', userController.list)

// 创建用户
router.post('/create', userController.create)

// 获取指定用户
router.get('/:id', userController.detail)

module.exports = router
