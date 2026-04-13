const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const userRes = await db.collection('users').where({
      openid: wxContext.OPENID
    }).get()
    
    let user
    
    if (userRes.data.length === 0) {
      const createTime = db.serverDate()
      const newUser = {
        openid: wxContext.OPENID,
        nickname: '新成员',
        avatarUrl: '',  // 只存永久 CDN URL
        createTime: createTime
      }
      
      const addRes = await db.collection('users').add({
        data: newUser
      })
      
      user = {
        _id: addRes._id,
        ...newUser
      }
    } else {
      user = userRes.data[0]
    }
    
    return {
      success: true,
      data: {
        userId: user._id,
        openid: user.openid,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl || ''
      },
      message: '登录成功'
    }
  } catch (err) {
    console.error('登录失败:', err)
    return {
      success: false,
      message: '登录失败: ' + err.message
    }
  }
}
