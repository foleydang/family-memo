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
      return await addAnnouncement(openid, data)
    case 'delete':
      return await deleteAnnouncement(openid, data)
    default:
      return { success: false, message: '未知操作' }
  }
}

// 获取家庭公告列表
async function getList(familyId) {
  try {
    const res = await db.collection('announcements')
      .where({ familyId })
      .orderBy('createTime', 'desc')
      .limit(50)
      .get()
    
    return { success: true, data: res.data }
  } catch (err) {
    console.error('获取公告失败:', err)
    return { success: false, message: err.message }
  }
}

// 发布公告
async function addAnnouncement(openid, data) {
  try {
    // 获取用户信息
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]
    
    // 检查是否是家庭成员
    const memberRes = await db.collection('family_members').where({ 
      familyId: data.familyId,
      userId: user._id 
    }).get()
    
    if (memberRes.data.length === 0) {
      return { success: false, message: '你不是该家庭成员' }
    }
    
    // 创建公告
    const res = await db.collection('announcements').add({
      data: {
        familyId: data.familyId,
        content: data.content.trim(),
        authorId: user._id,
        authorName: user.nickname || '成员',
        authorAvatar: user.avatar || '',
        createTime: db.serverDate()
      }
    })
    
    return { 
      success: true, 
      data: { _id: res._id },
      message: '发布成功' 
    }
  } catch (err) {
    console.error('发布公告失败:', err)
    return { success: false, message: err.message }
  }
}

// 删除公告
async function deleteAnnouncement(openid, data) {
  try {
    // 获取用户信息
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const userId = userRes.data[0]._id
    
    // 获取公告信息
    const announcementRes = await db.collection('announcements').doc(data._id).get()
    if (!announcementRes.data) {
      return { success: false, message: '公告不存在' }
    }
    
    const announcement = announcementRes.data
    
    // 检查权限：公告作者或家庭管理员可以删除
    const memberRes = await db.collection('family_members').where({ 
      familyId: announcement.familyId,
      userId: userId 
    }).get()
    
    if (memberRes.data.length === 0) {
      return { success: false, message: '无权限删除' }
    }
    
    const member = memberRes.data[0]
    const isAdmin = member.role === 'admin'
    const isAuthor = announcement.authorId === userId
    
    if (!isAdmin && !isAuthor) {
      return { success: false, message: '只有管理员或公告作者可以删除' }
    }
    
    // 删除公告
    await db.collection('announcements').doc(data._id).remove()
    
    return { success: true, message: '删除成功' }
  } catch (err) {
    console.error('删除公告失败:', err)
    return { success: false, message: err.message }
  }
}
