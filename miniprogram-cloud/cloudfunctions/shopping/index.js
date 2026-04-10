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
      return await toggleItem(openid, data)
    default:
      return { success: false, message: '未知操作' }
  }
}

async function getList(familyId) {
  try {
    const res = await db.collection('shopping')
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
    
    const res = await db.collection('shopping').add({
      data: {
        familyId: data.familyId,
        title: data.title,
        category: data.category || 'food',
        quantity: data.quantity || 1,
        unit: data.unit || '个',
        priority: data.priority || 0,
        status: 'pending',
        createdBy: userId,
        createTime: db.serverDate()
      }
    })
    return { success: true, data: { _id: res._id } }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function updateItem(data) {
  try {
    await db.collection('shopping').doc(data._id).update({
      data: {
        title: data.title,
        category: data.category,
        quantity: data.quantity,
        unit: data.unit,
        priority: data.priority || 0
      }
    })
    return { success: true }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function deleteItem(data) {
  try {
    await db.collection('shopping').doc(data._id).remove()
    return { success: true }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function toggleItem(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    const userId = userRes.data[0]?._id
    
    const item = await db.collection('shopping').doc(data._id).get()
    const newStatus = item.data.status === 'done' ? 'pending' : 'done'
    
    await db.collection('shopping').doc(data._id).update({
      data: {
        status: newStatus,
        doneBy: newStatus === 'done' ? userId : null,
        doneTime: newStatus === 'done' ? db.serverDate() : null
      }
    })
    return { success: true, data: { status: newStatus } }
  } catch (err) {
    return { success: false, message: err.message }
  }
}
