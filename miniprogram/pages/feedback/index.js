// pages/feedback/index.js
const app = getApp();

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
    uploadedUrls: [],
    maxImages: 4,
    isSubmitting: false,
    feedbackList: [],
    showHistory: false
  },

  onLoad() {
    this.loadFeedbackHistory();
  },

  // 加载历史反馈
  async loadFeedbackHistory() {
    try {
      const res = await app.request({
        url: '/feedback/my',
        data: { pageSize: 10 }
      });
      this.setData({ feedbackList: res.data.list || [] });
    } catch (err) {
      console.error('加载历史反馈失败:', err);
    }
  },

  // 切换反馈类型
  onTypeChange(e) {
    this.setData({ currentType: e.detail.value });
  },

  // 输入内容
  onContentChange(e) {
    this.setData({ content: e.detail.value });
  },

  // 输入联系方式
  onContactChange(e) {
    this.setData({ contact: e.detail.value });
  },

  // 选择图片
  chooseImage() {
    const { images, maxImages } = this.data;
    const remaining = maxImages - images.length;
    
    if (remaining <= 0) {
      return wx.showToast({ title: `最多上传${maxImages}张图片`, icon: 'none' });
    }
    
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath);
        this.setData({ images: [...images, ...newImages] });
      }
    });
  },

  // 删除图片
  deleteImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = this.data.images.filter((_, i) => i !== index);
    const uploadedUrls = this.data.uploadedUrls.filter((_, i) => i !== index);
    this.setData({ images, uploadedUrls });
  },

  // 预览图片
  previewImage(e) {
    const { src } = e.currentTarget.dataset;
    wx.previewImage({
      current: src,
      urls: this.data.images
    });
  },

  // 上传单张图片
  async uploadSingleImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${app.globalData.baseUrl}/upload/feedback`,
        filePath: filePath,
        name: 'image',
        header: {
          'Authorization': `Bearer ${app.globalData.token}`
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.success) {
              // 返回完整 URL
              const fullUrl = data.data.url.startsWith('http')
                ? data.data.url
                : `${app.globalData.baseUrl.replace('/api', '')}${data.data.url}`;
              resolve(fullUrl);
            } else {
              reject(new Error(data.message || '上传失败'));
            }
          } catch (e) {
            reject(e);
          }
        },
        fail: reject
      });
    });
  },

  // 提交反馈
  async handleSubmit() {
    const { currentType, content, contact, images } = this.data;
    
    if (!content.trim()) {
      return wx.showToast({ title: '请填写反馈内容', icon: 'none' });
    }
    
    if (content.trim().length < 10) {
      return wx.showToast({ title: '反馈内容至少10字', icon: 'none' });
    }
    
    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '提交中...' });
    
    try {
      // 如果有图片，先上传
      let uploadedUrls = [];
      if (images.length > 0) {
        for (const img of images) {
          try {
            const url = await this.uploadSingleImage(img);
            uploadedUrls.push(url);
          } catch (err) {
            console.error('上传图片失败:', err);
          }
        }
      }
      
      // 提交反馈
      await app.request({
        url: '/feedback',
        method: 'POST',
        data: {
          type: currentType,
          content: content.trim(),
          contact: contact.trim(),
          images: uploadedUrls
        }
      });
      
      wx.hideLoading();
      wx.showToast({ title: '提交成功', icon: 'success' });
      
      // 重置表单
      this.setData({
        content: '',
        contact: '',
        images: [],
        uploadedUrls: [],
        isSubmitting: false
      });
      
      // 刷新历史
      this.loadFeedbackHistory();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '提交失败', icon: 'none' });
      this.setData({ isSubmitting: false });
    }
  },

  // 显示/隐藏历史
  toggleHistory() {
    this.setData({ showHistory: !this.data.showHistory });
  },

  // 查看反馈详情
  viewFeedback(e) {
    const { id } = e.currentTarget.dataset;
    wx.showToast({ title: '详情页面开发中', icon: 'none' });
  }
});
