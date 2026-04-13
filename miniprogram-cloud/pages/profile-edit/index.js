// pages/profile-edit/index.js - 云开发版本
const app = getApp()

Page({
  data: {
    userInfo: null,
    nickname: '',
    avatarUrl: '',
    isSaving: false
  },

  onLoad() {
    this.loadUserInfo()
  },

  loadUserInfo() {
    const userInfo = app.globalData.userInfo || {}
    this.setData({
      userInfo,
      nickname: userInfo.nickname || '',
      avatarUrl: userInfo.avatarUrl || ''
    })
  },

  // 选择头像（微信新版授权方式）
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    console.log('选择的头像:', avatarUrl)
    
    // 显示临时头像
    this.setData({ avatarUrl: avatarUrl })
    
    // 上传到云存储
    this.uploadAvatar(avatarUrl)
  },

  // 上传头像到云存储，获取永久 CDN URL
  async uploadAvatar(tempFilePath) {
    wx.showLoading({ title: '上传中...' })
    
    try {
      // 云存储上传
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `avatars/${app.globalData.userId}_${Date.now()}.jpg`,
        filePath: tempFilePath
      })
      
      if (uploadRes.fileID) {
        // 获取临时 URL，去掉签名参数得到永久 CDN URL
        const urlRes = await wx.cloud.getTempFileURL({
          fileList: [uploadRes.fileID]
        })
        
        wx.hideLoading()
        
        // 永久 CDN URL（去掉 ?sign=xxx 签名参数）
        const tempUrl = urlRes.fileList[0]?.tempFileURL || ''
        const permanentUrl = tempUrl.split('?')[0]  // 去掉签名参数
        
        console.log('永久头像URL:', permanentUrl)
        
        this.setData({ avatarUrl: permanentUrl })
        wx.showToast({ title: '上传成功', icon: 'success' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('上传头像失败:', err)
      wx.showToast({ title: '上传失败', icon: 'none' })
    }
  },

  // 昵称输入
  onNicknameChange(e) {
    this.setData({ nickname: e.detail.value })
  },

  // 保存资料
  async handleSave() {
    const { nickname, avatarUrl } = this.data
    
    if (!nickname.trim()) {
      return wx.showToast({ title: '请输入昵称', icon: 'none' })
    }
    
    this.setData({ isSaving: true })
    wx.showLoading({ title: '保存中...' })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'update',
          data: {
            nickname: nickname.trim(),
            avatarUrl: avatarUrl  // 只存永久 URL
          }
        }
      })
      
      wx.hideLoading()
      
      if (res.result.success) {
        // 更新全局用户信息
        if (app.globalData.userInfo) {
          app.globalData.userInfo.nickname = nickname.trim()
          app.globalData.userInfo.avatarUrl = avatarUrl
        }
        
        wx.showToast({ title: '保存成功', icon: 'success' })
        
        setTimeout(() => {
          wx.navigateBack()
        }, 1000)
      } else {
        wx.showToast({ title: res.result.message || '保存失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('保存失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ isSaving: false })
    }
  }
})
