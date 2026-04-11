// pages/export/index.js - 云开发版本
const app = getApp();

Page({
  data: {
    familyId: null,
    exportTypes: [
      { id: 'shopping', name: '购物清单', icon: '🛒', count: 0 },
      { id: 'todo', name: '待办事项', icon: '📋', count: 0 },
      { id: 'schedule', name: '日程安排', icon: '📅', count: 0 }
    ],
    loading: false
  },

  onLoad() {
    if (app.globalData.familyInfo) {
      this.setData({ familyId: app.globalData.familyInfo._id });
      this.loadCounts();
    }
  },

  onShow() {
    if (this.data.familyId) {
      this.loadCounts();
    }
  },

  async loadCounts() {
    if (!this.data.familyId) return;

    try {
      const [shopping, todo, schedule] = await Promise.all([
        this.getCount('shopping'),
        this.getCount('todo'),
        this.getCount('schedule')
      ]);

      const exportTypes = this.data.exportTypes.map(item => {
        if (item.id === 'shopping') return { ...item, count: shopping };
        if (item.id === 'todo') return { ...item, count: todo };
        if (item.id === 'schedule') return { ...item, count: schedule };
        return item;
      });

      this.setData({ exportTypes });
    } catch (err) {
      console.error('加载数量失败', err);
    }
  },

  async getCount(type) {
    try {
      const res = await wx.cloud.callFunction({
        name: type,
        data: { 
          action: 'list', 
          data: { familyId: this.data.familyId } 
        }
      });
      return res.result?.data?.length || 0;
    } catch (err) {
      return 0;
    }
  },

  async exportData(e) {
    const type = e.currentTarget.dataset.type;
    const exportType = this.data.exportTypes.find(t => t.id === type);

    if (exportType.count === 0) {
      wx.showToast({ title: '暂无数据可导出', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '生成中...' });

    try {
      const data = await this.fetchData(type);
      const text = this.formatData(type, data);

      wx.hideLoading();

      wx.setClipboardData({
        data: text,
        success: () => {
          wx.showModal({
            title: '导出成功',
            content: exportType.name + '已复制到剪贴板，可粘贴到微信或备忘录',
            showCancel: false
          });
        }
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '导出失败', icon: 'none' });
    }
  },

  async fetchData(type) {
    const res = await wx.cloud.callFunction({
      name: type,
      data: { 
        action: 'list', 
        data: { familyId: this.data.familyId } 
      }
    });
    return res.result?.data || [];
  },

  formatData(type, data) {
    const now = new Date().toLocaleString('zh-CN');
    let text = '📱 家庭备忘录 - ' + this.getTypeName(type) + '\n';
    text += '📅 导出时间: ' + now + '\n';
    text += '━━━━━━━━━━━━━━━\n\n';

    if (type === 'shopping') {
      text += this.formatShopping(data);
    } else if (type === 'todo') {
      text += this.formatTodo(data);
    } else if (type === 'schedule') {
      text += this.formatSchedule(data);
    }

    return text;
  },

  formatShopping(data) {
    let text = '';
    const pending = data.filter(item => item.status === 'pending');
    const done = data.filter(item => item.status === 'done');

    if (pending.length > 0) {
      text += '🛒 待购买 (' + pending.length + ')\n';
      pending.forEach((item, i) => {
        text += (i + 1) + '. ' + item.title + ' ×' + (item.quantity || 1) + (item.unit || '个');
        if (item.category && item.category !== 'other') {
          text += ' [' + this.getCategoryName(item.category) + ']';
        }
        text += '\n';
      });
      text += '\n';
    }

    if (done.length > 0) {
      text += '✅ 已购买 (' + done.length + ')\n';
      done.forEach((item, i) => {
        text += (i + 1) + '. ' + item.title + '\n';
      });
    }

    return text;
  },

  getCategoryName(categoryId) {
    const categories = [
      { id: 'fresh', name: '生鲜' },
      { id: 'food', name: '食品' },
      { id: 'daily', name: '日用' },
      { id: 'other', name: '其他' }
    ];
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : '其他';
  },

  formatTodo(data) {
    let text = '';
    const priorityEmoji = { 0: '', 1: '⚠️', 2: '❗' };

    data.forEach((item, i) => {
      const emoji = item.status === 'done' ? '✅' : item.status === 'doing' ? '🔄' : '⏳';
      const priority = priorityEmoji[item.priority] || '';
      text += emoji + ' ' + priority + item.title + '\n';
      if (item.description) {
        text += '   ' + item.description + '\n';
      }
    });

    return text;
  },

  formatSchedule(data) {
    let text = '';
    const typeEmoji = {
      birthday: '🎂',
      anniversary: '💕',
      appointment: '📋',
      meeting: '📅',
      trip: '✈️',
      other: '📌'
    };

    data.forEach(item => {
      const emoji = typeEmoji[item.type] || '📌';
      text += emoji + ' ' + item.scheduleDate;
      if (item.scheduleTime) {
        text += ' ' + item.scheduleTime;
      }
      text += ' ' + item.title + '\n';
    });

    return text;
  },

  getTypeName(type) {
    const map = {
      shopping: '购物清单',
      todo: '待办事项',
      schedule: '日程安排'
    };
    return map[type] || type;
  },

  async exportAll() {
    if (!this.data.familyId) {
      wx.showToast({ title: '请先加入家庭', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '生成中...' });

    try {
      const [shopping, todo, schedule] = await Promise.all([
        this.fetchData('shopping'),
        this.fetchData('todo'),
        this.fetchData('schedule')
      ]);

      const now = new Date().toLocaleString('zh-CN');
      let text = '📱 家庭备忘录 - 完整导出\n';
      text += '📅 导出时间: ' + now + '\n';
      text += '━━━━━━━━━━━━━━━\n\n';

      text += '🛒 购物清单\n';
      text += this.formatShopping(shopping);
      text += '\n';

      text += '📋 待办事项\n';
      text += this.formatTodo(todo);
      text += '\n';

      text += '📅 日程安排\n';
      text += this.formatSchedule(schedule);

      wx.hideLoading();

      wx.setClipboardData({
        data: text,
        success: () => {
          wx.showModal({
            title: '导出成功',
            content: '所有数据已复制到剪贴板',
            showCancel: false
          });
        }
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '导出失败', icon: 'none' });
    }
  }
});
