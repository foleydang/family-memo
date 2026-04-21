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
      this.convertAvatarUrl(userInfo.avatarUrl)
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
    console.log('选择的头像:', avatarUrl)
    
    // 显示临时头像
    this.setData({ avatarUrl })
    
    // 直接上传，不压缩（微信头像本身就很小）
    this.uploadToCloud(avatarUrl)
  },

  // 上传到云存储
  async uploadToCloud(filePath) {
    wx.showLoading({ title: '上传中...', mask: true })
    
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
        
        // 存储 fileID
        this.setData({ avatarFileID: fileID })
        
        wx.showToast({ title: '上传成功', icon: 'success' })
        
        // 异步获取临时 URL 用于显示（不阻塞）
        this.convertAvatarUrl(fileID)
      }
    } catch (err) {
      wx.hideLoading()
      console.error('上传失败:', err)
      
      // 超时或失败，让用户可以继续编辑
      wx.showModal({
        title: '上传失败',
        content: '网络可能较慢，请点击保存后再试，或稍后重新设置头像',
        showCancel: false
      })
    }
  },

  // 昵称输入
  onNicknameChange(e) {
    this.setData({ nickname: e.detail.value })
  },

  // 保存资料
  async handleSave() {
    const { nickname, avatarFileID, avatarUrl } = this.data
    
    if (!nickname.trim()) {
      return wx.showToast({ title: '请输入昵称', icon: 'none' })
    }
    
    // 如果头像还没上传成功（avatarFileID 为空但 avatarUrl 是本地临时路径）
    // 就不保存头像，只保存昵称
    const saveAvatarUrl = avatarFileID || ''
    
    this.setData({ isSaving: true })
    wx.showLoading({ title: '保存中...' })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'update',
          data: {
            nickname: nickname.trim(),
            avatarUrl: saveAvatarUrl
          }
        }
      })
      
      wx.hideLoading()
      
      if (res.result.success) {
        if (app.globalData.userInfo) {
          app.globalData.userInfo.nickname = nickname.trim()
          if (saveAvatarUrl) {
            app.globalData.userInfo.avatarUrl = saveAvatarUrl
          }
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
