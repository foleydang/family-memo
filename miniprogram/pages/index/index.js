// pages/index/index.js - 服务器版本
const app = getApp()

const TODO_TEMPLATE_ID = 'tjimAHRkF_Go-ELPIr3Vqq1K3QB03bCzauINTe6Dqc0'

Page({
  data: {
    userInfo: null,
    familyInfo: null,
    members: [],
    myTodos: [],
    todaySchedules: [],
    greeting: '',
    todayStr: '',
    loading: true,
    subscribed: false
  },

  onLoad() { this.initPage() },
  onShow() {
    this.refreshData()
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

    // 检查登录
    if (!app.globalData.token) {
      try {
        await app.login()
      } catch (err) { console.error('登录失败', err) }
    }

    this.setData({ loading: false })
    this.refreshData()
  },

  async refreshData() {
    if (!app.globalData.token) return

    try {
      await app.getUserInfo()
      this.setData({
        userInfo: app.globalData.userInfo,
        familyInfo: app.globalData.familyInfo
      })

      if (app.globalData.familyInfo) {
        await this.loadMembers()
        await this.loadMyData()
      }
    } catch (err) { console.error('刷新数据失败', err) }
  },

  async loadMembers() {
    try {
      const res = await app.request({
        url: `/family/${this.data.familyInfo.id}`
      })
      // 映射 avatar 字段
      const members = (res.data.members || []).map(m => ({
        ...m,
        avatarUrl: m.avatar || m.avatarUrl
      }));
      this.setData({ members })
    } catch (err) { console.error('加载成员失败', err) }
  },

  // 加载"与我相关"数据
  async loadMyData() {
    const myUserId = app.globalData.userInfo?.id
    if (!myUserId || !this.data.familyInfo) return

    try {
      // 加载指派给我的待办
      const todoRes = await app.request({
        url: '/todo/list',
        data: { familyId: this.data.familyInfo.id, status: 'all', assignee: myUserId }
      })
      const allTodos = todoRes.data.all || []
      const myTodos = allTodos
        .filter(t => t.assignee_id === myUserId && t.status !== 'done')
        .slice(0, 5)
      this.setData({ myTodos })

      // 加载今日日程
      const todayStr = this.formatDate(new Date())
      const scheduleRes = await app.request({
        url: '/schedule/list',
        data: { familyId: this.data.familyInfo.id }
      })
      const todaySchedules = (scheduleRes.data.list || [])
        .filter(s => s.schedule_date === todayStr)
        .slice(0, 3)
      this.setData({ todaySchedules })
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

  goToFamily() { wx.navigateTo({ url: '/pages/family/index' }) },
  goToShopping() { wx.switchTab({ url: '/pages/shopping/index' }) },
  goToTodo() { wx.switchTab({ url: '/pages/todo/index' }) },
  goToSchedule() { wx.switchTab({ url: '/pages/schedule/index' }) }
})
