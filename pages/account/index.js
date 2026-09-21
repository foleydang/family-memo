// pages/account/index.js
const app = getApp();

Page({
  data: {
    familyId: 0,
    currentYear: 0,
    currentMonth: 0,
    typeFilter: '',
    loading: true,
    groupedData: {},
    stats: null,
    showModal: false,
    editMode: false,
    editId: null,
    showStats: false,
    formData: {
      type: 'expense',
      amount: '',
      category: '其他',
      title: '',
      description: '',
      recordDate: ''
    },
    categories: ['餐饮', '交通', '购物', '医疗', '教育', '娱乐', '住房', '人情', '其他'],
    typeMap: { expense: '支出', income: '收入' }
  },

  onLoad() {
    const now = new Date();
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
      'formData.recordDate': this.formatDate(now),
      familyId: app.globalData.familyInfo?.id || wx.getStorageSync('familyId')
    });
    if (this.data.familyId) this.loadData();
  },

  onShow() {
    if (app.globalData.familyInfo && !this.data.familyId) {
      this.setData({ familyId: app.globalData.familyInfo.id });
      this.loadData();
    }
  },

  onPullDownRefresh() { this.loadData().then(() => wx.stopPullDownRefresh()); },

  formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const [listRes, statsRes] = await Promise.all([
        app.request({ url: '/account/list', data: { familyId: this.data.familyId, type: this.data.typeFilter || undefined, startDate: `${this.data.currentYear}-${String(this.data.currentMonth).padStart(2,'0')}-01`, endDate: new Date(this.data.currentYear, this.data.currentMonth, 0).toISOString().split('T')[0] } }),
        app.request({ url: '/account/stats', data: { familyId: this.data.familyId, year: this.data.currentYear, month: this.data.currentMonth } })
      ]);
      this.setData({ groupedData: listRes.data?.grouped || {}, loading: false, stats: statsRes.data });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  prevMonth() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 1) { currentYear--; currentMonth = 12; } else { currentMonth--; }
    this.setData({ currentYear, currentMonth });
    this.loadData();
  },

  nextMonth() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 12) { currentYear++; currentMonth = 1; } else { currentMonth++; }
    this.setData({ currentYear, currentMonth });
    this.loadData();
  },

  filterType(e) { const t = e.currentTarget.dataset.type; this.setData({ typeFilter: this.data.typeFilter === t ? '' : t }); this.loadData(); },

  toggleStats() { this.setData({ showStats: !this.data.showStats }); },

  openAdd() {
    this.setData({
      showModal: true, editMode: false, editId: null,
      formData: { type: 'expense', amount: '', category: '其他', title: '', description: '', recordDate: this.formatDate(new Date()) }
    });
  },

  editItem(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      showModal: true, editMode: true, editId: item.id,
      formData: { type: item.type, amount: String(item.amount), category: item.category, title: item.title, description: item.description || '', recordDate: item.record_date }
    });
  },

  hideModal() { this.setData({ showModal: false }); },

  onInput(e) { const { field } = e.currentTarget.dataset; this.setData({ [`formData.${field}`]: e.detail.value }); },
  onPicker(e) { const { field } = e.currentTarget.dataset; this.setData({ [`formData.${field}`]: this.data.categories[e.detail.value] }); },
  onTypeChange(e) { this.setData({ 'formData.type': e.currentTarget.dataset.type }); },
  onDateChange(e) { this.setData({ 'formData.recordDate': e.detail.value }); },

  async submitForm() {
    const { type, amount, category, title, description, recordDate } = this.data.formData;
    if (!title.trim()) return wx.showToast({ title: '请输入标题', icon: 'none' });
    if (!amount || parseFloat(amount) <= 0) return wx.showToast({ title: '请输入有效金额', icon: 'none' });
    if (!recordDate) return wx.showToast({ title: '请选择日期', icon: 'none' });
    
    wx.showLoading({ title: '提交中' });
    try {
      if (this.data.editMode) {
        await app.request({ url: `/account/${this.data.editId}`, method: 'PUT', data: { type, amount, category, title, description, recordDate } });
      } else {
        await app.request({ url: '/account/add', method: 'POST', data: { familyId: this.data.familyId, type, amount, category, title, description, recordDate } });
      }
      wx.hideLoading();
      wx.showToast({ title: this.data.editMode ? '已修改' : '记账成功', icon: 'success' });
      this.hideModal();
      this.loadData();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  async deleteItem(e) {
    const { id } = e.currentTarget.dataset;
    const res = await wx.showModal({ title: '确认删除', content: '删除后无法恢复' });
    if (!res.confirm) return;
    try {
      await app.request({ url: `/account/${id}`, method: 'DELETE' });
      wx.showToast({ title: '已删除', icon: 'success' });
      this.loadData();
    } catch (e) {
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  }
});