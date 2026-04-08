const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../../config/default');

let db = null;

// 数据库初始化
function initDatabase() {
  return new Promise((resolve, reject) => {
    try {
      // 确保数据目录存在
      const dbDir = path.dirname(config.database.path);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      
      // 创建数据库连接
      db = new Database(config.database.path);
      
      // 启用外键约束
      db.pragma('foreign_keys = ON');
      
      // 读取并执行初始化脚本
      const schemaPath = path.join(__dirname, '../../database/schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      db.exec(schema);
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// 获取数据库连接
function getDb() {
  if (!db) {
    throw new Error('数据库未初始化');
  }
  return db;
}

// 生成邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 格式化日期
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// 格式化时间
function formatTime(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toTimeString().split(' ')[0].slice(0, 5);
}

module.exports = {
  initDatabase,
  getDb,
  generateInviteCode,
  formatDate,
  formatTime
};