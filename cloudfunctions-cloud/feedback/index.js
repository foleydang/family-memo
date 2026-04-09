const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, data } = event

  switch (action) {
    case 'add':
      return await addFeedback(openid, data)
    case 'list':
      return await getMyFeedbacks(openid)
    default:
      return { success: false, message: '未知操作' }
  }
}

async function addFeedback(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    const userId = userRes.data[0]._id
    
    const res = await db.collection('feedback').add({
      data: {
        userId: userId,
        type: data.type || 'bug',
        content: data.content,
        contact: data.contact || '',
        images: data.images || [],
        status: 'pending',
        createTime: db.serverDate()
      }
    })
    return { success: true, data: { _id: res._id }, message: '感谢反馈！' }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function getMyFeedbacks(openid) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    const userId = userRes.data[0]._id
    
    const res = await db.collection('feedback')
      .where({ userId })
      .orderBy('createTime', 'desc')
      .get()
    return { success: true, data: res.data }
  } catch (err) {
    return { success: false, message: err.message }
  }
}
