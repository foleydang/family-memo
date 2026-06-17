// pages/wish/index.js
const app = getApp();

const CATEGORY_MAP = {
  'travel': '🌍 旅行',
  'gift': '🎁 礼物',
  'experience': '✨ 体验',
  'purchase': '🛍️ 想买',
  'skill': '📚 学习',
  'other': '💭 其他'
};

Page({
  data: {
    familyId: null,
    list: [],
    filteredList: [],
    categories: [],
    stats: { pending: 0, fulfilled: 0 },
    currentTab: 'pending',
    currentCategory: 'all',
    showModal: false,
    editMode: false,
    editId: null,
    formData: {
      title: '',
      description: '',
      category: 'other',
      priority: 0
    },
    categoryIndex: 5
  },

  onLoad() {
    this.loadCategories();
  },

  onShow() {
    if (app.globalData.familyInfo) {
      this.setData({ familyId: app.globalData.familyInfo.id });
      this.loadList();
    }
  },

  onPullDownRefresh() {
    this.loadList().then(() => wx.stopPullDownRefresh());
  },

  async loadCategories() {
    try {
      const res = await app.request({ url: '/wish/categories' });
      this.setData({ categories: res.data });
    } catch (err) { console.error('加载分类失败', err); }
  },

  async loadList() {
    if (!this.data.familyId) return;
    try {
      const res = await app.request({
        url: '/wish/list',
        data: { familyId: this.data.familyId, status: 'all' }
      });
      const listWithCategoryName = res.data.all.map(item => ({
        ...item,
        categoryName: CATEGORY_MAP[item.category] || item.category
      }));
      this.setData({ list: listWithCategoryName, stats: res.data.stats });
      this.filterList();
    } catch (err) { console.error('加载心愿列表失败', err); }
  },

  filterList() {
    let filtered = this.data.list.filter(item => {
      const statusMatch = this.data.currentTab === 'all' || item.status === this.data.currentTab;
      const categoryMatch = this.data.currentCategory === 'all' || item.category === this.data.currentCategory;
      return statusMatch && categoryMatch;
    });
    this.setData({ filteredList: filtered });
  },

  switchTab(e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab });
    this.filterList();
  },

  switchCategory(e) {
    this.setData({ currentCategory: e.currentTarget.dataset.category });
    this.filterList();
  },

  showAddModal() {
    this.setData({
      showModal: true, editMode: false, editId: null,
      formData: { title: '', description: '', category: 'other', priority: 0 },
      categoryIndex: 5
    });
  },

  hideModal() { this.setData({ showModal: false }); },

  inputTitle(e) { this.setData({ 'formData.title': e.detail.value }); },
  inputDescription(e) { this.setData({ 'formData.description': e.detail.value }); },

  pickCategory(e) {
    const index = e.detail.value;
    this.setData({ categoryIndex: index, 'formData.category': this.data.categories[index].id });
  },

  togglePriority() {
    this.setData({ 'formData.priority': this.data.formData.priority ? 0 : 1 });
  },

  async submitForm() {
    const { title, description, category, priority } = this.data.formData;
    if (!title.trim()) return wx.showToast({ title: '请输入心愿内容', icon: 'none' });

    wx.showLoading({ title: '提交中' });
    try {
      if (this.data.editMode) {
        await app.request({ url: `/wish/${this.data.editId}`, method: 'PUT', data: { title, description, category, priority } });
      } else {
        await app.request({ url: '/wish/add', method: 'POST', data: { familyId: this.data.familyId, title, description, category, priority } });
      }
      wx.hideLoading();
      wx.showToast({ title: this.data.editMode ? '已保存' : '心愿已发布 ✨', icon: 'success' });
      this.hideModal();
      this.loadList();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  editItem(e) {
    const item = e.currentTarget.dataset.item;
    const categoryIndex = this.data.categories.findIndex(c => c.id === item.category);
    this.setData({
      showModal: true, editMode: true, editId: item.id,
      formData: { title: item.title, description: item.description || '', category: item.category, priority: item.priority },
      categoryIndex: categoryIndex >= 0 ? categoryIndex : 5
    });
  },

  async fulfillItem(e) {
    const id = e.currentTarget.dataset.id;
    try {
      const res = await app.request({ url: `/wish/${id}/fulfill`, method: 'PUT' });
      wx.showToast({ title: res.message, icon: 'success' });
      this.loadList();
    } catch (err) { console.error('操作失败', err); }
  },

  async deleteItem(e) {
    const id = e.currentTarget.dataset.id;
    const res = await wx.showModal({ title: '确认删除', content: '确定要删除这个心愿吗？' });
    if (res.confirm) {
      try {
        await app.request({ url: `/wish/${id}`, method: 'DELETE' });
        wx.showToast({ title: '已删除', icon: 'success' });
        this.loadList();
      } catch (err) { wx.showToast({ title: '删除失败', icon: 'none' }); }
    }
  },

  async clearFulfilled() {
    const res = await wx.showModal({ title: '确认清空', content: '确定要清空所有已实现的心愿吗？' });
    if (res.confirm) {
      try {
        await app.request({ url: `/wish/clear-fulfilled/${this.data.familyId}`, method: 'DELETE' });
        wx.showToast({ title: '已清空', icon: 'success' });
        this.loadList();
      } catch (err) { wx.showToast({ title: '操作失败', icon: 'none' }); }
    }
  },

  stopPropagation() {}
});