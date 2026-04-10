// app.js - 云开发版本
App({
  globalData: {
    userInfo: null,
    familyInfo: null,
    userId: null
  },

  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-8guv4kyl1b68e254',
        traceUser: true
      })
    }
    
    // 自动登录并等待完成
    this.login()
  },

  // 云开发登录
  async login() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'login'
      })
      
      if (res.result.success) {
        this.globalData.userInfo = res.result.data
        this.globalData.userId = res.result.data.userId
        console.log('登录成功:', res.result.data)
        
        // 等待获取家庭信息完成
        await this.getFamilyInfo()
        
        // 通知首页刷新
        if (this.onLoginReady) {
          this.onLoginReady()
        }
      } else {
        console.error('登录失败:', res.result.message)
      }
    } catch (err) {
      console.error('登录出错:', err)
    }
  },

  // 获取家庭信息
  async getFamilyInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'family',
        data: {
          action: 'getMyFamily'
        }
      })
      
      if (res.result.success && res.result.data) {
        this.globalData.familyInfo = res.result.data
        console.log('获取家庭信息成功:', res.result.data)
      } else {
        this.globalData.familyInfo = null
      }
    } catch (err) {
      console.error('获取家庭信息失败:', err)
      this.globalData.familyInfo = null
    }
  },

  // 更新用户信息
  async updateUserInfo(data) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'update',
          data: data
        }
      })
      return res.result
    } catch (err) {
      console.error('更新用户信息失败:', err)
      return { success: false, message: err.message }
    }
  },

  // 退出登录
  logout() {
    this.globalData.userInfo = null
    this.globalData.familyInfo = null
    this.globalData.userId = null
  }
})
