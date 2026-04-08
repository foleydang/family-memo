// app.js
App({
  globalData: {
    userInfo: null,
    familyInfo: null,
    token: null,
    baseUrl: 'https://api.yanten.top/api'
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
            // 优先使用 familyInfo，否则从 families 数组获取
            if (res.data.data.familyInfo) {
              this.globalData.familyInfo = res.data.data.familyInfo;
            } else if (res.data.data.families && res.data.data.families.length > 0) {
              this.globalData.familyInfo = res.data.data.families[0];
            } else {
              this.globalData.familyInfo = null;
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
            // 尝试微信登录
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
                  // 微信登录失败，尝试测试登录
                  this.devLogin().then(resolve).catch(reject);
                }
              },
              fail: () => {
                // 网络失败，尝试测试登录
                this.devLogin().then(resolve).catch(reject);
              }
            });
          } else {
            // 没有 code，尝试测试登录
            this.devLogin().then(resolve).catch(reject);
          }
        },
        fail: () => {
          // 登录失败，尝试测试登录
          this.devLogin().then(resolve).catch(reject);
        }
      });
    });
  },

  // 测试登录（开发环境）
  devLogin() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.baseUrl}/auth/dev-login`,
        method: 'POST',
        data: {},
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