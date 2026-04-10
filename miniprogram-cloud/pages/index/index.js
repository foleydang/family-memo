// pages/index/index.js - 云开发版本
const app = getApp()

// 订阅消息模板ID
const SCHEDULE_REMIND_TEMPLATE_ID = 'bDHCtdW_8crvYVMvD1p0fo_u1vIR0zuKTSPGr8BW1dU'

Page({
  data: {
    userInfo: null,
    familyInfo: null,
    members: [],
    greeting: '',
    todayStr: '',
    loading: true
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    this.refreshData()
    // 检查今日日程提醒
    this.checkTodayRemind()
  },

  onPullDownRefresh() {
    this.refreshData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async initPage() {
    const hour = new Date().getHours()
    let greeting = '你好'
    if (hour < 6) greeting = '夜深了'
    else if (hour < 9) greeting = '早上好'
    else if (hour < 12) greeting = '上午好'
    else if (hour < 14) greeting = '中午好'
    else if (hour < 18) greeting = '下午好'
    else if (hour < 22) greeting = '晚上好'
    else greeting = '夜深了'

    const today = new Date()
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']

    this.setData({
      greeting,
      todayStr: `${today.getMonth() + 1}月${today.getDate()}日 星期${weekDays[today.getDay()]}`
    })

    if (!app.globalData.userInfo) {
      app.onLoginReady = () => {
        this.setData({ loading: false })
        this.refreshData()
        this.checkTodayRemind()
      }
    } else {
      this.setData({ loading: false })
      this.refreshData()
    }
  },

  async refreshData() {
    const userInfo = app.globalData.userInfo
    const familyInfo = app.globalData.familyInfo
    
    this.setData({ userInfo, familyInfo })

    if (familyInfo) {
      await this.loadFamilyMembers()
    }
  },

  async loadFamilyMembers() {
    if (!this.data.familyInfo) return
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'family',
        data: {
          action: 'getMembers',
          data: { familyId: this.data.familyInfo._id }
        }
      })
      
      if (res.result.success) {
        this.setData({ members: res.result.data })
      }
    } catch (err) {
      console.error('加载成员失败', err)
    }
  },

  // 检查今日日程提醒
  async checkTodayRemind() {
    if (!app.globalData.userInfo || !app.globalData.familyInfo) return
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'schedule',
        data: {
          action: 'getTodayRemind'
        }
      })
      
      if (res.result.success && res.result.data.length > 0) {
        // 有日程需要提醒，请求订阅并发送
        const schedules = res.result.data
        
        // 请求订阅消息
        const subscribeRes = await new Promise((resolve) => {
          wx.requestSubscribeMessage({
            tmplIds: [SCHEDULE_REMIND_TEMPLATE_ID],
            success: (res) => {
              resolve(res[SCHEDULE_REMIND_TEMPLATE_ID] === 'accept')
            },
            fail: () => resolve(false)
          })
        })
        
        if (subscribeRes) {
          // 发送提醒
          await wx.cloud.callFunction({
            name: 'sendRemind',
            data: { action: 'checkToday' }
          })
        }
      }
    } catch (err) {
      console.error('检查提醒失败', err)
    }
  },

  handleLogin() {
    wx.showLoading({ title: '登录中' })
    app.login().then(() => {
      wx.hideLoading()
      this.setData({ userInfo: app.globalData.userInfo, loading: false })
      this.refreshData()
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: '登录失败', icon: 'none' })
    })
  },

  handleCreateFamily() {
    wx.switchTab({ url: '/pages/family/index' })
  },

  handleJoinFamily() {
    wx.switchTab({ url: '/pages/family/index' })
  },

  goToShopping() {
    wx.switchTab({ url: '/pages/shopping/index' })
  },

  goToTodo() {
    wx.switchTab({ url: '/pages/todo/index' })
  },

  goToSchedule() {
    wx.switchTab({ url: '/pages/schedule/index' })
  },

  goToFamily() {
    wx.switchTab({ url: '/pages/family/index' })
  }
})
