const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'miniprogram/images');

// 主题色
const PRIMARY_COLOR = '#FF85A2';
const GRAY_COLOR = '#999999';
const WHITE_COLOR = '#FFFFFF';
const LIGHT_PINK = '#FFE4EC';
const ACCENT_PINK = '#FFB6C1';
const GREEN_COLOR = '#52c41a';

// 创建 81x81 的图标
function createIcon(name, drawFunc) {
  const canvas = createCanvas(81, 81);
  const ctx = canvas.getContext('2d');
  
  // 清空背景（透明）
  ctx.clearRect(0, 0, 81, 81);
  
  // 绘制图标
  drawFunc(ctx);
  
  // 保存为 PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(outputDir, `${name}.png`), buffer);
  console.log(`Created: ${name}.png`);
}

// 首页图标 - 小房子
function drawHome(ctx, active = false) {
  const color = active ? PRIMARY_COLOR : GRAY_COLOR;
  
  ctx.fillStyle = color;
  
  // 房子主体
  ctx.beginPath();
  ctx.moveTo(40.5, 18);
  ctx.lineTo(58, 32);
  ctx.lineTo(58, 58);
  ctx.lineTo(23, 58);
  ctx.lineTo(23, 32);
  ctx.closePath();
  ctx.fill();
  
  // 屋顶
  ctx.beginPath();
  ctx.moveTo(40.5, 12);
  ctx.lineTo(65, 32);
  ctx.lineTo(40.5, 32);
  ctx.lineTo(16, 32);
  ctx.closePath();
  ctx.fill();
  
  // 门
  ctx.fillStyle = WHITE_COLOR;
  ctx.fillRect(33, 40, 15, 18);
  
  ctx.fillStyle = color;
  ctx.fillRect(35, 42, 11, 14);
  
  // 门把手
  ctx.fillStyle = WHITE_COLOR;
  ctx.beginPath();
  ctx.arc(43, 52, 2, 0, Math.PI * 2);
  ctx.fill();
  
  // 选中态装饰
  if (active) {
    ctx.fillStyle = ACCENT_PINK;
    ctx.beginPath();
    ctx.moveTo(55, 25);
    ctx.bezierCurveTo(58, 22, 58, 28, 55, 31);
    ctx.bezierCurveTo(52, 28, 52, 22, 55, 25);
    ctx.fill();
  }
}

