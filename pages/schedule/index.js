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
      remind: 0,
      repeatType: 'none'
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
    remindIndex: 0,
    repeatOptions: ['不循环', '每日', '每周', '每月', '每年'],
    repeatIndex: 0,
    repeatValues: ['none', 'daily', 'weekly', 'monthly', 'yearly']
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
    this.expandAndRender();
  },

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
    this.setData({ 'formData.date': dateStr });
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
  
  expandRecurringSchedules(schedules) {
    const { currentYear, currentMonthNum } = this.data;
    const expanded = [];
    
    schedules.forEach(schedule => {
      const recurring = schedule.repeat_type || schedule.recurring || 'none';
      
      if (recurring === 'none') {
        expanded.push(schedule);
      } else if (recurring === 'daily') {
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
        const originalDate = new Date(schedule.schedule_date);
        const targetWeekday = originalDate.getDay();
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
        remind: 0,
        repeatType: 'none'
      },
      typeIndex: 0,
      remindIndex: 0,
      repeatIndex: 0
    });
  },

  hideModal() {
    this.setData({ showModal: false });
  },

  stopPropagation() {},

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

  pickRepeat(e) {
    const index = e.detail.value;
    this.setData({
      repeatIndex: index,
      'formData.repeatType': this.data.repeatValues[index]
    });
  },

  async submitForm() {
    const { title, type, date, time, description, remind, repeatType } = this.data.formData;

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
          data: { title, type, date, time, description, remind, repeatType }
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
            remind,
            repeatType
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
    
    // 后端返回 remind_before，前端用 remind
    const remindBefore = item.remind_before ?? item.remind ?? 0;
    const remindReverseMap = { 0: 1, 1: 2, 3: 3, 7: 4 };
    let remindIndex;
    if (remindBefore === undefined || remindBefore === null) {
      remindIndex = 0;
    } else if (remindBefore === 0) {
      remindIndex = 1; // 当天
    } else {
      remindIndex = remindReverseMap[remindBefore] || 0;
    }

    // 后端返回 repeat_type，前端用 repeatType
    const repeatType = item.repeat_type ?? item.recurring ?? 'none';
    const repeatIndex = this.data.repeatValues.indexOf(repeatType);
    
    // 后端返回 schedule_time，前端用 time
    const scheduleTime = item.schedule_time ?? item.time ?? '';

    this.setData({
      showModal: true,
      editMode: true,
      editId: item.id,
      formData: {
        title: item.title,
        type: item.type,
        date: item.schedule_date,
        time: scheduleTime,
        description: item.description || '',
        remind: remindBefore,
        repeatType
      },
      typeIndex: typeIndex >= 0 ? typeIndex : 0,
      remindIndex,
      repeatIndex: repeatIndex >= 0 ? repeatIndex : 0
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