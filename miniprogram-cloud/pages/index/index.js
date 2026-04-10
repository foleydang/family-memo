// pages/index/index.js - 云开发版本
const app = getApp()

Page({
  data: {
    userInfo: null,
    familyInfo: null,
    members: [],
    greeting: '',
    todayStr: ''
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async initPage() {
    // 设置问候语
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

    // 等待登录完成
    if (!app.globalData.userInfo) {
      await app.login()
    }

    this.refreshData()
  },

  async refreshData() {
    this.setData({
      userInfo: app.globalData.userInfo,
      familyInfo: app.globalData.familyInfo
    })

    if (app.globalData.familyInfo) {
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

  handleLogin() {
    wx.showLoading({ title: '登录中' })
    app.login().then(() => {
      wx.hideLoading()
      this.setData({ userInfo: app.globalData.userInfo })
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
  },

  goToAnnouncement() {
    wx.navigateTo({ url: '/pages/announcement/index' })
  }
})
