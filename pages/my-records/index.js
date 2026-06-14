// pages/my-records/index.js
const app = getApp();

Page({
  data: {
    familyId: null,
    currentTab: 'shopping',
    shoppingList: [],
    todoList: [],
    scheduleList: [],
    loading: false
  },

  onLoad() {
    if (app.globalData.familyInfo) {
      this.setData({ familyId: app.globalData.familyInfo.id });
      this.loadData();
    }
  },

  onShow() {
    if (this.data.familyId) {
      this.loadData();
    }
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  async loadData() {
    if (!this.data.familyId) return;

    this.setData({ loading: true });

    try {
      const [shopping, todo, schedule] = await Promise.all([
        this.loadShopping(),
        this.loadTodo(),
        this.loadSchedule()
      ]);

      this.setData({
        shoppingList: shopping,
        todoList: todo,
        scheduleList: schedule,
        loading: false
      });
    } catch (err) {
      console.error('加载数据失败', err);
      this.setData({ loading: false });
    }
  },

  async loadShopping() {
    try {
      const res = await app.request({
        url: '/shopping/my-records',
        data: { familyId: this.data.familyId }
      });
      return res.data || [];
    } catch (err) {
      return [];
    }
  },

  async loadTodo() {
    try {
      const res = await app.request({
        url: '/todo/my-records',
        data: { familyId: this.data.familyId }
      });
      return res.data || [];
    } catch (err) {
      return [];
    }
  },

  async loadSchedule() {
    try {
      const res = await app.request({
        url: '/schedule/my-records',
        data: { familyId: this.data.familyId }
      });
      return res.data || [];
    } catch (err) {
      return [];
    }
  },

  // 购物操作
  async toggleShopping(e) {
    const id = e.currentTarget.dataset.id;
    try {
      await app.request({
        url: `/shopping/${id}/toggle`,
        method: 'PUT'
      });
      this.loadData();
    } catch (err) {
      console.error('操作失败', err);
    }
  },

  async deleteShopping(e) {
    const id = e.currentTarget.dataset.id;
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这条购物记录吗？'
    });

    if (res.confirm) {
      try {
        await app.request({
          url: `/shopping/${id}`,
          method: 'DELETE'
        });
        wx.showToast({ title: '已删除', icon: 'success' });
        this.loadData();
      } catch (err) {
        wx.showToast({ title: '删除失败', icon: 'none' });
      }
    }
  },

  // 待办操作
  async toggleTodo(e) {
    const item = e.currentTarget.dataset.item;
    const statusFlow = { pending: 'doing', doing: 'done', done: 'pending' };
    const newStatus = statusFlow[item.status];

    try {
      await app.request({
        url: `/todo/${item.id}/status`,
        method: 'PUT',
        data: { status: newStatus }
      });
      this.loadData();
    } catch (err) {
      console.error('操作失败', err);
    }
  },

  async deleteTodo(e) {
    const id = e.currentTarget.dataset.id;
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这条待办记录吗？'
    });

    if (res.confirm) {
      try {
        await app.request({
          url: `/todo/${id}`,
          method: 'DELETE'
        });
        wx.showToast({ title: '已删除', icon: 'success' });
        this.loadData();
      } catch (err) {
        wx.showToast({ title: '删除失败', icon: 'none' });
      }
    }
  },

  // 日程操作
  async deleteSchedule(e) {
    const id = e.currentTarget.dataset.id;
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这条日程记录吗？'
    });

    if (res.confirm) {
      try {
        await app.request({
          url: `/schedule/${id}`,
          method: 'DELETE'
        });
        wx.showToast({ title: '已删除', icon: 'success' });
        this.loadData();
      } catch (err) {
        wx.showToast({ title: '删除失败', icon: 'none' });
      }
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  },

  getStatusText(status) {
    const map = { pending: '待处理', doing: '进行中', done: '已完成' };
    return map[status] || status;
  }
});