# 小程序迁移指南

## 服务器版本 → 云开发版本

### 前端修改清单

#### 1. app.js 登录逻辑
```javascript
// 服务器版本
await app.login()  // HTTP API 登录

// 云开发版本
await wx.cloud.callFunction({ name: 'login' })
```

#### 2. API调用替换
创建一个适配层 `app.request` → `wx.cloud.callFunction`:

```javascript
// utils/api-adapter.js
async function callAPI(name, action, data) {
  return await wx.cloud.callFunction({
    name: name,
    data: { action, data }
  })
}
```

#### 3. 字段名映射
需要在数据处理时转换字段名：

```javascript
function toCloudFormat(item) {
  return {
    _id: item.id,
    familyId: item.family_id,
    assigneeId: item.assignee_id,
    createTime: item.created_at,
    updateTime: item.updated_at
  }
}
```

### 后端修改清单

#### 1. 创建云函数
每个路由对应一个云函数：

| 路由文件 | 云函数 |
|---------|-------|
| routes/todo.js | cloudfunctions/todo/index.js |
| routes/family.js | cloudfunctions/family/index.js |
| routes/shopping.js | cloudfunctions/shopping/index.js |
| routes/schedule.js | cloudfunctions/schedule/index.js |

#### 2. 数据库迁移
- SQLite → 云开发数据库
- 需要创建对应的集合（collections）

---

## 云开发版本 → 服务器版本

### 前端修改清单

#### 1. API调用替换
```javascript
// 替换所有 wx.cloud.callFunction
wx.cloud.callFunction({ name: 'todo', data: {...} })
→
app.request({ url: '/todo/xxx', method: 'POST/GET', data: {...} })
```

#### 2. 字段名映射
```javascript
function toServerFormat(item) {
  return {
    id: item._id,
    family_id: item.familyId,
    assignee_id: item.assigneeId,
    created_at: item.createTime,
    updated_at: item.updateTime
  }
}
```

### 后端修改清单

#### 1. Express 路由
将云函数逻辑转换为 Express 路由

#### 2. 数据库
- 云开发数据库 → SQLite/MySQL
- 创建对应的表结构

---

## 选择建议

| 场景 | 推荐 |
|------|------|
| 个人开发者、小团队 | 云开发版本（免服务器运维） |
| 需要自定义API、对接其他系统 | 服务器版本 |
| 已有服务器基础设施 | 服务器版本 |
| 快速上线、低成本 | 云开发版本 |

