const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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
    default:
      return { success: false, message: '未知操作' }
  }
}

// 获取我的家庭
async function getMyFamily(openid) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const userId = userRes.data[0]._id
    
    const memberRes = await db.collection('family_members')
      .where({ userId })
      .get()
    
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

// 创建家庭
async function createFamily(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const userId = userRes.data[0]._id
    
    // 生成邀请码
    const inviteCode = generateInviteCode()
    
    // 创建家庭
    const familyRes = await db.collection('families').add({
      data: {
        name: data.name,
        inviteCode: inviteCode,
        createTime: db.serverDate(),
        createdBy: userId
      }
    })
    
    // 添加创建者为成员
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

// 加入家庭
async function joinFamily(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const userId = userRes.data[0]._id
    
    const familyRes = await db.collection('families')
      .where({ inviteCode: data.inviteCode })
      .get()
    
    if (familyRes.data.length === 0) {
      return { success: false, message: '邀请码无效' }
    }
    
    const family = familyRes.data[0]
    
    // 检查是否已是成员
    const memberRes = await db.collection('family_members')
      .where({ familyId: family._id, userId })
      .get()
    
    if (memberRes.data.length > 0) {
      return { success: false, message: '你已经是家庭成员了' }
    }
    
    // 添加成员
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

// 获取家庭成员
async function getMembers(data) {
  try {
    const { familyId } = data
    
    // 获取成员列表
    const memberRes = await db.collection('family_members')
      .where({ familyId })
      .get()
    
    // 获取成员用户信息
    const members = []
    for (const member of memberRes.data) {
      const userRes = await db.collection('users').doc(member.userId).get()
      if (userRes.data) {
        members.push({
          ...userRes.data,
          role: member.role,
          joinTime: member.joinTime
        })
      }
    }
    
    return { success: true, data: members }
  } catch (err) {
    console.error('获取成员失败:', err)
    return { success: false, message: err.message }
  }
}

// 获取邀请码
async function getInviteCode(openid) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const userId = userRes.data[0]._id
    
    const memberRes = await db.collection('family_members')
      .where({ userId })
      .get()
    
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

// 生成邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
