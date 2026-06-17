// pages/index/index.js - 服务器版本
const app = getApp()

Page({
  data: {
    userInfo: null,
    familyInfo: null,
    members: [],
    myTodos: [],
    todaySchedules: [],
    countdowns: [],
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

    if (!app.globalData.token) {
      try {
        await app.login()
      } catch (err) { console.error('登录失败', err) }
    }

    this.setData({ loading: false })
    this.refreshData()
  },

  async refreshData() {
    if (!app.globalData.token) {
      this.setData({
        userInfo: null, familyInfo: null, members: [],
        myTodos: [], todaySchedules: [], countdowns: [],
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
      this.setData({ userInfo: null, familyInfo: null });
    }
  },

  async loadMembers() {
    try {
      const res = await app.request({
        url: `/family/${this.data.familyInfo.id}`
      })
      const members = (res.data.members || []).map(m => ({
        ...m,
        avatarUrl: m.avatar || m.avatarUrl
      }));
      this.setData({ members })
    } catch (err) { console.error('加载成员失败', err) }
  },

  async loadMyData() {
    const myUserId = app.globalData.userInfo?.id
    if (!myUserId || !this.data.familyInfo) return
    const familyId = this.data.familyInfo.id
    const todayStr = this.formatDate(new Date())

    try {
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
      
      // 计算重要日期倒计时
      const countdowns = this.calcCountdowns(scheduleRes.data || [])
      
      this.setData({ myTodos, todaySchedules, countdowns })
    } catch (err) { console.error('加载我的数据失败', err) }
  },

  // 从日程数据中计算倒计时
  calcCountdowns(schedules) {
    const now = new Date()
    const currentYear = now.getFullYear()
    const typeEmoji = { birthday: '🎂', anniversary: '💕', trip: '✈️', appointment: '📋', schedule: '📅', other: '📌' }
    const typeName = { birthday: '生日', anniversary: '纪念日', trip: '出行', appointment: '预约', schedule: '日程', other: '重要日期' }
    
    const countdowns = []
    
    schedules.forEach(s => {
      const type = s.type || 'other'
      const recurring = s.recurring || s.repeat_type || 'none'
      
      // 循环日程(yearly) 或者 生日/纪念日/出行类型 都算倒计时
      const isImportant = ['birthday', 'anniversary', 'trip'].includes(type)
      const isYearly = recurring === 'yearly'
      if (!isImportant && !isYearly) return
      
      let targetDate
      
      if (isYearly || isImportant) {
        const origDate = new Date(s.schedule_date)
        const origMonth = origDate.getMonth()
        const origDay = origDate.getDate()
        
        targetDate = new Date(currentYear, origMonth, origDay)
        if (targetDate < now) {
          targetDate = new Date(currentYear + 1, origMonth, origDay)
        }
      } else {
        targetDate = new Date(s.schedule_date)
        if (targetDate < now) return
      }
      
      const diffDays = Math.ceil((targetDate - now) / 86400000)
      
      if (diffDays <= 60) {
        countdowns.push({
          id: s.id,
          title: s.title,
          type,
          emoji: typeEmoji[type] || '📌',
          typeName: typeName[type] || '重要日期',
          days: diffDays,
          dateStr: `${targetDate.getMonth() + 1}月${targetDate.getDate()}日`,
          isToday: diffDays === 0
        })
      }
    })
    
    countdowns.sort((a, b) => a.days - b.days)
    return countdowns.slice(0, 5)
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
  goToWish() { wx.navigateTo({ url: '/pages/wish/index' }) },

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
        userInfo: null, familyInfo: null, members: [],
        myTodos: [], todaySchedules: [], countdowns: [],
        loading: false
      });
      wx.showToast({ title: '已退出登录', icon: 'success' });
    }
  }
})
