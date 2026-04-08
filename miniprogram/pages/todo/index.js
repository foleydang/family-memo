// pages/todo/index.js
const app = getApp();

Page({
  data: {
    familyId: null,
    list: [],
    filteredList: [],
    stats: { pending: 0, doing: 0, done: 0 },
    currentTab: 'pending',
    showModal: false,
    editMode: false,
    editId: null,
    formData: {
      title: '',
      description: '',
      priority: 0,
      assignee: ''
    },
    members: [],
    assigneeIndex: 0
  },

  onLoad() {
    this.loadMembers();
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

  async loadMembers() {
    if (!app.globalData.familyInfo) return;
    try {
      const res = await app.request({
        url: `/family/${app.globalData.familyInfo.id}`
      });
      this.setData({ members: res.data.members || [] });
    } catch (err) {
      console.error('加载成员失败', err);
    }
  },

  async loadList() {
    if (!this.data.familyId) return;

    try {
      const res = await app.request({
        url: '/todo/list',
        data: { familyId: this.data.familyId, status: 'all' }
      });
      this.setData({
        list: res.data.all,
        stats: res.data.stats
      });
      this.filterList();
    } catch (err) {
      console.error('加载待办失败', err);
    }
  },

  filterList() {
    let filtered = this.data.list.filter(item => {
      return this.data.currentTab === 'all' || item.status === this.data.currentTab;
    });
    // 按优先级和创建时间排序
    filtered.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    this.setData({ filteredList: filtered });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
    this.filterList();
  },

  showAddModal() {
    this.setData({
      showModal: true,
      editMode: false,
      editId: null,
      formData: {
        title: '',
        description: '',
        priority: 0,
        assignee: ''
      },
      assigneeIndex: 0
    });
  },

  hideModal() {
    this.setData({ showModal: false });
  },

  inputTitle(e) {
    this.setData({ 'formData.title': e.detail.value });
  },

  inputDescription(e) {
    this.setData({ 'formData.description': e.detail.value });
  },

  pickAssignee(e) {
    const index = e.detail.value;
    const members = this.data.members;
    this.setData({
      assigneeIndex: index,
      'formData.assignee': index == 0 ? '' : members[index - 1].id
    });
  },

  togglePriority() {
    const priority = this.data.formData.priority;
    this.setData({
      'formData.priority': priority >= 2 ? 0 : priority + 1
    });
  },

  async submitForm() {
    const { title, description, priority, assignee } = this.data.formData;

    if (!title.trim()) {
      wx.showToast({ title: '请输入待办内容', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中' });

    try {
      if (this.data.editMode) {
        await app.request({
          url: `/todo/${this.data.editId}`,
          method: 'PUT',
          data: { title, description, priority, assignee }
        });
      } else {
        await app.request({
          url: '/todo/add',
          method: 'POST',
          data: {
            familyId: this.data.familyId,
            title,
            description,
            priority,
            assignee
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
    const assigneeIndex = this.data.members.findIndex(m => m.id === item.assignee);

    this.setData({
      showModal: true,
      editMode: true,
      editId: item.id,
      formData: {
        title: item.title,
        description: item.description || '',
        priority: item.priority,
        assignee: item.assignee || ''
      },
      assigneeIndex: assigneeIndex >= 0 ? assigneeIndex + 1 : 0
    });
  },

  async toggleItem(e) {
    const item = e.currentTarget.dataset.item;
    const statusFlow = { pending: 'doing', doing: 'done', done: 'pending' };
    const newStatus = statusFlow[item.status];

    try {
      await app.request({
        url: `/todo/${item.id}/status`,
        method: 'PUT',
        data: { status: newStatus }
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
      content: '确定要删除这个待办吗？'
    });

    if (res.confirm) {
      try {
        await app.request({
          url: `/todo/${id}`,
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
      content: '确定要清空所有已完成的待办吗？'
    });

    if (res.confirm) {
      try {
        await app.request({
          url: `/todo/clear-done/${this.data.familyId}`,
          method: 'DELETE'
        });
        wx.showToast({ title: '已清空', icon: 'success' });
        this.loadList();
      } catch (err) {
        wx.showToast({ title: '操作失败', icon: 'none' });
      }
    }
  },

  getStatusText(status) {
    const map = { pending: '待处理', doing: '进行中', done: '已完成' };
    return map[status] || status;
  },

  getPriorityText(priority) {
    const map = ['普通', '重要', '紧急'];
    return map[priority] || '普通';
  },

  getPriorityClass(priority) {
    const map = ['', 'important', 'urgent'];
    return map[priority] || '';
  }
});