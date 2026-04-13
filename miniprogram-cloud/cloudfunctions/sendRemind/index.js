const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
// 日程提醒模板ID
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
// 模板字段：日程时间(date4)、提醒内容(thing2)
async function checkAndSendTodayRemind() {
  try {
    const today = new Date()
    const todayStr = formatDate(today)
    
    // 查询今天有日程且设置了提醒的记录
    const schedulesRes = await db.collection('schedules')
      .where({
        scheduleDate: todayStr,
        remind: db.command.gt(0)
      })
      .get()
    
    if (schedulesRes.data.length === 0) {
      return { success: true, message: '今日无日程需要提醒', count: 0 }
    }
    
    let successCount = 0
    for (const schedule of schedulesRes.data) {
      try {
        const userRes = await db.collection('users').doc(schedule.createdBy).get()
        if (!userRes.data || !userRes.data.openid) continue
        
        // 日程时间(date4): 格式为 YYYY-MM-DD HH:mm
        const timeStr = schedule.startTime || '全天'
        const scheduleTime = `${todayStr} ${timeStr}`
        
        // 提醒内容(thing2): 最多20个字符
        let content = schedule.title
        if (schedule.description) {
          content = `${schedule.title} - ${schedule.description}`
        }
        const remindContent = content.length > 20 ? content.substring(0, 20) : content
        
        await cloud.openapi.subscribeMessage.send({
          touser: userRes.data.openid,
          page: 'pages/schedule/index',
          data: {
            date4: { value: scheduleTime },    // 日程时间
            thing2: { value: remindContent }   // 提醒内容
          },
          templateId: TEMPLATE_ID,
          miniprogramState: 'developer'
        })
        
        successCount++
      } catch (err) {
        console.error('发送日程提醒失败:', err)
      }
    }
    
    return { 
      success: true, 
      message: `已发送 ${successCount} 条日程提醒`, 
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
