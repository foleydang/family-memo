// pages/index/index.js - 云开发版本
const app = getApp()

// 订阅消息模板ID
const TODO_ASSIGN_TEMPLATE_ID = 'tjimAHRkF_Go-ELPIr3Vqq1K3QB03bCzauINTe6Dqc0'
const SCHEDULE_TEMPLATE_ID = 'bDHCtdW_8crvYVMvD1p0fo_u1vIR0zuKTSPGr8BW1dU'

Page({
  data: {
    userInfo: null,
    familyInfo: null,
    members: [],
    greeting: '',
    todayStr: '',
    loading: true,
    dataReady: false,
    subscribed: false
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    if (this.data.dataReady) {
      this.refreshData()
    }
    this.checkSubscribeStatus()
  },

  onPullDownRefresh() {
    this.refreshData().then(() => wx.stopPullDownRefresh())
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
    this.setData({ loading: false, dataReady: true })
    this.refreshData()
  },

  async waitForDataReady() {
    return new Promise(resolve => {
      const check = () => {
        if (app.globalData.userInfo) resolve()
        else {
          const timer = setInterval(() => {
            if (app.globalData.userInfo) { clearInterval(timer); resolve() }
          }, 100)
          setTimeout(() => { clearInterval(timer); resolve() }, 5000)
        }
      }
      check()
    })
  },

  async refreshData() {
    this.setData({
      userInfo: app.globalData.userInfo,
      familyInfo: app.globalData.familyInfo
    })
    if (app.globalData.familyInfo) await this.loadMembers()
  },

  async loadMembers() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'family',
        data: { action: 'getMembers', data: { familyId: this.data.familyInfo._id } }
      })
      if (res.result.success) this.setData({ members: res.result.data })
    } catch (err) { console.error('加载成员失败', err) }
  },

  checkSubscribeStatus() {
    const subscribed = wx.getStorageSync('subscribeTodo') || false
    this.setData({ subscribed })
  },

  // 订阅待办提醒
  subscribeNotify() {
    console.log('点击订阅按钮')
    
    // 先检查是否已订阅
    if (this.data.subscribed) {
      wx.showToast({ title: '您已订阅提醒', icon: 'success' })
      return
    }

    wx.showLoading({ title: '请求中...' })
    
    wx.requestSubscribeMessage({
      tmplIds: [TODO_ASSIGN_TEMPLATE_ID],
      success: (res) => {
        wx.hideLoading()
        console.log('订阅结果:', res)
        
        const result = res[TODO_ASSIGN_TEMPLATE_ID]
        if (result === 'accept') {
          wx.showToast({ title: '订阅成功！', icon: 'success' })
          wx.setStorageSync('subscribeTodo', true)
          this.setData({ subscribed: true })
        } else if (result === 'reject') {
          wx.showModal({
            title: '订阅被拒绝',
            content: '您拒绝了订阅消息，将无法收到待办提醒。如需开启，请在小程序设置中允许。',
            showCancel: false
          })
        } else if (result === 'ban') {
          wx.showModal({
            title: '订阅被禁止',
            content: '订阅消息功能被管理员禁止，请联系管理员开启。',
            showCancel: false
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('订阅失败:', err)
        
        // 常见错误提示
        let msg = '订阅失败'
        if (err.errCode === 20004) {
          msg = '用户拒绝授权，请检查小程序设置'
        } else if (err.errMsg && err.errMsg.includes('template')) {
          msg = '消息模板未审核通过，请稍后再试'
        }
        
        wx.showModal({
          title: '订阅失败',
          content: msg + '\n\n错误: ' + (err.errMsg || JSON.stringify(err)),
          showCancel: false
        })
      }
    })
  },

  handleLogin() {
    wx.showLoading({ title: '登录中' })
    app.login().then(async () => {
      await new Promise(r => setTimeout(r, 1000))
      wx.hideLoading()
      this.setData({
        userInfo: app.globalData.userInfo,
        familyInfo: app.globalData.familyInfo,
        loading: false,
        dataReady: true
      })
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '登录失败', icon: 'none' })
    })
  },

  goToFamily() { wx.navigateTo({ url: '/pages/family/index' }) },
  goToShopping() { wx.switchTab({ url: '/pages/shopping/index' }) },
  goToTodo() { wx.switchTab({ url: '/pages/todo/index' }) },
  goToSchedule() { wx.switchTab({ url: '/pages/schedule/index' }) },
  handleCreateFamily() { wx.navigateTo({ url: '/pages/family/index' }) },
  handleJoinFamily() { wx.navigateTo({ url: '/pages/family/index?action=join' }) }
})
