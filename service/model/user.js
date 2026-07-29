/**
 * 用户信息模型
 *
 * 使用 Sequelize 定义用户表，字段包含：
 *   name        姓名
 *   age         年龄
 *   sexlabel    性别标签
 *   birth       出生日期
 *   addr        地址
 *   createdAt   创建时间（使用 dayjs 生成默认值）
 */

const dayjs = require('dayjs')
const { sequelize, DataTypes } = require('../config/database')

const User = sequelize.define(
  'User',
  {
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '姓名'
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '年龄'
    },
    sexlabel: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: '性别标签'
    },
    birth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: '出生日期'
    },
    addr: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '地址'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      // 使用 dayjs 生成默认创建时间（每次插入时求值）
      defaultValue: () => dayjs().format('YYYY-MM-DD HH:mm:ss'),
      comment: '创建时间'
    }
  },
  {
    tableName: 'user',
    // 手动维护 createdAt，关闭 Sequelize 自动时间戳以免冲突
    timestamps: false
  }
)

module.exports = User
