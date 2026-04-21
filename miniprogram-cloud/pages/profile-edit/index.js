// pages/profile-edit/index.js - 云开发版本
const app = getApp()

Page({
  data: {
    userInfo: null,
    nickname: '',
    avatarUrl: '',        // 显示用的 URL（可能是临时文件或临时 CDN URL）
    avatarFileID: '',     // 实际存储的 cloud:// fileID
    isSaving: false,
    isUploading: false
  },

  onLoad() {
    this.loadUserInfo()
  },

  loadUserInfo() {
    const userInfo = app.globalData.userInfo || {}
    
    // 如果头像是 cloud:// 格式，显示时需要转换
    let displayUrl = userInfo.avatarUrl || ''
    if (displayUrl && displayUrl.startsWith('cloud://')) {
      // 有临时缓存 URL 就用那个，否则先显示空或默认头像
      displayUrl = userInfo._avatarUrlTemp || ''
    }
    
    this.setData({
      userInfo,
      nickname: userInfo.nickname || '',
      avatarUrl: displayUrl,
      avatarFileID: userInfo.avatarUrl || ''
    })
    
    // 如果头像需要转换，异步获取临时 URL
    if (userInfo.avatarUrl && userInfo.avatarUrl.startsWith('cloud://') && !userInfo._avatarUrlTemp) {
      this.refreshAvatarUrl(userInfo.avatarUrl)
    }
  },

  // 异步刷新头像显示 URL
  async refreshAvatarUrl(fileID) {
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: [fileID] })
      if (res.fileList && res.fileList[0]?.status === 0) {
        const tempUrl = res.fileList[0].tempFileURL
        this.setData({ avatarUrl: tempUrl })
        // 缓存到全局
        if (app.globalData.userInfo) {
          app.globalData.userInfo._avatarUrlTemp = tempUrl
        }
      }
    } catch (err) {
      console.error('刷新头像URL失败:', err)
    }
  },

  // 选择头像（微信新版授权方式）
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    console.log('选择的临时头像:', avatarUrl)
    
    // 立即显示临时头像（本地文件）
    this.setData({ 
      avatarUrl: avatarUrl,
      isUploading: true
    })
    
    // 异步上传到云存储
    this.uploadAvatar(avatarUrl)
  },

  // 上传头像到云存储
  async uploadAvatar(tempFilePath) {
    wx.showLoading({ title: '上传中...', mask: true })
    
    try {
      // 上传到云存储
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `avatars/${app.globalData.userId}_${Date.now()}.jpg`,
        filePath: tempFilePath,
        timeout: 60000  // 60秒超时
      })
      
      wx.hideLoading()
      
      if (uploadRes.fileID) {
        const cloudFileID = uploadRes.fileID
        console.log('头像上传成功:', cloudFileID)
        
        // 存储 cloud:// fileID
        this.setData({
          avatarFileID: cloudFileID,
          isUploading: false
        })
        
        wx.showToast({ title: '上传成功', icon: 'success' })
        
        // 异步获取临时 URL 用于显示（不阻塞）
        this.refreshAvatarUrl(cloudFileID)
      }
    } catch (err) {
      wx.hideLoading()
      console.error('上传头像失败:', err)
      
      this.setData({ isUploading: false })
      
      // 上传失败，但用户可以继续用临时头像，保存时再处理
      wx.showToast({ title: '上传慢，稍后重试', icon: 'none', duration: 2000 })
    }
  },

  // 昵称输入
  onNicknameChange(e) {
    this.setData({ nickname: e.detail.value })
  },

  // 保存资料
  async handleSave() {
    const { nickname, avatarUrl, avatarFileID, isUploading } = this.data
    
    if (!nickname.trim()) {
      return wx.showToast({ title: '请输入昵称', icon: 'none' })
    }
    
    // 如果正在上传，等待一下
    if (isUploading) {
      wx.showLoading({ title: '等待上传完成...' })
      await new Promise(resolve => setTimeout(resolve, 2000))
      wx.hideLoading()
    }
    
    // 最终存储的 avatarUrl
    const finalAvatarUrl = avatarFileID || avatarUrl
    
    this.setData({ isSaving: true })
    wx.showLoading({ title: '保存中...' })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'update',
          data: {
            nickname: nickname.trim(),
            avatarUrl: finalAvatarUrl
          }
        }
      })
      
      wx.hideLoading()
      
      if (res.result.success) {
        // 更新全局用户信息
        if (app.globalData.userInfo) {
          app.globalData.userInfo.nickname = nickname.trim()
          app.globalData.userInfo.avatarUrl = finalAvatarUrl
          // 保留临时显示 URL
          if (avatarUrl && !avatarUrl.startsWith('cloud://')) {
            app.globalData.userInfo._avatarUrlTemp = avatarUrl
          }
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
