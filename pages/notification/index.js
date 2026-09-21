// pages/notification/index.js
const app = getApp();

Page({
  data: {
    notifications: [],
    unread: 0,
    loading: true
  },

  onShow() {
    if (app.globalData.familyInfo) {
      this.setData({ familyId: app.globalData.familyInfo.id });
      this.loadList();
    }
  },

  onPullDownRefresh() { this.loadList().then(() => wx.stopPullDownRefresh()); },

  async loadList() {
    this.setData({ loading: true });
    try {
      const res = await app.request({ url: '/notification/list', data: { familyId: this.data.familyId } });
      this.setData({ notifications: res.data?.items || [], unread: res.data?.unread || 0, loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  async markRead(e) {
    const { id } = e.currentTarget.dataset;
    try {
      await app.request({ url: `/notification/read/${id}`, method: 'PUT' });
      const notifications = this.data.notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n);
      this.setData({ notifications, unread: notifications.filter(n => !n.is_read).length });
    } catch (e) {}
  },

  async markAllRead() {
    if (this.data.unread === 0) return;
    try {
      await app.request({ url: '/notification/read-all', method: 'PUT', data: { familyId: this.data.familyId } });
      const notifications = this.data.notifications.map(n => ({ ...n, is_read: 1 }));
      this.setData({ notifications, unread: 0 });
      wx.showToast({ title: '已全部标为已读', icon: 'success' });
    } catch (e) {}
  },

  formatTime(t) {
    if (!t) return '';
    const d = new Date(t.replace(' ', 'T') + '+08:00');
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    return `${d.getMonth()+1}/${d.getDate()}`;
  }
});