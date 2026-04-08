# 家庭备忘录小程序

> 一个用于家庭协作的微信小程序，支持购物清单、待办事项、日程安排等功能。

## 功能模块

- **首页** - 今日概览、家庭信息
- **购物清单** - 记录要买的东西，支持勾选完成
- **待办事项** - 家庭公共事务，支持优先级和指派
- **日程安排** - 关键日程、生日、纪念日等
- **家庭管理** - 创建/加入家庭、邀请成员
- **我的** - 个人信息、统计数据

## 项目结构

```
miniprogram/
├── app.js          # 全局逻辑
├── app.json        # 全局配置
├── app.wxss        # 全局样式
├── pages/
│   ├── index/      # 首页
│   ├── shopping/   # 购物清单
│   ├── todo/       # 待办事项
│   ├── schedule/   # 日程安排
│   ├── family/     # 家庭管理
│   └── user/       # 我的
└── images/         # 图标资源（需补充）
```

## 图标资源

⚠️ **需要补充 tabBar 图标**

app.json 中配置了以下 tabBar 图标，请自行准备或使用 iconfont：

| 图标 | 文件名 | 说明 |
|------|--------|------|
| 首页 | tab-home.png / tab-home-active.png | 未选中/选中 |
| 购物 | tab-cart.png / tab-cart-active.png | 未选中/选中 |
| 待办 | tab-todo.png / tab-todo-active.png | 未选中/选中 |
| 日程 | tab-calendar.png / tab-calendar-active.png | 未选中/选中 |
| 我的 | tab-user.png / tab-user-active.png | 未选中/选中 |

**图标规格：**
- 尺寸：81×81 px（推荐）
- 格式：PNG
- 选中态建议使用主题色 #FF85A2

**推荐图标来源：**
- [iconfont](https://www.iconfont.cn/)
- [Flaticon](https://www.flaticon.com/)

## 服务端

服务端代码在 `server/` 目录，基于 Node.js + Express。

### 启动服务端

```bash
cd server
npm install
npm start
```

### 配置

修改 `miniprogram/app.js` 中的 `baseUrl`：

```js
globalData: {
  baseUrl: 'http://YOUR_SERVER_IP:3000/api'
}
```

## 开发进度

| 模块 | 小程序端 | 服务端 | 状态 |
|------|----------|--------|------|
| 登录认证 | ✅ | ✅ | 完成 |
| 家庭管理 | ✅ | ✅ | 完成 |
| 购物清单 | ✅ | ✅ | 完成 |
| 待办事项 | ✅ | ✅ | 完成 |
| 日程安排 | ✅ | ✅ | 完成 |
| 提醒推送 | ⏳ | ⏳ | 待开发 |

---

*最后更新：2026-04-08*