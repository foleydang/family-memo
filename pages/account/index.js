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
      recordDate: '',
      payerId: ''
    },
    categories: ['餐饮', '交通', '购物', '医疗', '教育', '娱乐', '住房', '人情', '其他'],
    typeMap: { expense: '支出', income: '收入' },
    members: [],
    memberNames: ['自己（我）'],
    payerIndex: 0
  },

  onLoad() {
    const now = new Date();
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
      'formData.recordDate': this.formatDate(now),
      familyId: app.globalData.familyInfo?.id || wx.getStorageSync('familyId')
    });
    if (this.data.familyId) {
      this.loadData();
      this.loadMembers();
    }
  },

  // 加载家庭成员，供"付款人"选择
  async loadMembers() {
    if (!this.data.familyId) return;
    try {
      const res = await app.request({ url: `/family/${this.data.familyId}` });
      const members = res.data.members || [];
      const memberNames = ['自己（我）', ...members.map(m => m.name || m.nickname || '成员')];
      this.setData({ members, memberNames });
    } catch (err) { console.error('加载成员失败', err); }
  },

  // 未加入家庭时引导去创建/加入，避免静默失败
  checkFamily() {
    if (!app.globalData.familyInfo) {
      wx.showModal({
        title: '提示', content: '请先创建或加入家庭', showCancel: false,
        success: () => { wx.navigateTo({ url: '/pages/family/index' }) }
      });
      return false;
    }
    return true;
  },

  onShow() {
    if (!this.checkFamily()) return;
    if (!this.data.familyId) {
      this.setData({ familyId: app.globalData.familyInfo.id });
      this.loadData();
      this.loadMembers();
    }
  },

  onPullDownRefresh() { this.loadData().then(() => wx.stopPullDownRefresh()); },

  formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      // 用本地拼接取当月起止，避免 toISOString() 的 UTC 偏移导致月末漏一天
      const { currentYear, currentMonth } = this.data;
      const pad = n => String(n).padStart(2, '0');
      const startDate = `${currentYear}-${pad(currentMonth)}-01`;
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${pad(currentMonth)}-${pad(daysInMonth)}`;
      const [listRes, statsRes] = await Promise.all([
        app.request({ url: '/account/list', data: { familyId: this.data.familyId, type: this.data.typeFilter || undefined, startDate, endDate } }),
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
      formData: { type: 'expense', amount: '', category: '其他', title: '', description: '', recordDate: this.formatDate(new Date()), payerId: '' },
      payerIndex: 0
    });
  },

  editItem(e) {
    const item = e.currentTarget.dataset.item;
    // 反查付款人在选择器中的下标（index 0 = 自己）
    let payerIndex = 0;
    if (item.payer_id) {
      const idx = this.data.members.findIndex(m => m.id === item.payer_id);
      if (idx >= 0) payerIndex = idx + 1;
    }
    this.setData({
      showModal: true, editMode: true, editId: item.id,
      formData: { type: item.type, amount: String(item.amount), category: item.category, title: item.title, description: item.description || '', recordDate: item.record_date, payerId: item.payer_id || '' },
      payerIndex
    });
  },

  hideModal() { this.setData({ showModal: false }); },

  onInput(e) { const { field } = e.currentTarget.dataset; this.setData({ [`formData.${field}`]: e.detail.value }); },
  onPicker(e) {
    // 分类网格用 bindtap 触发，读取 data-value（索引）选分类
    const idx = e.currentTarget.dataset.value;
    this.setData({ 'formData.category': this.data.categories[idx] });
  },
  onTypeChange(e) { this.setData({ 'formData.type': e.currentTarget.dataset.type }); },
  onDateChange(e) { this.setData({ 'formData.recordDate': e.detail.value }); },
  pickPayer(e) {
    const index = parseInt(e.detail.value);
    const payerId = index === 0 ? '' : (this.data.members[index - 1]?.id || '');
    this.setData({ payerIndex: index, 'formData.payerId': payerId });
  },

  async submitForm() {
    const { type, amount, category, title, description, recordDate, payerId } = this.data.formData;
    if (!title.trim()) return wx.showToast({ title: '请输入标题', icon: 'none' });
    if (!amount || parseFloat(amount) <= 0) return wx.showToast({ title: '请输入有效金额', icon: 'none' });
    if (!recordDate) return wx.showToast({ title: '请选择日期', icon: 'none' });

    wx.showLoading({ title: '提交中' });
    try {
      if (this.data.editMode) {
        await app.request({ url: `/account/${this.data.editId}`, method: 'PUT', data: { type, amount, category, title, description, recordDate, payerId } });
      } else {
        await app.request({ url: '/account/add', method: 'POST', data: { familyId: this.data.familyId, type, amount, category, title, description, recordDate, payerId } });
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