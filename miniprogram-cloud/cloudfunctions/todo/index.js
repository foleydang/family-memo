const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 备忘录任务提醒模板ID
const TODO_ASSIGN_TEMPLATE_ID = 'tjimAHRkF_Go-ELPIr3Vqq1K3QB03bCzauINTe6Dqc0'

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
      return await updateItem(openid, data)
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
      await sendAssignNotify(data.assigneeId, data.title, data.description, creatorName)
    }
    
    return { success: true, data: { _id: res._id } }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function updateItem(openid, data) {
  try {
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
      const userRes = await db.collection('users').where({ openid }).get()
      const creatorName = userRes.data[0]?.nickname || '成员'
      await sendAssignNotify(data.assigneeId, data.title, data.description, creatorName)
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
async function sendAssignNotify(assigneeId, todoTitle, todoDesc, creatorName) {
  try {
    // 获取被指派人的 openid
    const assigneeRes = await db.collection('users').doc(assigneeId).get()
    if (!assigneeRes.data || !assigneeRes.data.openid) {
      console.log('找不到被指派人')
      return
    }
    
    const openid = assigneeRes.data.openid
    
    // 字段处理（订阅消息有字数限制）
    // 创建人：最多10个字符
    const creator = creatorName.length > 10 ? creatorName.substring(0, 10) : creatorName
    // 任务名称：最多20个字符
    const title = todoTitle.length > 20 ? todoTitle.substring(0, 20) : todoTitle
    // 备注：最多20个字符，如果没有备注则显示"无"
    const remark = (todoDesc && todoDesc.length > 0) 
      ? (todoDesc.length > 20 ? todoDesc.substring(0, 20) : todoDesc) 
      : '无'
    
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: openid,
        page: 'pages/todo/index',
        data: {
          name1: { value: creator },      // 创建人
          thing2: { value: title },       // 任务名称
          thing3: { value: remark }       // 备注
        },
        templateId: TODO_ASSIGN_TEMPLATE_ID,
        miniprogramState: 'developer'
      })
      console.log('发送通知成功:', openid)
    } catch (err) {
      console.error('发送订阅消息失败:', err)
    }
  } catch (err) {
    console.error('发送指派通知失败:', err)
  }
}
