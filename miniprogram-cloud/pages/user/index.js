// pages/user/index.js - 云开发版本
const app = getApp()

Page({
  data: {
    userInfo: null,
    familyInfo: null,
    stats: {
      shoppingCount: 0,
      todoCount: 0,
      scheduleCount: 0
    },
    menuItems: [
      { icon: '📝', title: '我的记录', desc: '查看我添加的内容' },
      { icon: '🔔', title: '提醒设置', desc: '管理通知提醒' },
      { icon: '📤', title: '数据导出', desc: '导出数据到剪贴板' },
      { icon: '❓', title: '帮助反馈', desc: '使用帮助与问题反馈' }
    ]
  },

  onLoad() {
    this.loadUserInfo()
  },

  onShow() {
    this.loadUserInfo()
    this.loadStats()
  },

  loadUserInfo() {
    this.setData({
      userInfo: app.globalData.userInfo,
      familyInfo: app.globalData.familyInfo
    })
  },

  async loadStats() {
    if (!app.globalData.familyInfo) return
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'getStats',
          data: {
            familyId: app.globalData.familyInfo._id
          }
        }
      })
      
      if (res.result.success) {
        this.setData({ stats: res.result.data })
      }
    } catch (err) {
      console.error('加载统计失败', err)
    }
  },

  handleAvatarClick() {
    wx.navigateTo({ url: '/pages/profile-edit/index' })
  },

  goToEditProfile() {
    wx.navigateTo({ url: '/pages/profile-edit/index' })
  },

  handleMenuClick(e) {
    const index = e.currentTarget.dataset.index
    switch (index) {
      case 0:
        wx.navigateTo({ url: '/pages/my-records/index' })
        break
      case 1:
        wx.navigateTo({ url: '/pages/remind-settings/index' })
        break
      case 2:
        wx.navigateTo({ url: '/pages/export/index' })
        break
      case 3:
        wx.navigateTo({ url: '/pages/feedback/index' })
        break
    }
  },

  goToFamily() {
    wx.navigateTo({ url: '/pages/family/index' })
  },

  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出登录后需要重新登录',
      success: (res) => {
        if (res.confirm) {
          // 清除登录状态
          app.logout()
          this.setData({
            userInfo: null,
            familyInfo: null,
            stats: { shoppingCount: 0, todoCount: 0, scheduleCount: 0 }
          })
          // 跳转到首页重新登录
          wx.switchTab({ url: '/pages/index/index' })
        }
      }
    })
  }
})
