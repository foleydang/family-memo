const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const config = require('../config/default');
const { initDatabase } = require('./utils/database');

// 导入路由
const authRoutes = require('./routes/auth');
const familyRoutes = require('./routes/family');
const shoppingRoutes = require('./routes/shopping');
const todoRoutes = require('./routes/todo');
const scheduleRoutes = require('./routes/schedule');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件
app.use('/static', express.static(path.join(__dirname, '../public')));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/shopping', shoppingRoutes);
app.use('/api/todo', todoRoutes);
app.use('/api/schedule', scheduleRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '家庭备忘录服务运行正常 ❤️' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    message: err.message || '服务器错误',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 初始化数据库并启动服务
async function start() {
  try {
    await initDatabase();
    console.log('✅ 数据库初始化完成');
    
    app.listen(config.port, () => {
      console.log(`🚀 服务已启动: http://localhost:${config.port}`);
      console.log('💕 家庭备忘录，记录爱的每一刻');
    });
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

start();