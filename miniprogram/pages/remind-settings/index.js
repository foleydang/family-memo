// pages/remind-settings/index.js
const app = getApp();

Page({
  data: {
    settings: {
      shoppingRemind: true,
      todoRemind: true,
      scheduleRemind: true,
      advanceDays: 1
    },
    remindOptions: ['提前1天', '提前3天', '提前7天']
  },

  onLoad() {
    this.loadSettings();
  },

  loadSettings() {
    const settings = wx.getStorageSync('remindSettings') || this.data.settings;
    this.setData({ settings });
  },

  saveSettings() {
    wx.setStorageSync('remindSettings', this.data.settings);
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  toggleShopping() {
    this.setData({
      'settings.shoppingRemind': !this.data.settings.shoppingRemind
    });
    this.saveSettings();
  },

  toggleTodo() {
    this.setData({
      'settings.todoRemind': !this.data.settings.todoRemind
    });
    this.saveSettings();
  },

  toggleSchedule() {
    this.setData({
      'settings.scheduleRemind': !this.data.settings.scheduleRemind
    });
    this.saveSettings();
  },

  changeAdvanceDays(e) {
    const index = e.detail.value;
    const days = [1, 3, 7][index];
    this.setData({
      'settings.advanceDays': days
    });
    this.saveSettings();
  },

  requestSubscribe() {
    // 请求订阅消息权限
    wx.requestSubscribeMessage({
      tmplIds: ['模板ID'], // 需要在微信后台申请模板
      success(res) {
        console.log('订阅成功', res);
      },
      fail(err) {
        console.log('订阅失败', err);
        wx.showToast({ 
          title: '订阅功能需要在正式版中使用', 
          icon: 'none' 
        });
      }
    });
  }
});