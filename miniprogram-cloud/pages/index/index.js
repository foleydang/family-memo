// pages/index/index.js - 云开发版本
const app = getApp()

// 订阅消息模板ID（需要在微信小程序后台申请）
const SCHEDULE_REMIND_TEMPLATE_ID = 'bDHCtdW_8crvYVMvD1p0fo_u1vIR0zuKTSPGr8BW1dU'
const TODO_ASSIGN_TEMPLATE_ID = 'YOUR_TODO_TEMPLATE_ID'  // 需要替换为实际的模板ID

Page({
  data: {
    userInfo: null,
    familyInfo: null,
    members: [],
    greeting: '',
    todayStr: '',
    loading: true,
    dataReady: false,
    subscribed: false  // 是否已订阅
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    if (this.data.dataReady) {
      this.refreshData()
      this.checkTodayRemind()
    }
    // 检查订阅状态
    this.checkSubscribeStatus()
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

    await this.waitForDataReady()
    
    this.setData({ 
      loading: false,
      dataReady: true 
    })
    
    this.refreshData()
  },

  async waitForDataReady() {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (app.globalData.userInfo) {
          resolve()
        } else {
          const timer = setInterval(() => {
            if (app.globalData.userInfo) {
              clearInterval(timer)
              setTimeout(() => resolve(), 500)
            }
          }, 100)
          setTimeout(() => {
            clearInterval(timer)
            resolve()
          }, 5000)
        }
      }
      checkReady()
    })
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

  async checkTodayRemind() {
    if (!app.globalData.userInfo || !app.globalData.familyInfo) return
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'schedule',
        data: { action: 'getTodayRemind' }
      })
      
      if (res.result.success && res.result.data.length > 0) {
        await new Promise((resolve) => {
          wx.requestSubscribeMessage({
            tmplIds: [SCHEDULE_REMIND_TEMPLATE_ID],
            success: (res) => resolve(res[SCHEDULE_REMIND_TEMPLATE_ID] === 'accept'),
            fail: () => resolve(false)
          })
        })
        
        await wx.cloud.callFunction({
          name: 'sendRemind',
          data: { action: 'checkToday' }
        })
      }
    } catch (err) {
      console.error('检查提醒失败', err)
    }
  },

  // 检查订阅状态（本地存储）
  checkSubscribeStatus() {
    const subscribed = wx.getStorageSync('subscribeTodo') || false
    this.setData({ subscribed })
  },

  // 订阅待办提醒
  subscribeNotify() {
    if (!TODO_ASSIGN_TEMPLATE_ID || TODO_ASSIGN_TEMPLATE_ID === 'YOUR_TODO_TEMPLATE_ID') {
      wx.showToast({ 
        title: '请先配置模板ID', 
        icon: 'none',
        duration: 2000
      })
      return
    }

    wx.requestSubscribeMessage({
      tmplIds: [TODO_ASSIGN_TEMPLATE_ID],
      success: (res) => {
        if (res[TODO_ASSIGN_TEMPLATE_ID] === 'accept') {
          wx.showToast({ title: '订阅成功', icon: 'success' })
          wx.setStorageSync('subscribeTodo', true)
          this.setData({ subscribed: true })
        } else if (res[TODO_ASSIGN_TEMPLATE_ID] === 'reject') {
          wx.showToast({ title: '您拒绝了订阅', icon: 'none' })
        }
      },
      fail: (err) => {
        console.error('订阅失败:', err)
        wx.showToast({ title: '订阅失败', icon: 'none' })
      }
    })
  },

  handleLogin() {
    wx.showLoading({ title: '登录中' })
    app.login().then(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      wx.hideLoading()
      this.setData({ 
        userInfo: app.globalData.userInfo,
        familyInfo: app.globalData.familyInfo,
        loading: false,
        dataReady: true
      })
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: '登录失败', icon: 'none' })
    })
  },

  handleCreateFamily() {
    wx.navigateTo({ url: '/pages/family/index' })
  },

  handleJoinFamily() {
    wx.navigateTo({ url: '/pages/family/index' })
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
    wx.navigateTo({ url: '/pages/family/index' })
  }
})
