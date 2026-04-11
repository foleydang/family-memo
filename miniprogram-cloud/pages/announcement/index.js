// pages/announcement/index.js - 云开发版本（本地存储）
const app = getApp();

Page({
  data: {
    announcements: [],
    showModal: false,
    editId: null,
    formData: {
      content: ''
    }
  },

  onLoad() {
    this.loadAnnouncements();
  },

  onShow() {
    this.loadAnnouncements();
  },

  onPullDownRefresh() {
    this.loadAnnouncements();
    wx.stopPullDownRefresh();
  },

  loadAnnouncements() {
    // 使用本地存储（云函数暂未实现）
    const key = 'announcements_' + (app.globalData.familyInfo?._id || 'default');
    const announcements = wx.getStorageSync(key) || [];
    this.setData({ announcements });
  },

  showAddModal() {
    this.setData({
      showModal: true,
      editId: null,
      formData: { content: '' }
    });
  },

  hideModal() {
    this.setData({ showModal: false });
  },

  inputContent(e) {
    this.setData({ 'formData.content': e.detail.value });
  },

  submitForm() {
    const { content } = this.data.formData;

    if (!content.trim()) {
      wx.showToast({ title: '请输入公告内容', icon: 'none' });
      return;
    }

    const newAnnouncement = {
      id: Date.now(),
      content: content.trim(),
      authorName: app.globalData.userInfo?.nickname || '我',
      createTime: new Date().toLocaleString('zh-CN')
    };

    const key = 'announcements_' + (app.globalData.familyInfo?._id || 'default');
    const announcements = [newAnnouncement, ...this.data.announcements];
    
    wx.setStorageSync(key, announcements);
    
    this.setData({
      announcements,
      showModal: false,
      formData: { content: '' }
    });
    
    wx.showToast({ title: '已发布', icon: 'success' });
  },

  deleteAnnouncement(e) {
    const id = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条公告吗？',
      success: (res) => {
        if (res.confirm) {
          const key = 'announcements_' + (app.globalData.familyInfo?._id || 'default');
          const announcements = this.data.announcements.filter(a => a.id !== id);
          wx.setStorageSync(key, announcements);
          this.setData({ announcements });
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr.replace('T', ' ').substring(0, 16);
  }
});
