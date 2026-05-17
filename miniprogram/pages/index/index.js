// pages/index/index.js - 服务器版本
const app = getApp()

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
    // 如果没有 token，显示未登录状态
    if (!app.globalData.token) {
      this.setData({
        userInfo: null,
        familyInfo: null,
        members: [],
        myTodos: [],
        todaySchedules: [],
        loading: false
      });
      return;
    }

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
    } catch (err) { 
      console.error('刷新数据失败', err);
      // 获取失败也显示未登录
      this.setData({
        userInfo: null,
        familyInfo: null
      });
    }
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
    const familyId = this.data.familyInfo.id
    const todayStr = this.formatDate(new Date())

    try {
      // 并行加载待办和日程
      const [todoRes, scheduleRes] = await Promise.all([
        app.request({ url: '/todo/list', data: { familyId, status: 'all', assignee: myUserId } }),
        app.request({ url: '/schedule/list', data: { familyId } })
      ])

      const myTodos = (todoRes.data.all || [])
        .filter(t => t.assignee_id === myUserId && t.status !== 'done')
        .slice(0, 5)
      
      const todaySchedules = (scheduleRes.data || [])
        .filter(s => s.schedule_date === todayStr)
        .slice(0, 3)
      
      this.setData({ myTodos, todaySchedules })
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
    wx.switchTab({ url: '/pages/todo/index' })
  },

  goToFamily() { wx.navigateTo({ url: '/pages/family/index' }) },
  goToShopping() { wx.switchTab({ url: '/pages/shopping/index' }) },
  goToTodo() { wx.switchTab({ url: '/pages/todo/index' }) },
  goToSchedule() { wx.switchTab({ url: '/pages/schedule/index' }) },

  handleLogin() {
    wx.showLoading({ title: '登录中' });
    app.login().then(() => {
      wx.hideLoading();
      this.refreshData();
      wx.showToast({ title: '登录成功', icon: 'success' });
    }).catch(err => {
      wx.hideLoading();
      console.error('登录失败:', err);
      wx.showToast({ title: '登录失败', icon: 'none' });
    });
  },

  async handleLogout() {
    const res = await wx.showModal({
      title: '确认退出',
      content: '退出登录后需要重新登录'
    });

    if (res.confirm) {
      app.logout();
      this.setData({
        userInfo: null,
        familyInfo: null,
        members: [],
        myTodos: [],
        todaySchedules: [],
        loading: false
      });
      wx.showToast({ title: '已退出登录', icon: 'success' });
    }
  }
})
