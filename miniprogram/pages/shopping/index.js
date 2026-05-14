// pages/shopping/index.js
const app = getApp();

Page({
  data: {
    familyId: null,
    list: [],
    filteredList: [],
    stats: { pending: 0, done: 0 },
    categories: [],
    currentTab: 'pending',
    currentCategory: 'all',
    categoryIndex: 0,
    showModal: false,
    editMode: false,
    editId: null,
    formData: {
      title: '',
      category: '其他',
      quantity: 1,
      unit: '个',
      priority: 0
    }
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
    this.loadList().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadCategories() {
    try {
      const res = await app.request({ url: '/shopping/categories' });
      this.setData({ categories: res.data });
    } catch (err) {
      console.error('加载分类失败', err);
    }
  },

  async loadList() {
    if (!this.data.familyId) return;

    try {
      const res = await app.request({
        url: '/shopping/list',
        data: { familyId: this.data.familyId, status: 'all' }
      });
      this.setData({
        list: res.data.all,
        stats: res.data.stats
      });
      this.filterList();
    } catch (err) {
      console.error('加载购物清单失败', err);
    }
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
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
    this.filterList();
  },

  switchCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ currentCategory: category });
    this.filterList();
  },

  showAddModal() {
    this.setData({
      showModal: true,
      editMode: false,
      editId: null,
      formData: {
        title: '',
        category: '其他',
        quantity: 1,
        unit: '个',
        priority: 0
      },
      categoryIndex: 0
    });
  },

  hideModal() {
    this.setData({ showModal: false });
  },

  inputTitle(e) {
    this.setData({ 'formData.title': e.detail.value });
  },

  inputQuantity(e) {
    this.setData({ 'formData.quantity': e.detail.value });
  },

  inputUnit(e) {
    this.setData({ 'formData.unit': e.detail.value || '个' });
  },

  pickCategory(e) {
    const index = e.detail.value;
    this.setData({
      categoryIndex: index,
      'formData.category': this.data.categories[index].name
    });
  },

  togglePriority() {
    this.setData({
      'formData.priority': this.data.formData.priority ? 0 : 1
    });
  },

  async submitForm() {
    const { title, category, quantity, unit, priority } = this.data.formData;

    if (!title.trim()) {
      wx.showToast({ title: '请输入物品名称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中' });

    try {
      if (this.data.editMode) {
        await app.request({
          url: `/shopping/${this.data.editId}`,
          method: 'PUT',
          data: {
            title,
            category,
            quantity: parseInt(quantity) || 1,
            unit,
            priority
          }
        });
      } else {
        await app.request({
          url: '/shopping/add',
          method: 'POST',
          data: {
            familyId: this.data.familyId,
            title,
            category,
            quantity: parseInt(quantity) || 1,
            unit,
            priority
          }
        });
      }

      wx.hideLoading();
      wx.showToast({ title: this.data.editMode ? '已保存' : '已添加', icon: 'success' });
      this.hideModal();
      this.loadList();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  editItem(e) {
    const item = e.currentTarget.dataset.item;
    const categoryIndex = this.data.categories.findIndex(c => c.name === item.category);

    this.setData({
      showModal: true,
      editMode: true,
      editId: item.id,
      formData: {
        title: item.title,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        priority: item.priority
      },
      categoryIndex: categoryIndex >= 0 ? categoryIndex : 0
    });
  },

  async toggleItem(e) {
    const id = e.currentTarget.dataset.id;

    try {
      await app.request({
        url: `/shopping/${id}/toggle`,
        method: 'PUT'
      });
      this.loadList();
    } catch (err) {
      console.error('操作失败', err);
    }
  },

  async deleteItem(e) {
    const id = e.currentTarget.dataset.id;

    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这个购物项吗？'
    });

    if (res.confirm) {
      try {
        await app.request({
          url: `/shopping/${id}`,
          method: 'DELETE'
        });
        wx.showToast({ title: '已删除', icon: 'success' });
        this.loadList();
      } catch (err) {
        wx.showToast({ title: '删除失败', icon: 'none' });
      }
    }
  },

  async clearDone() {
    const res = await wx.showModal({
      title: '确认清空',
      content: '确定要清空所有已购物品吗？'
    });

    if (res.confirm) {
      try {
        await app.request({
          url: `/shopping/clear-done/${this.data.familyId}`,
          method: 'DELETE'
        });
        wx.showToast({ title: '已清空', icon: 'success' });
        this.loadList();
      } catch (err) {
        wx.showToast({ title: '操作失败', icon: 'none' });
      }
    }
  }
});