const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, data } = event

  switch (action) {
    case 'get':
      return await getUser(openid)
    case 'update':
      return await updateUser(openid, data)
    case 'getStats':
      return await getStats(openid, data)
    default:
      return { success: false, message: '未知操作' }
  }
}

async function getUser(openid) {
  try {
    const res = await db.collection('users').where({ openid }).get()
    if (res.data.length > 0) {
      const user = res.data[0]
      
      // 转换云存储头像为临时 URL
      let avatarUrl = user.avatarUrl || ''
      if (avatarUrl && avatarUrl.startsWith('cloud://')) {
        try {
          const urlRes = await cloud.getTempFileURL({ fileList: [avatarUrl] })
          if (urlRes.fileList && urlRes.fileList[0]?.status === 0) {
            avatarUrl = urlRes.fileList[0].tempFileURL
          }
        } catch (err) {
          console.error('转换头像URL失败:', err)
        }
      }
      
      return { 
        success: true, 
        data: {
          userId: user._id,
          openid: user.openid,
          nickname: user.nickname,
          avatarUrl: avatarUrl
        }
      }
    }
    return { success: false, message: '用户不存在' }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function updateUser(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const userId = userRes.data[0]._id
    
    const updateData = {
      nickname: data.nickname,
      updateTime: db.serverDate()
    }
    
    if (data.avatarUrl) {
      updateData.avatarUrl = data.avatarUrl  // 存储 cloud:// 格式
    }
    
    await db.collection('users').doc(userId).update({
      data: updateData
    })
    
    return { success: true, message: '更新成功' }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function getStats(openid, data) {
  try {
    const { familyId } = data
    const userRes = await db.collection('users').where({ openid }).get()
    const userId = userRes.data[0]._id
    
    const [shoppingRes, todoRes, scheduleRes] = await Promise.all([
      db.collection('shopping').where({ familyId, createdBy: userId }).count(),
      db.collection('todos').where({ familyId, createdBy: userId }).count(),
      db.collection('schedules').where({ familyId, createdBy: userId }).count()
    ])
    
    return {
      success: true,
      data: {
        shoppingCount: shoppingRes.total,
        todoCount: todoRes.total,
        scheduleCount: scheduleRes.total
      }
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}
