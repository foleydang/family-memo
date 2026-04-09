// pages/feedback/index.js - 云开发版本
const app = getApp()

Page({
  data: {
    types: [
      { value: 'bug', label: '功能异常' },
      { value: 'suggest', label: '功能建议' },
      { value: 'question', label: '使用问题' },
      { value: 'other', label: '其他' }
    ],
    currentType: 'bug',
    content: '',
    contact: '',
    images: [],
    maxImages: 4,
    isSubmitting: false,
    feedbackList: [],
    showHistory: false
  },

  onLoad() {
    this.loadFeedbackHistory()
  },

  async loadFeedbackHistory() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'feedback',
        data: { action: 'list' }
      })
      
      if (res.result.success) {
        this.setData({ feedbackList: res.result.data || [] })
      }
    } catch (err) {
      console.error('加载历史反馈失败:', err)
    }
  },

  onTypeChange(e) {
    this.setData({ currentType: e.detail.value })
  },

  onContentChange(e) {
    this.setData({ content: e.detail.value })
  },

  onContactChange(e) {
    this.setData({ contact: e.detail.value })
  },

  // 选择图片
  chooseImage() {
    const { images, maxImages } = this.data
    const remaining = maxImages - images.length
    
    if (remaining <= 0) {
      return wx.showToast({ title: `最多上传${maxImages}张图片`, icon: 'none' })
    }
    
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath)
        this.setData({ images: [...images, ...newImages] })
      }
    })
  },

  // 删除图片
  deleteImage(e) {
    const { index } = e.currentTarget.dataset
    const images = this.data.images.filter((_, i) => i !== index)
    this.setData({ images })
  },

  // 预览图片
  previewImage(e) {
    const { src } = e.currentTarget.dataset
    wx.previewImage({
      current: src,
      urls: this.data.images
    })
  },

  // 提交反馈
  async handleSubmit() {
    const { currentType, content, contact, images } = this.data
    
    if (!content.trim()) {
      return wx.showToast({ title: '请填写反馈内容', icon: 'none' })
    }
    
    if (content.trim().length < 10) {
      return wx.showToast({ title: '反馈内容至少10字', icon: 'none' })
    }
    
    this.setData({ isSubmitting: true })
    wx.showLoading({ title: '提交中...' })
    
    try {
      // 上传图片到云存储
      let uploadedImages = []
      if (images.length > 0) {
        for (const img of images) {
          try {
            const res = await wx.cloud.uploadFile({
              cloudPath: `feedback/${app.globalData.userId}_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`,
              filePath: img
            })
            if (res.fileID) {
              uploadedImages.push(res.fileID)
            }
          } catch (err) {
            console.error('上传图片失败:', err)
          }
        }
      }
      
      // 提交反馈
      const res = await wx.cloud.callFunction({
        name: 'feedback',
        data: {
          action: 'add',
          data: {
            type: currentType,
            content: content.trim(),
            contact: contact.trim(),
            images: uploadedImages
          }
        }
      })
      
      wx.hideLoading()
      
      if (res.result.success) {
        wx.showToast({ title: '提交成功', icon: 'success' })
        
        this.setData({
          content: '',
          contact: '',
          images: [],
          isSubmitting: false
        })
        
        this.loadFeedbackHistory()
      } else {
        wx.showToast({ title: res.result.message || '提交失败', icon: 'none' })
        this.setData({ isSubmitting: false })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('提交失败:', err)
      wx.showToast({ title: '提交失败', icon: 'none' })
      this.setData({ isSubmitting: false })
    }
  },

  toggleHistory() {
    this.setData({ showHistory: !this.data.showHistory })
  }
})
