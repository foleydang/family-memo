const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const TEMPLATE_ID = 'bDHCtdW_8crvYVMvD1p0fo_u1vIR0zuKTSPGr8BW1dU'

exports.main = async (event, context) => {
  const { action } = event

  switch (action) {
    case 'checkToday':
      return await checkAndSendTodayRemind()
    default:
      return { success: false, message: '未知操作' }
  }
}

// 检查并发送今日日程提醒
async function checkAndSendTodayRemind() {
  try {
    // 获取今天的日期
    const today = new Date()
    const todayStr = formatDate(today)
    
    // 查询今天有日程且设置了提醒的记录
    const schedulesRes = await db.collection('schedules')
      .where({
        scheduleDate: todayStr,
        remind: db.command.gt(0) // remind > 0 表示需要提醒
      })
      .get()
    
    if (schedulesRes.data.length === 0) {
      return { success: true, message: '今日无日程需要提醒', count: 0 }
    }
    
    // 发送提醒
    let successCount = 0
    for (const schedule of schedulesRes.data) {
      try {
        // 获取创建者的openid
        const userRes = await db.collection('users').doc(schedule.createdBy).get()
        if (!userRes.data || !userRes.data.openid) continue
        
        // 构建提醒内容
        const timeStr = schedule.startTime || '全天'
        const content = `${schedule.title}${schedule.description ? ' - ' + schedule.description : ''}`
        
        // 发送订阅消息
        await cloud.openapi.subscribeMessage.send({
          touser: userRes.data.openid,
          page: 'pages/schedule/index',
          data: {
            thing1: { value: content.substring(0, 20) }, // 提醒内容，最多20字
            time2: { value: `${todayStr} ${timeStr}` } // 日程时间
          },
          templateId: TEMPLATE_ID,
          miniprogramState: 'developer' // 开发环境
        })
        
        successCount++
      } catch (err) {
        console.error('发送提醒失败:', err)
      }
    }
    
    return { 
      success: true, 
      message: `已发送 ${successCount} 条提醒`, 
      count: successCount 
    }
  } catch (err) {
    console.error('检查日程失败:', err)
    return { success: false, message: err.message }
  }
}

function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
