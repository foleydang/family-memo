// pages/user/index.js
const app = getApp();

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
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
    this.loadStats();
  },

  async loadUserInfo() {
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        familyInfo: app.globalData.familyInfo
      });
    } else {
      try {
        await app.getUserInfo();
        this.setData({
          userInfo: app.globalData.userInfo,
          familyInfo: app.globalData.familyInfo
        });
      } catch (err) {
        console.error('获取用户信息失败', err);
      }
    }
  },

  async loadStats() {
    if (!app.globalData.familyInfo) return;

    try {
      const res = await app.request({
        url: '/user/stats',
        data: { familyId: app.globalData.familyInfo.id }
      });
      this.setData({ stats: res.data });
    } catch (err) {
      console.error('加载统计失败', err);
    }
  },

  // 点击头像，跳转到编辑页面
  handleAvatarClick() {
    if (this.data.userInfo) {
      wx.navigateTo({ url: '/pages/profile-edit/index' });
    }
  },

  // 编辑资料
  goToEditProfile() {
    wx.navigateTo({ url: '/pages/profile-edit/index' });
  },

  handleMenuClick(e) {
    const index = e.currentTarget.dataset.index;
    switch (index) {
      case 0: // 我的记录
        wx.navigateTo({ url: '/pages/my-records/index' });
        break;
      case 1: // 提醒设置
        wx.navigateTo({ url: '/pages/remind-settings/index' });
        break;
      case 2: // 数据导出
        wx.navigateTo({ url: '/pages/export/index' });
        break;
      case 3: // 帮助反馈
        wx.navigateTo({ url: '/pages/feedback/index' });
        break;
    }
  },

  handleLogin() {
    wx.showLoading({ title: '登录中' });
    app.login().then(() => {
      wx.hideLoading();
      this.setData({ userInfo: app.globalData.userInfo });
      this.loadStats();
    }).catch(err => {
      wx.hideLoading();
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
        stats: { shoppingCount: 0, todoCount: 0, scheduleCount: 0 }
      });
      wx.showToast({ title: '已退出登录', icon: 'success' });
    }
  },

  goToFamily() {
    wx.navigateTo({ url: '/pages/family/index' });
  },

  goToShopping() {
    wx.switchTab({ url: '/pages/shopping/index' });
  },

  goToTodo() {
    wx.switchTab({ url: '/pages/todo/index' });
  },

  goToSchedule() {
    wx.switchTab({ url: '/pages/schedule/index' });
  },

  onShareAppMessage() {
    const familyInfo = this.data.familyInfo;
    if (familyInfo) {
      return {
        title: `邀请你加入「${familyInfo.name}」`,
        path: `/pages/family/index?action=join`
      };
    }
    return {
      title: '家庭备忘录 - 记录家庭生活的点滴',
      path: '/pages/index/index'
    };
  }
});
