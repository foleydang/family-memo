// pages/index/index.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    familyInfo: null,
    members: [],
    shoppingList: [],
    shoppingStats: { pending: 0, done: 0 },
    todoList: [],
    todoStats: { pending: 0, doing: 0, done: 0 },
    scheduleList: [],
    greeting: '',
    todayStr: ''
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    this.refreshData();
  },

  onPullDownRefresh() {
    this.refreshData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async initPage() {
    // 设置问候语
    const hour = new Date().getHours();
    let greeting = '你好';
    if (hour < 6) greeting = '夜深了';
    else if (hour < 9) greeting = '早上好';
    else if (hour < 12) greeting = '上午好';
    else if (hour < 14) greeting = '中午好';
    else if (hour < 18) greeting = '下午好';
    else if (hour < 22) greeting = '晚上好';
    else greeting = '夜深了';

    const today = new Date();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    this.setData({
      greeting,
      todayStr: `${today.getMonth() + 1}月${today.getDate()}日 星期${weekDays[today.getDay()]}`
    });

    // 检查登录
    if (!app.globalData.token) {
      try {
        await app.login();
        this.setData({ userInfo: app.globalData.userInfo });
      } catch (err) {
        console.error('登录失败', err);
      }
    } else {
      this.setData({ userInfo: app.globalData.userInfo });
    }

    this.refreshData();
  },

  async refreshData() {
    if (!app.globalData.token) return;

    try {
      await app.getUserInfo();
      this.setData({
        userInfo: app.globalData.userInfo,
        familyInfo: app.globalData.familyInfo
      });

      if (app.globalData.familyInfo) {
        await Promise.all([
          this.loadShoppingList(),
          this.loadTodoList(),
          this.loadScheduleList(),
          this.loadFamilyMembers()
        ]);
      }
    } catch (err) {
      console.error('刷新数据失败', err);
    }
  },

  async loadShoppingList() {
    try {
      const res = await app.request({
        url: '/shopping/list',
        data: { familyId: this.data.familyInfo.id, status: 'pending' }
      });
      this.setData({
        shoppingList: res.data.pending.slice(0, 3),
        shoppingStats: res.data.stats
      });
    } catch (err) {
      console.error('加载购物清单失败', err);
    }
  },

  async loadTodoList() {
    try {
      const res = await app.request({
        url: '/todo/list',
        data: { familyId: this.data.familyInfo.id, status: 'pending' }
      });
      this.setData({
        todoList: res.data.pending.slice(0, 3),
        todoStats: res.data.stats
      });
    } catch (err) {
      console.error('加载待办失败', err);
    }
  },

  async loadScheduleList() {
    try {
      const res = await app.request({
        url: '/schedule/upcoming',
        data: { familyId: this.data.familyInfo.id, days: 7 }
      });

      const scheduleList = res.data.map(item => {
        const date = new Date(item.schedule_date);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let day = date.getDate().toString();
        let week = '';

        if (date.toDateString() === today.toDateString()) {
          week = '今天';
        } else if (date.toDateString() === tomorrow.toDateString()) {
          week = '明天';
        } else {
          const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
          week = weekDays[date.getDay()];
        }

        const typeNames = {
          birthday: '生日',
          anniversary: '纪念日',
          appointment: '预约',
          meeting: '会议',
          trip: '出行',
          other: '其他'
        };

        return {
          ...item,
          day,
          week,
          typeName: typeNames[item.type] || '其他'
        };
      });

      this.setData({ scheduleList });
    } catch (err) {
      console.error('加载日程失败', err);
    }
  },

  async loadFamilyMembers() {
    try {
      const res = await app.request({
        url: `/family/${this.data.familyInfo.id}`
      });
      this.setData({ members: res.data.members });
    } catch (err) {
      console.error('加载成员失败', err);
    }
  },

  handleLogin() {
    wx.showLoading({ title: '登录中' });
    app.login().then(() => {
      wx.hideLoading();
      this.setData({ userInfo: app.globalData.userInfo });
      this.refreshData();
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '登录失败', icon: 'none' });
    });
  },

  handleCreateFamily() {
    wx.navigateTo({ url: '/pages/family/index?action=create' });
  },

  handleJoinFamily() {
    wx.navigateTo({ url: '/pages/family/index?action=join' });
  },

  goToShopping() {
    wx.switchTab({ url: '/pages/shopping/index' });
  },

  goToTodo() {
    wx.switchTab({ url: '/pages/todo/index' });
  },

  goToSchedule() {
    wx.switchTab({ url: '/pages/schedule/index' });
  },

  goToFamily() {
    wx.switchTab({ url: '/pages/family/index' });
  }
});