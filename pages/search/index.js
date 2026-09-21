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
    const { type, id } = e.currentTarget.dataset;
    const urls = { schedule: '/pages/schedule/index', todo: '/pages/todo/index', shopping: '/pages/shopping/index', account: '/pages/account/index' };
    wx.navigateTo({ url: urls[type] });
  },

  clearSearch() {
    this.setData({ keyword: '', results: null, totalCount: 0 });
  }
});