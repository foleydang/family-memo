// pages/search/index.js
const app = getApp();

Page({
  data: {
    keyword: '',
    results: null,
    loading: false,
    totalCount: 0
  },

  onLoad() {
    this.setData({ familyId: app.globalData.familyInfo?.id || wx.getStorageSync('familyId') });
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.doSearch(), 300);
  },

  async doSearch() {
    const q = this.data.keyword.trim();
    if (!q) { this.setData({ results: null, totalCount: 0 }); return; }
    
    this.setData({ loading: true });
    try {
      const res = await app.request({ url: '/search', data: { familyId: this.data.familyId, q } });
      const d = res.data || {};
      const totalCount = (d.schedules?.length || 0) + (d.todos?.length || 0) + (d.shopping?.length || 0) + (d.accounts?.length || 0);
      this.setData({ results: d, totalCount, loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  goTo(e) {
    const { type } = e.currentTarget.dataset;
    // tabBar 页用 switchTab（不支持 query），非 tabBar 页用 navigateTo
    const tabBarPaths = ['pages/schedule/index', 'pages/todo/index', 'pages/shopping/index'];
    const path = { schedule: 'pages/schedule/index', todo: 'pages/todo/index', shopping: 'pages/shopping/index', account: 'pages/account/index' }[type];
    if (!path) return;
    if (tabBarPaths.includes(path)) {
      wx.switchTab({ url: '/' + path, fail: () => wx.showToast({ title: '跳转失败', icon: 'none' }) });
    } else {
      wx.navigateTo({ url: '/' + path, fail: () => wx.showToast({ title: '跳转失败', icon: 'none' }) });
    }
  },

  clearSearch() {
    this.setData({ keyword: '', results: null, totalCount: 0 });
  }
});