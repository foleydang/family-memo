const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, data } = event

  switch (action) {
    case 'list':
      return await getList(data.familyId, data.startDate, data.endDate)
    case 'add':
      return await addItem(openid, data)
    case 'update':
      return await updateItem(data)
    case 'delete':
      return await deleteItem(data)
    default:
      return { success: false, message: '未知操作' }
  }
}

async function getList(familyId, startDate, endDate) {
  try {
    let query = db.collection('schedules').where({ familyId })
    
    if (startDate && endDate) {
      query = query.where({
        scheduleDate: db.command.gte(startDate).and(db.command.lte(endDate))
      })
    }
    
    const res = await query.orderBy('scheduleDate', 'asc').get()
    return { success: true, data: res.data }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function addItem(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    const userId = userRes.data[0]._id
    
    const res = await db.collection('schedules').add({
      data: {
        familyId: data.familyId,
        title: data.title,
        description: data.description || '',
        scheduleDate: data.scheduleDate,
        scheduleTime: data.scheduleTime || null,
        type: data.type || 'other',
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
    await db.collection('schedules').doc(data._id).update({
      data: {
        title: data.title,
        description: data.description,
        scheduleDate: data.scheduleDate,
        scheduleTime: data.scheduleTime,
        type: data.type
      }
    })
    return { success: true }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function deleteItem(data) {
  try {
    await db.collection('schedules').doc(data._id).remove()
    return { success: true }
  } catch (err) {
    return { success: false, message: err.message }
  }
}
