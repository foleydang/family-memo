// pages/shopping/index.js
const app = getApp();

// 分类映射：id → 显示名，兼容旧数据中的 name 格式
const CATEGORY_MAP = {
  'food': '🥬 食品',
  'daily': '🧴 日用品',
  'clothing': '👕 服饰',
  'other': '📦 其他',
  // 兼容旧数据（之前存的是 name）
  '🥬 食品': '🥬 食品',
  '🧴 日用品': '🧴 日用品',
  '👟 鞋服': '👕 服饰',
  '📦 其他': '📦 其他',
  '其他': '📦 其他'
};

// 将旧 name 格式统一转为 id
function normalizeCategory(raw) {
  // 已经是标准 id
  if (['food', 'daily', 'clothing', 'other'].includes(raw)) return raw;
  // 旧 name 格式反向映射
  const reverseMap = {
    '🥬 食品': 'food',
    '🧴 日用品': 'daily',
    '👟 鞋服': 'clothing',
    '👕 服饰': 'clothing',
    '📦 其他': 'other',
    '其他': 'other'
  };
  return reverseMap[raw] || 'other';
}

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
      category: 'other',
      quantity: 1,
      unit: '',
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
      // 标准化分类 id，生成显示名
      const listWithCategoryName = res.data.all.map(item => ({
        ...item,
        category: normalizeCategory(item.category),
        categoryName: CATEGORY_MAP[normalizeCategory(item.category)] || item.category
      }));
      
      this.setData({
        list: listWithCategoryName,
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
        category: 'other',
        quantity: 1,
        unit: '',
        priority: 0
      },
      categoryIndex: 3  // 默认选 "其他"
    });
  },

  hideModal() {
    this.setData({ showModal: false });
  },

  inputTitle(e) {
    this.setData({ 'formData.title': e.detail.value });
  },

  inputQuantity(e) {
    const value = e.detail.value;
    const num = parseInt(value) || 1;
    this.setData({ 'formData.quantity': num < 1 ? 1 : num });
  },

  increaseQuantity() {
    const current = parseInt(this.data.formData.quantity) || 1;
    this.setData({ 'formData.quantity': current + 1 });
  },

  decreaseQuantity() {
    const current = parseInt(this.data.formData.quantity) || 1;
    if (current > 1) {
      this.setData({ 'formData.quantity': current - 1 });
    }
  },

  inputUnit(e) {
    this.setData({ 'formData.unit': e.detail.value });
  },

  // picker 选择分类 → 存 id
  pickCategory(e) {
    const index = e.detail.value;
    this.setData({
      categoryIndex: index,
      'formData.category': this.data.categories[index].id
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

    const finalUnit = (unit && unit.trim()) || '个';

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
            unit: finalUnit,
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
            unit: finalUnit,
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
    const normalizedCat = normalizeCategory(item.category);
    const categoryIndex = this.data.categories.findIndex(c => c.id === normalizedCat);

    this.setData({
      showModal: true,
      editMode: true,
      editId: item.id,
      formData: {
        title: item.title,
        category: normalizedCat,
        quantity: item.quantity,
        unit: item.unit || '',
        priority: item.priority
      },
      categoryIndex: categoryIndex >= 0 ? categoryIndex : 3
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
  },

  stopPropagation() {}
});