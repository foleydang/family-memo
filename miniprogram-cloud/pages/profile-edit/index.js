// pages/profile-edit/index.js - 云开发版本
const app = getApp()

Page({
  data: {
    userInfo: null,
    nickname: '',
    avatar: '',
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
      avatar: userInfo.avatar || ''
    })
  },

  // 选择头像（微信新版授权方式）
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    console.log('选择的头像:', avatarUrl)
    
    // 显示临时头像
    this.setData({ avatar: avatarUrl })
    
    // 上传到云存储
    this.uploadAvatar(avatarUrl)
  },

  // 上传头像到云存储
  async uploadAvatar(tempFilePath) {
    wx.showLoading({ title: '上传中...' })
    
    try {
      // 云存储上传
      const res = await wx.cloud.uploadFile({
        cloudPath: `avatars/${app.globalData.userId}_${Date.now()}.jpg`,
        filePath: tempFilePath
      })
      
      wx.hideLoading()
      
      if (res.fileID) {
        // 更新头像为云存储地址
        this.setData({ avatar: res.fileID })
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
    const { nickname, avatar } = this.data
    
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
            avatar: avatar
          }
        }
      })
      
      wx.hideLoading()
      
      if (res.result.success) {
        // 更新全局用户信息
        if (app.globalData.userInfo) {
          app.globalData.userInfo.nickname = nickname.trim()
          app.globalData.userInfo.avatar = avatar
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
