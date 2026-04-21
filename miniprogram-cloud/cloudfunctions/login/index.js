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
        avatarUrl: '',  // 存储 cloud:// 格式或空
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
        avatarUrl: avatarUrl  // 返回可显示的临时 URL
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
