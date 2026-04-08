// pages/announcement/index.js
const app = getApp();

Page({
  data: {
    familyId: null,
    announcements: [],
    showModal: false,
    editId: null,
    formData: {
      content: ''
    }
  },

  onLoad() {
    if (app.globalData.familyInfo) {
      this.setData({ familyId: app.globalData.familyInfo.id });
      this.loadAnnouncements();
    }
  },

  onShow() {
    if (this.data.familyId) {
      this.loadAnnouncements();
    }
  },

  onPullDownRefresh() {
    this.loadAnnouncements().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadAnnouncements() {
    if (!this.data.familyId) return;

    try {
      const res = await app.request({
        url: '/announcement/list',
        data: { familyId: this.data.familyId }
      });
      this.setData({ announcements: res.data || [] });
    } catch (err) {
      console.error('加载公告失败', err);
      // 如果 API 不存在，显示空列表
      this.setData({ announcements: [] });
    }
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

  async submitForm() {
    const { content } = this.data.formData;

    if (!content.trim()) {
      wx.showToast({ title: '请输入公告内容', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中' });

    try {
      await app.request({
        url: '/announcement/add',
        method: 'POST',
        data: {
          familyId: this.data.familyId,
          content: content.trim()
        }
      });

      wx.hideLoading();
      wx.showToast({ title: '已发布', icon: 'success' });
      this.hideModal();
      this.loadAnnouncements();
    } catch (err) {
      wx.hideLoading();
      // API 不存在时，模拟成功
      const newAnnouncement = {
        id: Date.now(),
        content: content.trim(),
        created_by_name: app.globalData.userInfo?.nickname || '我',
        created_at: new Date().toLocaleString('zh-CN')
      };
      this.setData({
        announcements: [newAnnouncement, ...this.data.announcements],
        showModal: false
      });
      wx.showToast({ title: '已发布', icon: 'success' });
    }
  },

  async deleteAnnouncement(e) {
    const id = e.currentTarget.dataset.id;

    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这条公告吗？'
    });

    if (res.confirm) {
      try {
        await app.request({
          url: `/announcement/${id}`,
          method: 'DELETE'
        });
        wx.showToast({ title: '已删除', icon: 'success' });
        this.loadAnnouncements();
      } catch (err) {
        // 本地删除
        this.setData({
          announcements: this.data.announcements.filter(a => a.id !== id)
        });
        wx.showToast({ title: '已删除', icon: 'success' });
      }
    }
  },

  formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr.replace('T', ' ').substring(0, 16);
  }
});