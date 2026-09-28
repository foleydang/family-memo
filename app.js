// app.js
App({
  globalData: {
    userInfo: null,
    familyInfo: null,
    token: null,
    baseUrl: 'https://api.yanten.top/api',
    _refreshPromise: null // token刷新共享Promise（并发401复用）
  },

  onLaunch() {
    this.checkLogin();
  },

  checkLogin() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      this.getUserInfo();
    }
  },

  // 获取用户信息
  async getUserInfo() {
    if (!this.globalData.token) throw new Error('未登录');
    const res = await this._rawRequest({
      url: '/auth/user',
      method: 'GET'
    });
    const data = res.data;
    if (res.data.success) {
      this.globalData.userInfo = data.data;
      if (data.data.familyInfo) {
        this.globalData.familyInfo = data.data.familyInfo;
      } else if (data.data.families && data.data.families.length > 0) {
        this.globalData.familyInfo = data.data.families[0];
      } else {
        this.globalData.familyInfo = null;
      }
      return data.data;
    }
    this.logout();
    throw new Error(data.message);
  },

  // 登录
  async login() {
    const { code } = await wx.login();
    if (!code) throw new Error('获取code失败');
    
    const res = await this._rawRequest({
      url: '/auth/login',
      method: 'POST',
      data: { code }
    });
    
    if (res.data.success) {
      const { token, user } = res.data.data;
      this.globalData.token = token;
      this.globalData.userInfo = user;
      wx.setStorageSync('token', token);
      return res.data;
    }
    throw new Error(res.data.message || '登录失败');
  },

  logout() {
    this.globalData.token = null;
    this.globalData.userInfo = null;
    this.globalData.familyInfo = null;
    wx.removeStorageSync('token');
  },

  // 内部原始请求（不处理401）
  _rawRequest(options) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.baseUrl}${options.url}`,
        method: options.method || 'GET',
        data: options.data,
        header: {
          'Authorization': `Bearer ${this.globalData.token}`,
          'Content-Type': 'application/json'
        },
        success: resolve,
        fail: reject
      });
    });
  },

  // 封装请求方法 - 支持401自动重登
  async request(options) {
    const res = await this._rawRequest(options);

    // 401/token过期 → 自动重新登录后重试
    if (res.statusCode === 401 && !options._isRetry) {
      // 并发请求复用同一个刷新 Promise，避免各自 setTimeout(1000) 后拿旧 token 再次撞 401
      if (!this.globalData._refreshPromise) {
        this.globalData._refreshPromise = (async () => {
          try {
            await this.login();
          } catch (err) {
            this.logout();
            wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
            throw err;
          } finally {
            this.globalData._refreshPromise = null;
          }
        })();
      }
      // 刷新失败时这里会抛出，由调用方处理
      await this.globalData._refreshPromise;
      return this.request({ ...options, _isRetry: true });
    }

    if (res.data.success) {
      return res.data;
    }

    // 业务错误不弹toast，由调用方处理
    throw res.data;
  }
});