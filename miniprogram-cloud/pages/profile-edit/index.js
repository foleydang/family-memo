// pages/profile-edit/index.js - 云开发版本
const app = getApp()

Page({
  data: {
    userInfo: null,
    nickname: '',
    avatarUrl: '',        // 显示用的 URL
    avatarFileID: '',     // 实际存储的 cloud:// fileID
    isSaving: false
  },

  onLoad() {
    this.loadUserInfo()
  },

  loadUserInfo() {
    const userInfo = app.globalData.userInfo || {}
    
    // 如果头像是 cloud:// 格式，异步获取临时 URL
    let displayUrl = userInfo.avatarUrl || ''
    if (displayUrl && displayUrl.startsWith('cloud://')) {
      displayUrl = userInfo._avatarUrlTemp || ''
      // 异步转换
      this.convertAvatarUrl(displayUrl)
    }
    
    this.setData({
      userInfo,
      nickname: userInfo.nickname || '',
      avatarUrl: displayUrl,
      avatarFileID: userInfo.avatarUrl || ''
    })
  },

  // 转换 cloud:// 头像为可显示的临时 URL
  async convertAvatarUrl(fileID) {
    if (!fileID || !fileID.startsWith('cloud://')) return
    
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: [fileID] })
      if (res.fileList?.[0]?.status === 0) {
        const tempUrl = res.fileList[0].tempFileURL
        this.setData({ avatarUrl: tempUrl })
        if (app.globalData.userInfo) {
          app.globalData.userInfo._avatarUrlTemp = tempUrl
        }
      }
    } catch (err) {
      console.error('头像URL转换失败:', err)
    }
  },

  // 选择头像（微信新版授权方式）
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    console.log('选择的头像临时路径:', avatarUrl)
    
    // 先显示临时头像
    this.setData({ avatarUrl })
    
    // 压缩后上传
    this.compressAndUpload(avatarUrl)
  },

  // 压缩图片然后上传
  async compressAndUpload(tempFilePath) {
    wx.showLoading({ title: '处理中...', mask: true })
    
    try {
      // 压缩图片 - 限制宽度 200px，质量 80%，适合头像
      const compressRes = await wx.compressImage({
        src: tempFilePath,
        quality: 80,
        compressedWidth: 200
      })
      
      console.log('压缩后路径:', compressRes.tempFilePath)
      
      // 上传压缩后的图片
      await this.uploadToCloud(compressRes.tempFilePath)
      
    } catch (err) {
      // 压缩失败，直接上传原图
      console.log('压缩失败，直接上传原图:', err.message)
      await this.uploadToCloud(tempFilePath)
    }
  },

  // 上传到云存储
  async uploadToCloud(filePath) {
    const cloudPath = `avatars/${app.globalData.userId}_${Date.now()}.jpg`
    
    try {
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath
      })
      
      wx.hideLoading()
      
      if (uploadRes.fileID) {
        const fileID = uploadRes.fileID
        console.log('上传成功:', fileID)
        
        this.setData({ avatarFileID: fileID })
        
        wx.showToast({ title: '上传成功', icon: 'success' })
        
        // 获取临时 URL 用于显示
        this.convertAvatarUrl(fileID)
      }
    } catch (err) {
      wx.hideLoading()
      console.error('上传失败:', err)
      wx.showToast({ title: '上传失败', icon: 'none', duration: 2000 })
    }
  },

  // 昵称输入
  onNicknameChange(e) {
    this.setData({ nickname: e.detail.value })
  },

  // 保存资料
  async handleSave() {
    const { nickname, avatarFileID } = this.data
    
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
            avatarUrl: avatarFileID  // 存储 cloud:// 格式
          }
        }
      })
      
      wx.hideLoading()
      
      if (res.result.success) {
        if (app.globalData.userInfo) {
          app.globalData.userInfo.nickname = nickname.trim()
          app.globalData.userInfo.avatarUrl = avatarFileID
        }
        
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1000)
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
