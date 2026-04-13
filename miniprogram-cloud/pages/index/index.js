// pages/index/index.js
const app = getApp()

const TODO_TEMPLATE_ID = 'tjimAHRkF_Go-ELPIr3Vqq1K3QB03bCzauINTe6Dqc0'

Page({
  data: {
    userInfo: null,
    familyInfo: null,
    members: [],
    weekStats: null,
    myTodos: [],
    todaySchedules: [],
    greeting: '',
    todayStr: '',
    loading: true,
    dataReady: false,
    subscribed: false
  },

  onLoad() { this.initPage() },
  onShow() {
    if (this.data.dataReady) this.refreshData()
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
    this.setData({ userInfo: app.globalData.userInfo, familyInfo: app.globalData.familyInfo })
    if (app.globalData.familyInfo) {
      await this.loadMembers()
      await this.loadWeekStats()
      await this.loadMyData()
    }
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

  // 加载本周统计
  async loadWeekStats() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'stats',
        data: { action: 'getFamilyStats', data: { familyId: this.data.familyInfo._id } }
      })
      if (res.result.success) {
        this.setData({ weekStats: res.result.data.weekStats })
      }
    } catch (err) { console.error('加载统计失败', err) }
  },

  // 加载"与我相关"数据
  async loadMyData() {
    const myUserId = app.globalData.userId
    if (!myUserId || !this.data.familyInfo) return

    try {
      // 加载指派给我的待办
      const todoRes = await wx.cloud.callFunction({
        name: 'todo',
        data: { action: 'list', data: { familyId: this.data.familyInfo._id } }
      })
      if (todoRes.result.success) {
        const myTodos = todoRes.result.data
          .filter(t => t.assigneeId === myUserId && t.status !== 'done')
          .slice(0, 5)
        this.setData({ myTodos })
      }

      // 加载今日日程
      const todayStr = this.formatDate(new Date())
      const scheduleRes = await wx.cloud.callFunction({
        name: 'schedule',
        data: { action: 'list', data: { familyId: this.data.familyInfo._id } }
      })
      if (scheduleRes.result.success) {
        const todaySchedules = scheduleRes.result.data
          .filter(s => s.scheduleDate === todayStr)
          .slice(0, 3)
        this.setData({ todaySchedules })
      }
    } catch (err) { console.error('加载我的数据失败', err) }
  },

  formatDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  },

  checkSubscribeStatus() {
    const subscribed = wx.getStorageSync('subscribeTodo') || false
    this.setData({ subscribed })
  },

  subscribeNotify() {
    if (this.data.subscribed) {
      wx.showToast({ title: '您已订阅提醒', icon: 'success' })
      return
    }
    wx.requestSubscribeMessage({
      tmplIds: [TODO_TEMPLATE_ID],
      success: (res) => {
        if (res[TODO_TEMPLATE_ID] === 'accept') {
          wx.showToast({ title: '订阅成功！', icon: 'success' })
          wx.setStorageSync('subscribeTodo', true)
          this.setData({ subscribed: true })
        } else {
          wx.showToast({ title: '您拒绝了订阅', icon: 'none' })
        }
      },
      fail: () => { wx.showToast({ title: '订阅失败', icon: 'none' }) }
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
        loading: false, dataReady: true
      })
    }).catch(() => { wx.hideLoading(); wx.showToast({ title: '登录失败', icon: 'none' }) })
  },

  goToFamily() { wx.navigateTo({ url: '/pages/family/index' }) },
  goToShopping() { wx.switchTab({ url: '/pages/shopping/index' }) },
  goToTodo() { wx.switchTab({ url: '/pages/todo/index' }) },
  goToSchedule() { wx.switchTab({ url: '/pages/schedule/index' }) },
  handleCreateFamily() { wx.navigateTo({ url: '/pages/family/index' }) },
  handleJoinFamily() { wx.navigateTo({ url: '/pages/family/index?action=join' }) }
})
