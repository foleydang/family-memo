const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, data } = event

  switch (action) {
    case 'getMyFamily':
      return await getMyFamily(openid)
    case 'create':
      return await createFamily(openid, data)
    case 'join':
      return await joinFamily(openid, data)
    case 'getMembers':
      return await getMembers(data)
    case 'getInviteCode':
      return await getInviteCode(openid)
    case 'dissolve':
      return await dissolveFamily(openid)
    default:
      return { success: false, message: '未知操作' }
  }
}

async function getMyFamily(openid) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const userId = userRes.data[0]._id
    
    const memberRes = await db.collection('family_members').where({ userId }).get()
    
    if (memberRes.data.length === 0) {
      return { success: true, data: null }
    }
    
    const familyId = memberRes.data[0].familyId
    const familyRes = await db.collection('families').doc(familyId).get()
    
    return { success: true, data: familyRes.data }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function createFamily(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const userId = userRes.data[0]._id
    
    const inviteCode = generateInviteCode()
    
    const familyRes = await db.collection('families').add({
      data: {
        name: data.name,
        inviteCode: inviteCode,
        createTime: db.serverDate(),
        createdBy: userId
      }
    })
    
    await db.collection('family_members').add({
      data: {
        familyId: familyRes._id,
        userId: userId,
        role: 'admin',
        joinTime: db.serverDate()
      }
    })
    
    return { success: true, data: { familyId: familyRes._id, inviteCode } }
  } catch (err) {
    console.error('创建家庭失败:', err)
    return { success: false, message: err.message }
  }
}

async function joinFamily(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const userId = userRes.data[0]._id
    
    const familyRes = await db.collection('families').where({ inviteCode: data.inviteCode }).get()
    
    if (familyRes.data.length === 0) {
      return { success: false, message: '邀请码无效' }
    }
    
    const family = familyRes.data[0]
    
    const memberRes = await db.collection('family_members').where({ familyId: family._id, userId }).get()
    
    if (memberRes.data.length > 0) {
      return { success: false, message: '你已经是家庭成员了' }
    }
    
    await db.collection('family_members').add({
      data: {
        familyId: family._id,
        userId: userId,
        role: 'member',
        joinTime: db.serverDate()
      }
    })
    
    return { success: true, data: { familyId: family._id, name: family.name } }
  } catch (err) {
    console.error('加入家庭失败:', err)
    return { success: false, message: err.message }
  }
}

async function getMembers(data) {
  try {
    const { familyId } = data
    
    const memberRes = await db.collection('family_members').where({ familyId }).get()
    
    const members = []
    const cloudAvatarIds = [] // 需要转换的云存储头像
    
    for (const member of memberRes.data) {
      const userRes = await db.collection('users').doc(member.userId).get()
      if (userRes.data) {
        const userData = {
          ...userRes.data,
          _id: userRes.data._id,
          role: member.role,
          joinTime: member.joinTime
        }
        members.push(userData)
        
        // 收集需要转换的云存储头像
        if (userData.avatarUrl && userData.avatarUrl.startsWith('cloud://')) {
          cloudAvatarIds.push(userData.avatarUrl)
        }
      }
    }
    
    // 批量转换云存储头像为临时链接
    if (cloudAvatarIds.length > 0) {
      try {
        const tempUrlRes = await cloud.getTempFileURL({
          fileList: cloudAvatarIds
        })
        
        // 建立映射关系
        const urlMap = {}
        if (tempUrlRes.fileList) {
          for (const item of tempUrlRes.fileList) {
            if (item.status === 0 && item.tempFileURL) {
              urlMap[item.fileID] = item.tempFileURL
            }
          }
        }
        
        // 替换成员头像 URL
        for (const member of members) {
          if (member.avatarUrl && urlMap[member.avatarUrl]) {
            member.avatarUrl = urlMap[member.avatarUrl]
          }
        }
      } catch (err) {
        console.error('转换头像URL失败:', err)
        // 失败不影响整体返回，头像可能显示不了但不报错
      }
    }
    
    return { success: true, data: members }
  } catch (err) {
    console.error('获取成员失败:', err)
    return { success: false, message: err.message }
  }
}

async function getInviteCode(openid) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const userId = userRes.data[0]._id
    
    const memberRes = await db.collection('family_members').where({ userId }).get()
    
    if (memberRes.data.length === 0) {
      return { success: false, message: '你还没有加入家庭' }
    }
    
    const familyId = memberRes.data[0].familyId
    const familyRes = await db.collection('families').doc(familyId).get()
    
    return { success: true, data: { inviteCode: familyRes.data.inviteCode } }
  } catch (err) {
    console.error('获取邀请码失败:', err)
    return { success: false, message: err.message }
  }
}

// 解散家庭
async function dissolveFamily(openid) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const userId = userRes.data[0]._id
    
    // 获取用户的家庭成员信息
    const memberRes = await db.collection('family_members').where({ userId }).get()
    if (memberRes.data.length === 0) {
      return { success: false, message: '你还没有加入家庭' }
    }
    
    const member = memberRes.data[0]
    
    // 检查是否是管理员
    if (member.role !== 'admin') {
      return { success: false, message: '只有管理员才能解散家庭' }
    }
    
    const familyId = member.familyId
    
    // 删除所有成员
    await db.collection('family_members').where({ familyId }).remove()
    
    // 删除家庭
    await db.collection('families').doc(familyId).remove()
    
    return { success: true, message: '家庭已解散' }
  } catch (err) {
    console.error('解散家庭失败:', err)
    return { success: false, message: err.message }
  }
}

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
