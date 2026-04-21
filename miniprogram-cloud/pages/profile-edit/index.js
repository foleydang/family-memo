// pages/profile-edit/index.js - 云开发版本
const app = getApp()

const DEFAULT_AVATAR = '/images/default-avatar.png'

// 检查头像 URL 是否有效
function getValidAvatar(url) {
  if (!url) return DEFAULT_AVATAR
  if (url.startsWith('cloud://')) return DEFAULT_AVATAR  // 需要转换，先显示默认头像
  if (url.startsWith('https://') && url.includes('?')) return url  // 有效临时 URL
  if (url.startsWith('wxfile://')) return url  // 本地临时文件
  return DEFAULT_AVATAR  // 无效格式用默认头像
}

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
    
    // 处理头像显示
    let displayAvatar = getValidAvatar(userInfo.avatarUrl)
    
    // 如果需要转换 cloud:// 头像
    if (userInfo.avatarUrl && userInfo.avatarUrl.startsWith('cloud://')) {
      this.convertAvatarUrl(userInfo.avatarUrl)
    }
    
    this.setData({
      userInfo,
      nickname: userInfo.nickname || '',
      avatarUrl: displayAvatar || DEFAULT_AVATAR,
      avatarFileID: userInfo.avatarUrl || ''
    })
  },

  // 转换 cloud:// 头像为可显示的临时 URL
  async convertAvatarUrl(fileID) {
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: [fileID] })
      if (res.fileList?.[0]?.status === 0) {
        this.setData({ avatarUrl: res.fileList[0].tempFileURL })
        if (app.globalData.userInfo) {
          app.globalData.userInfo._avatarUrlTemp = res.fileList[0].tempFileURL
        }
      }
    } catch (err) {
      console.error('头像URL转换失败:', err)
      // 转换失败，显示默认头像
      this.setData({ avatarUrl: DEFAULT_AVATAR })
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
      
      wx.showModal({
        title: '上传失败',
        content: '网络可能较慢，请稍后重新设置头像',
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
