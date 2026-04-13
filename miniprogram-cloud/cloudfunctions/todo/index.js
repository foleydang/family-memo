const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
    
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
        assigneeId: data.assigneeId,
        updateTime: db.serverDate()
      }
    })
    
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
        updateTime: db.serverDate(),
        doneTime: newStatus === 'done' ? db.serverDate() : null
      }
    })
    return { success: true, data: { status: newStatus } }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function sendAssignNotify(assigneeId, todoTitle, todoDesc, creatorName) {
  try {
    const assigneeRes = await db.collection('users').doc(assigneeId).get()
    if (!assigneeRes.data || !assigneeRes.data.openid) return
    
    const openid = assigneeRes.data.openid
    
    const creator = creatorName.length > 20 ? creatorName.substring(0, 20) : creatorName
    const title = todoTitle.length > 20 ? todoTitle.substring(0, 20) : todoTitle
    const remark = (todoDesc && todoDesc.trim().length > 0) 
      ? (todoDesc.length > 20 ? todoDesc.substring(0, 20) : todoDesc) 
      : '无'
    
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: openid,
        page: 'pages/todo/index',
        data: {
          thing6: { value: creator },
          thing1: { value: title },
          thing10: { value: remark }
        },
        templateId: TODO_ASSIGN_TEMPLATE_ID,
        miniprogramState: 'developer'
      })
      console.log('发送待办通知成功:', openid)
    } catch (err) {
      console.error('发送订阅消息失败:', err)
    }
  } catch (err) {
    console.error('发送指派通知失败:', err)
  }
}