// 购物车图标
function drawCart(ctx, active = false) {
  const color = active ? PRIMARY_COLOR : GRAY_COLOR;
  
  ctx.fillStyle = color;
  
  // 车身
  ctx.beginPath();
  ctx.ellipse(40.5, 38, 20, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // 把手
  ctx.fillRect(22, 24, 37, 2);
  
  // 车轮
  ctx.beginPath();
  ctx.arc(28, 52, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(52, 52, 5, 0, Math.PI * 2);
  ctx.fill();
  
  // 货物
  ctx.fillStyle = WHITE_COLOR;
  ctx.fillRect(34, 30, 4, 8);
  
  // 选中态装饰
  if (active) {
    ctx.fillStyle = ACCENT_PINK;
    // 小星星
    drawStar(ctx, 60, 30, 4);
  }
}

function drawStar(ctx, x, y, size) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const px = x + Math.cos(angle) * size;
    const py = y + Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// 待办图标 - 清单
function drawTodo(ctx, active = false) {
  const color = active ? PRIMARY_COLOR : GRAY_COLOR;
  
  // 纸张背景
  ctx.fillStyle = color;
  roundRect(ctx, 18, 16, 45, 50, 4);
  ctx.fill();
  
  ctx.fillStyle = WHITE_COLOR;
  roundRect(ctx, 22, 20, 37, 42, 2);
  ctx.fill();
  
  // 项目
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(28, 30, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(28, 42, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(28, 54, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // 文字线
  roundRect(ctx, 34, 27, 20, 6, 1);
  ctx.fill();
  roundRect(ctx, 34, 39, 20, 6, 1);
  ctx.fill();
  roundRect(ctx, 34, 51, 16, 6, 1);
  ctx.fill();
  
  // 选中态 - 第一个完成
  if (active) {
    ctx.fillStyle = GREEN_COLOR;
    ctx.beginPath();
    ctx.arc(28, 30, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // 勾选标记
    ctx.strokeStyle = WHITE_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(25, 30);
    ctx.lineTo(27, 32);
    ctx.lineTo(31, 28);
    ctx.stroke();
  }
}

// 日历图标
function drawCalendar(ctx, active = false) {
  const color = active ? PRIMARY_COLOR : GRAY_COLOR;
  
  ctx.fillStyle = color;
  
  // 日历主体
  roundRect(ctx, 16, 18, 49, 48, 4);
  ctx.fill();
  
  // 顶部条
  roundRect(ctx, 16, 18, 49, 14, 4);
  ctx.fill();
  
  // 白色内容区
  ctx.fillStyle = WHITE_COLOR;
  ctx.fillRect(20, 32, 41, 32);
  
  // 挂钩
  ctx.fillStyle = color;
  roundRect(ctx, 26, 14, 4, 8, 1);
  ctx.fill();
  roundRect(ctx, 51, 14, 4, 8, 1);
  ctx.fill();
  
  // 日期格子
  const gridColor = active ? LIGHT_PINK : color;
  ctx.fillStyle = gridColor;
  ctx.fillRect(24, 36, 8, 8);
  ctx.fillRect(34, 36, 8, 8);
  ctx.fillRect(44, 36, 8, 8);
  ctx.fillRect(24, 46, 8, 8);
  ctx.fillRect(34, 46, 8, 8);
  
  // 选中态 - 心形标记
  if (active) {
    ctx.fillStyle = PRIMARY_COLOR;
    ctx.fillRect(34, 46, 8, 8);
    
    ctx.fillStyle = ACCENT_PINK;
    ctx.beginPath();
    ctx.moveTo(38, 48);
    ctx.bezierCurveTo(40, 46, 42, 48, 38, 52);
    ctx.bezierCurveTo(34, 48, 36, 46, 38, 48);
    ctx.fill();
  }
}

// 用户图标
function drawUser(ctx, active = false) {
  const color = active ? PRIMARY_COLOR : GRAY_COLOR;
  
  ctx.fillStyle = color;
  
  // 头部
  ctx.beginPath();
  ctx.arc(40.5, 32, 14, 0, Math.PI * 2);
  ctx.fill();
  
  // 身体
  ctx.beginPath();
  ctx.ellipse(40.5, 58, 20, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // 眼睛
  ctx.fillStyle = WHITE_COLOR;
  ctx.beginPath();
  ctx.arc(36, 30, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(45, 30, 2, 0, Math.PI * 2);
  ctx.fill();
  
  // 微笑
  ctx.strokeStyle = WHITE_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (active) {
    // 大笑
    ctx.arc(40, 36, 6, 0.1 * Math.PI, 0.9 * Math.PI);
  } else {
    // 微笑
    ctx.moveTo(36, 36);
    ctx.quadraticCurveTo(40, 40, 44, 36);
  }
  ctx.stroke();
  
  // 选中态装饰
  if (active) {
    ctx.fillStyle = ACCENT_PINK;
    ctx.beginPath();
    ctx.moveTo(52, 22);
    ctx.bezierCurveTo(54, 20, 54, 24, 52, 26);
    ctx.bezierCurveTo(50, 24, 50, 20, 52, 22);
    ctx.fill();
  }
}

// 辅助函数：圆角矩形
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// 创建默认头像
function drawDefaultAvatar(ctx) {
  ctx.fillStyle = LIGHT_PINK;
  ctx.beginPath();
  ctx.arc(40.5, 40.5, 35, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = PRIMARY_COLOR;
  ctx.beginPath();
  ctx.arc(40.5, 32, 14, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.beginPath();
  ctx.ellipse(40.5, 58, 20, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = WHITE_COLOR;
  ctx.beginPath();
  ctx.arc(36, 30, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(45, 30, 2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = WHITE_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(40, 36, 6, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
}

// 生成所有图标
console.log('Generating icons...\n');

createIcon('tab-home', (ctx) => drawHome(ctx, false));
createIcon('tab-home-active', (ctx) => drawHome(ctx, true));
createIcon('tab-cart', (ctx) => drawCart(ctx, false));
createIcon('tab-cart-active', (ctx) => drawCart(ctx, true));
createIcon('tab-todo', (ctx) => drawTodo(ctx, false));
createIcon('tab-todo-active', (ctx) => drawTodo(ctx, true));
createIcon('tab-calendar', (ctx) => drawCalendar(ctx, false));
createIcon('tab-calendar-active', (ctx) => drawCalendar(ctx, true));
createIcon('tab-user', (ctx) => drawUser(ctx, false));
createIcon('tab-user-active', (ctx) => drawUser(ctx, true));
createIcon('default-avatar', (ctx) => drawDefaultAvatar(ctx));

console.log('\nAll icons generated successfully!');