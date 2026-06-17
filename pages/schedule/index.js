// pages/schedule/index.js
const app = getApp();

Page({
  data: {
    familyId: null,
    scheduleList: [],
    rawSchedules: [], // 服务器原始数据，不展开循环
    daySchedules: [], // 当天日程
    currentMonth: '',
    currentYear: 0,
    currentMonthNum: 0,
    calendarDays: [],
    selectedDate: '',
    showModal: false,
    editMode: false,
    editId: null,
    formData: {
      title: '',
      type: 'other',
      date: '',
      time: '',
      description: '',
      remind: 0
    },
    types: [
      { name: '生日', value: 'birthday' },
      { name: '预约', value: 'appointment' },
      { name: '出行', value: 'trip' },
      { name: '日程', value: 'schedule' },
      { name: '其他', value: 'other' }
    ],
    typeIndex: 0,
    remindOptions: ['不提醒', '当天', '提前1天', '提前3天', '提前7天'],
    // 提醒值映射：index → remind天数
    // 0: 不提醒(0), 1: 当天(0), 2: 提前1天(1), 3: 提前3天(3), 4: 提前7天(7)
    remindValues: [0, 0, 1, 3, 7],
    remindIndex: 0
  },

  onLoad() {
    this.initCalendar();
  },

  onShow() {
    if (app.globalData.familyInfo) {
      this.setData({ familyId: app.globalData.familyInfo.id });
      this.loadScheduleList();
    }
  },

  onPullDownRefresh() {
    this.loadScheduleList().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  initCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const today = now.getDate();
    const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(today).padStart(2, '0')}`;

    this.setData({
      currentYear: year,
      currentMonthNum: month,
      currentMonth: `${year}年${month}月`,
      selectedDate: todayStr
    });

    this.generateCalendar(year, month);
  },

  generateCalendar(year, month) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();

    const days = [];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // 前置空格
    for (let i = 0; i < startWeekday; i++) {
      days.push({ empty: true });
    }

    // 日期
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasSchedule = this.checkHasSchedule(dateStr);
      const isToday = dateStr === todayStr;

      days.push({
        day: d,
        dateStr,
        isToday,
        hasSchedule,
        selected: dateStr === this.data.selectedDate
      });
    }

    this.setData({ calendarDays: days });
  },

  checkHasSchedule(dateStr) {
    return this.data.scheduleList.some(s => s.schedule_date === dateStr);
  },

  prevMonth() {
    let { currentYear, currentMonthNum } = this.data;
    if (currentMonthNum === 1) {
      currentYear--;
      currentMonthNum = 12;
    } else {
      currentMonthNum--;
    }
    this.setData({
      currentYear,
      currentMonthNum,
      currentMonth: `${currentYear}年${currentMonthNum}月`
    });
    // 只重新展开循环日程，不重新请求服务器
    this.expandAndRender();
  },

  nextMonth() {
    let { currentYear, currentMonthNum } = this.data;
    if (currentMonthNum === 12) {
      currentYear++;
      currentMonthNum = 1;
    } else {
      currentMonthNum++;
    }
    this.setData({
      currentYear,
      currentMonthNum,
      currentMonth: `${currentYear}年${currentMonthNum}月`
    });
    // 只重新展开循环日程，不重新请求服务器
    this.expandAndRender();
  },

  // 从 rawSchedules 展开循环日程并渲染
  expandAndRender() {
    const expandedList = this.expandRecurringSchedules(this.data.rawSchedules);
    this.setData({ scheduleList: expandedList });
    this.generateCalendar(this.data.currentYear, this.data.currentMonthNum);
    this.updateDaySchedules(this.data.selectedDate);
  },

  selectDay(e) {
    const dateStr = e.currentTarget.dataset.date;
    this.setData({ selectedDate: dateStr });
    this.generateCalendar(this.data.currentYear, this.data.currentMonthNum);
    this.updateDaySchedules(dateStr);

    // 设置表单日期
    this.setData({
      'formData.date': dateStr
    });
  },

  updateDaySchedules(date) {
    const daySchedules = this.data.scheduleList.filter(s => s.schedule_date === date);
    this.setData({ daySchedules });
  },

  async loadScheduleList() {
    if (!this.data.familyId) return;

    try {
      const res = await app.request({
        url: '/schedule/list',
        data: { familyId: this.data.familyId }
      });
      
      const rawSchedules = res.data || [];
      const expandedList = this.expandRecurringSchedules(rawSchedules);
      
      this.setData({ 
        rawSchedules,
        scheduleList: expandedList 
      });
      this.generateCalendar(this.data.currentYear, this.data.currentMonthNum);
      this.updateDaySchedules(this.data.selectedDate);
    } catch (err) {
      console.error('加载日程失败', err);
    }
  },
  
  // 展开循环日程到每一天
  expandRecurringSchedules(schedules) {
    const { currentYear, currentMonthNum } = this.data;
    const expanded = [];
    
    schedules.forEach(schedule => {
      const recurring = schedule.recurring || schedule.repeat_type || 'none';
      
      if (recurring === 'none') {
        // 非循环日程，直接添加
        expanded.push(schedule);
      } else if (recurring === 'daily') {
        // 每日循环：在当前月份的每一天都显示
        const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          expanded.push({
            ...schedule,
            schedule_date: dateStr,
            isRecurring: true
          });
        }
      } else if (recurring === 'weekly') {
        // 每周循环：在当前月份的匹配星期几显示
        const originalDate = new Date(schedule.schedule_date);
        const targetWeekday = originalDate.getDay(); // 0-6, 周日-周六
        const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(currentYear, currentMonthNum - 1, d);
          if (date.getDay() === targetWeekday) {
            const dateStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            expanded.push({
              ...schedule,
              schedule_date: dateStr,
              isRecurring: true
            });
          }
        }
      } else if (recurring === 'monthly') {
        // 每月循环：在当前月份的同一日期显示
        const originalDay = new Date(schedule.schedule_date).getDate();
        const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
        if (originalDay <= daysInMonth) {
          const dateStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}-${String(originalDay).padStart(2, '0')}`;
          expanded.push({
            ...schedule,
            schedule_date: dateStr,
            isRecurring: true
          });
        }
      } else if (recurring === 'yearly') {
        // 每年循环：在当前月份且日期匹配时显示（如生日）
        const originalDate = new Date(schedule.schedule_date);
        const originalMonth = originalDate.getMonth() + 1;
        const originalDay = originalDate.getDate();
        if (originalMonth === currentMonthNum) {
          const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
          if (originalDay <= daysInMonth) {
            const dateStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}-${String(originalDay).padStart(2, '0')}`;
            expanded.push({
              ...schedule,
              schedule_date: dateStr,
              isRecurring: true
            });
          }
        }
      }
    });
    
    return expanded;
  },

  getDaySchedules() {
    return this.data.scheduleList.filter(s => s.schedule_date === this.data.selectedDate);
  },

  showAddModal() {
    this.setData({
      showModal: true,
      editMode: false,
      editId: null,
      formData: {
        title: '',
        type: 'other',
        date: this.data.selectedDate,
        time: '',
        description: '',
        remind: 0
      },
      typeIndex: 0,
      remindIndex: 0
    });
  },

  hideModal() {
    this.setData({ showModal: false });
  },

  stopPropagation() {
    // 阻止事件冒泡，空方法即可
  },

  inputTitle(e) {
    this.setData({ 'formData.title': e.detail.value });
  },

  inputTime(e) {
    this.setData({ 'formData.time': e.detail.value });
  },

  onDateChange(e) {
    this.setData({ 'formData.date': e.detail.value });
  },

  inputDescription(e) {
    this.setData({ 'formData.description': e.detail.value });
  },

  pickType(e) {
    const index = e.detail.value;
    this.setData({
      typeIndex: index,
      'formData.type': this.data.types[index].value
    });
  },

  pickRemind(e) {
    const index = e.detail.value;
    this.setData({
      remindIndex: index,
      'formData.remind': this.data.remindValues[index]
    });
  },

  async submitForm() {
    const { title, type, date, time, description, remind } = this.data.formData;

    if (!title.trim()) {
      wx.showToast({ title: '请输入日程标题', icon: 'none' });
      return;
    }

    if (!date) {
      wx.showToast({ title: '请选择日期', icon: 'none' });
      return;
    }

    if (!this.data.familyId) {
      wx.showToast({ title: '请先创建或加入家庭', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中' });

    try {
      if (this.data.editMode) {
        await app.request({
          url: `/schedule/${this.data.editId}`,
          method: 'PUT',
          data: { title, type, date, time, description, remind }
        });
      } else {
        await app.request({
          url: '/schedule/add',
          method: 'POST',
          data: {
            familyId: this.data.familyId,
            title,
            type,
            date,
            time,
            description,
            remind
          }
        });
      }

      wx.hideLoading();
      wx.showToast({ title: this.data.editMode ? '已保存' : '已添加', icon: 'success' });
      this.hideModal();
      this.loadScheduleList();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  editItem(e) {
    const item = e.currentTarget.dataset.item;
    const typeIndex = this.data.types.findIndex(t => t.value === item.type);
    
    // remind 反向映射：0→index 0(不提醒), 0→index 1(当天), 1→index 2(提前1天), 3→index 3(提前3天), 7→index 4(提前7天)
    // 注意 remind=0 时优先选 "当天"（index 1），因为用户之前选了提醒
    const remindReverseMap = { 0: 1, 1: 2, 3: 3, 7: 4 };
    let remindIndex;
    if (item.remind === undefined || item.remind === null) {
      remindIndex = 0; // 不提醒
    } else if (item.remind === 0) {
      // 区分：如果 remind 是 0，可能是"当天"也可能是"不提醒"
      // 默认选"当天"更合理（用户选了提醒意图）
      remindIndex = 1;
    } else {
      remindIndex = remindReverseMap[item.remind] || 0;
    }

    this.setData({
      showModal: true,
      editMode: true,
      editId: item.id,
      formData: {
        title: item.title,
        type: item.type,
        date: item.schedule_date,
        time: item.time || '',
        description: item.description || '',
        remind: item.remind || 0
      },
      typeIndex: typeIndex >= 0 ? typeIndex : 0,
      remindIndex
    });
  },

  async deleteItem(e) {
    const id = e.currentTarget.dataset.id;

    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这个日程吗？'
    });

    if (res.confirm) {
      try {
        await app.request({
          url: `/schedule/${id}`,
          method: 'DELETE'
        });
        wx.showToast({ title: '已删除', icon: 'success' });
        this.loadScheduleList();
      } catch (err) {
        wx.showToast({ title: '删除失败', icon: 'none' });
      }
    }
  }
});