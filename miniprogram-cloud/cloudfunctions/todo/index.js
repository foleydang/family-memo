const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, data } = event

  switch (action) {
    case 'list':
      return await getList(data.familyId)
    case 'add':
      return await addItem(openid, data)
    case 'update':
      return await updateItem(data)
    case 'delete':
      return await deleteItem(data)
    case 'toggle':
      return await toggleItem(data)
    default:
      return { success: false, message: '未知操作' }
  }
}

async function getList(familyId) {
  try {
    const res = await db.collection('todos')
      .where({ familyId })
      .orderBy('createTime', 'desc')
      .get()
    return { success: true, data: res.data }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function addItem(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    const userId = userRes.data[0]?._id
    const creatorName = userRes.data[0]?.nickname || '成员'
    
    const res = await db.collection('todos').add({
      data: {
        familyId: data.familyId,
        title: data.title,
        description: data.description || '',
        dueDate: data.dueDate || null,
        priority: data.priority || 0,
        assigneeId: data.assigneeId || null,
        status: 'pending',
        createdBy: userId,
        createTime: db.serverDate()
      }
    })
    
    // 发送通知给被指派的成员
    if (data.assigneeId && data.sendNotify) {
      await sendAssignNotify(data.assigneeId, data.title, creatorName)
    }
    
    return { success: true, data: { _id: res._id } }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function updateItem(data) {
  try {
    // 获取原来的待办信息
    const oldTodo = await db.collection('todos').doc(data._id).get()
    const oldAssigneeId = oldTodo.data.assigneeId
    
    await db.collection('todos').doc(data._id).update({
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        priority: data.priority,
        assigneeId: data.assigneeId
      }
    })
    
    // 如果指派人变了，发送通知给新指派人
    if (data.assigneeId && data.assigneeId !== oldAssigneeId && data.sendNotify) {
      const userRes = await db.collection('users').where({ openid: cloud.getWXContext().OPENID }).get()
      const creatorName = userRes.data[0]?.nickname || '成员'
      await sendAssignNotify(data.assigneeId, data.title, creatorName)
    }
    
    return { success: true }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function deleteItem(data) {
  try {
    await db.collection('todos').doc(data._id).remove()
    return { success: true }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function toggleItem(data) {
  try {
    const newStatus = data.status || 'done'
    
    await db.collection('todos').doc(data._id).update({
      data: {
        status: newStatus,
        doneTime: newStatus === 'done' ? db.serverDate() : null
      }
    })
    return { success: true, data: { status: newStatus } }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 发送待办指派通知
async function sendAssignNotify(assigneeId, todoTitle, creatorName) {
  try {
    // 获取被指派人的 openid
    const assigneeRes = await db.collection('users').doc(assigneeId).get()
    if (!assigneeRes.data || !assigneeRes.data.openid) {
      console.log('找不到被指派人')
      return
    }
    
    const openid = assigneeRes.data.openid
    
    // 发送订阅消息
    // 注意：需要用户先在小程序中订阅消息模板
    // 模板ID需要在微信小程序后台申请
    // 这里使用一个通用的待办提醒模板
    const TEMPLATE_ID = 'YOUR_TEMPLATE_ID'  // 需要替换为实际的模板ID
    
    // 截取标题，订阅消息有字数限制
    const title = todoTitle.length > 20 ? todoTitle.substring(0, 20) + '...' : todoTitle
    
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: openid,
        page: 'pages/todo/index',
        data: {
          thing1: { value: title },           // 待办内容
          thing2: { value: creatorName },     // 创建人
          time3: { value: formatDate(new Date()) }  // 创建时间
        },
        templateId: TEMPLATE_ID,
        miniprogramState: 'developer'
      })
      console.log('发送通知成功')
    } catch (err) {
      console.error('发送订阅消息失败:', err)
      // 不影响主流程，只是通知失败
    }
  } catch (err) {
    console.error('发送指派通知失败:', err)
  }
}

function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}
