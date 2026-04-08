// app.js
App({
  globalData: {
    userInfo: null,
    familyInfo: null,
    token: null,
    baseUrl: 'http://YOUR_SERVER_IP:3000/api' // 替换为你的服务器地址
  },

  onLaunch() {
    // 检查登录状态
    this.checkLogin();
  },

  // 检查登录状态
  checkLogin() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      this.getUserInfo();
    }
  },

  // 获取用户信息
  getUserInfo() {
    return new Promise((resolve, reject) => {
      if (!this.globalData.token) {
        reject('未登录');
        return;
      }

      wx.request({
        url: `${this.globalData.baseUrl}/auth/user`,
        header: {
          'Authorization': `Bearer ${this.globalData.token}`
        },
        success: (res) => {
          if (res.data.success) {
            this.globalData.userInfo = res.data.data;
            if (res.data.data.families && res.data.data.families.length > 0) {
              this.globalData.familyInfo = res.data.data.families[0];
            }
            resolve(res.data.data);
          } else {
            this.logout();
            reject(res.data.message);
          }
        },
        fail: reject
      });
    });
  },

  // 登录
  login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            wx.request({
              url: `${this.globalData.baseUrl}/auth/login`,
              method: 'POST',
              data: { code: res.code },
              success: (response) => {
                if (response.data.success) {
                  const { token, user } = response.data.data;
                  this.globalData.token = token;
                  this.globalData.userInfo = user;
                  wx.setStorageSync('token', token);
                  resolve(response.data);
                } else {
                  reject(response.data.message);
                }
              },
              fail: reject
            });
          } else {
            reject('登录失败');
          }
        },
        fail: reject
      });
    });
  },

  // 退出登录
  logout() {
    this.globalData.token = null;
    this.globalData.userInfo = null;
    this.globalData.familyInfo = null;
    wx.removeStorageSync('token');
  },

  // 封装请求方法
  request(options) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.baseUrl}${options.url}`,
        method: options.method || 'GET',
        data: options.data,
        header: {
          'Authorization': `Bearer ${this.globalData.token}`,
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.data.success) {
            resolve(res.data);
          } else {
            wx.showToast({
              title: res.data.message || '请求失败',
              icon: 'none'
            });
            reject(res.data);
          }
        },
        fail: reject
      });
    });
  }
});