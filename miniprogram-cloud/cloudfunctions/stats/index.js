const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { action, data } = event

  switch (action) {
    case 'getFamilyStats':
      return await getFamilyStats(data.familyId)
    default:
      return { success: false, message: '未知操作' }
  }
}

// 获取家庭统计数据
async function getFamilyStats(familyId) {
  try {
    // 获取家庭成员
    const memberRes = await db.collection('family_members').where({ familyId }).get()
    const memberIds = memberRes.data.map(m => m.userId)
    
    // 获取成员详细信息
    const users = []
    for (const memberId of memberIds) {
      const userRes = await db.collection('users').doc(memberId).get()
      if (userRes.data) {
        users.push({
          _id: userRes.data._id,
          nickname: userRes.data.nickname || '成员',
          avatarUrl: userRes.data.avatarUrl || ''
        })
      }
    }
    
    // 统计各成员的数据
    const stats = []
    for (const user of users) {
      // 待办统计
      const todoCreated = await db.collection('todos')
        .where({ familyId, createdBy: user._id }).count()
      const todoDone = await db.collection('todos')
        .where({ familyId, createdBy: user._id, status: 'done' }).count()
      
      // 购物清单统计
      const shoppingCreated = await db.collection('shopping')
        .where({ familyId, createdBy: user._id }).count()
      const shoppingBought = await db.collection('shopping')
        .where({ familyId, createdBy: user._id, bought: true }).count()
      
      // 日程统计
      const scheduleCreated = await db.collection('schedules')
        .where({ familyId, createdBy: user._id }).count()
      
      const todoTotal = todoCreated.total || 0
      const todoDoneCount = todoDone.total || 0
      const todoRate = todoTotal > 0 ? Math.round(todoDoneCount / todoTotal * 100) : 0
      
      stats.push({
        userId: user._id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        todoTotal,
        todoDone: todoDoneCount,
        todoRate,
        shoppingTotal: shoppingCreated.total || 0,
        shoppingBought: shoppingBought.total || 0,
        scheduleTotal: scheduleCreated.total || 0,
        total: todoTotal + (shoppingCreated.total || 0) + (scheduleCreated.total || 0)
      })
    }
    
    // 按总数排序
    stats.sort((a, b) => b.total - a.total)
    
    // 获取本周数据
    const now = new Date()
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    
    const weekTodo = await db.collection('todos')
      .where({ familyId, createTime: db.command.gte(weekStart) }).count()
    const weekShopping = await db.collection('shopping')
      .where({ familyId, createTime: db.command.gte(weekStart) }).count()
    const weekSchedule = await db.collection('schedules')
      .where({ familyId, createTime: db.command.gte(weekStart) }).count()
    
    return {
      success: true,
      data: {
        members: stats,
        weekStats: {
          todo: weekTodo.total || 0,
          shopping: weekShopping.total || 0,
          schedule: weekSchedule.total || 0,
          total: (weekTodo.total || 0) + (weekShopping.total || 0) + (weekSchedule.total || 0)
        }
      }
    }
  } catch (err) {
    console.error('获取统计失败:', err)
    return { success: false, message: err.message }
  }
}
