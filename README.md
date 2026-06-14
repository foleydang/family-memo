# 家庭备忘录 🏡💕

> 一个用于家庭协作的微信小程序，支持购物清单、待办事项、日程安排等功能。
> 服务端基于 [yanten-api](https://github.com/foleydang/yanten-api)，采用 Node.js + Express + SQLite 架构。

## 功能模块

- 🏠 **首页** — 今日概览、家庭信息、与我相关
- 🛒 **购物清单** — 记录要买的东西，支持勾选完成
- ✅ **待办事项** — 家庭公共事务，支持优先级和指派
- 📅 **日程安排** — 关键日程、生日、纪念日等
- 👥 **家庭管理** — 创建/加入家庭、邀请成员
- 👤 **我的** — 个人信息、统计数据

## 项目结构

```
family-memo/
├── app.js              # 全局逻辑（登录、请求封装、401自动重登）
├── app.json            # 全局配置（页面路由、tabBar）
├── app.wxss            # 全局样式
├── project.config.json # 微信开发者工具配置
├── sitemap.json        # 微信搜索配置
├── pages/
│   ├── index/          # 首页
│   ├── shopping/       # 购物清单
│   ├── todo/           # 待办事项
│   ├── schedule/       # 日程安排
│   ├── family/         # 家庭管理
│   ├── user/           # 我的
│   ├── profile-edit/   # 编辑资料（头像+昵称）
│   ├── announcement/   # 家庭公告
│   ├── feedback/       # 反馈
│   ├── export/         # 数据导出
│   ├── remind-settings/ # 提醒设置
│   └── my-records/     # 我的记录
└── images/             # 图标资源
```

## 架构说明

小程序通过 HTTPS API 与远端服务器通信，不再使用微信云开发：

```
┌──────────────┐         HTTPS          ┌──────────────────┐
│  微信小程序   │ ──────────────────────→ │  yanten-api      │
│  (前端)      │ ←────────────────────── │  (Node.js 服务)  │
└──────────────┘         JSON            │  Express + SQLite │
                                         │  api.yanten.top   │
                                         └──────────────────┘
```

- **前端**：本仓库，纯微信小程序 WXML/WXSS/JS
- **后端**：[yanten-api](https://github.com/foleydang/yanten-api)
- **数据库**：SQLite（服务端托管）

## 开发指南

### 环境要求

- 微信开发者工具（最新版）
- Node.js 18+（服务端）

### 前端配置

`app.js` 中的 API 地址：

```js
globalData: {
  baseUrl: 'https://api.yanten.top/api',
}
```

本地开发时改为你的服务器地址。

### 服务端配置

参见 [yanten-api](https://github.com/foleydang/yanten-api) 仓库。

### 微信小程序后台配置

**服务器域名**（开发管理 → 开发设置）：

| 类型 | 域名 |
|------|------|
| request 合法域名 | `https://api.yanten.top` |
| uploadFile 合法域名 | `https://api.yanten.top` |
| downloadFile 合法域名 | `https://api.yanten.top` |

### tabBar 图标

app.json 中配置了以下 tabBar 图标：

| 图标 | 文件名 | 说明 |
|------|--------|------|
| 首页 | tab-home.png / tab-home-active.png |
| 购物 | tab-cart.png / tab-cart-active.png |
| 待办 | tab-todo.png / tab-tab-todo-active.png |
| 日程 | tab-calendar.png / tab-calendar-active.png |
| 我的 | tab-user.png / tab-user-active.png |

图标规格：81×81 px，PNG 格式，选中态建议使用主题色 #FF85A2。

## 开发进度

| 模块 | 小程序端 | 服务端 | 状态 |
|------|----------|--------|------|
| 登录认证 | ✅ | ✅ | 完成 |
| 家庭管理 | ✅ | ✅ | 完成 |
| 购物清单 | ✅ | ✅ | 完成 |
| 待办事项 | ✅ | ✅ | 完成 |
| 日程安排 | ✅ | ✅ | 完成 |
| 公告 | ✅ | ✅ | 完成 |
| 提醒推送 | ⏳ | ⏳ | 待开发 |

---

*最后更新：2026-06-15*
