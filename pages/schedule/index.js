// pages/schedule/index.js
const app = getApp();
const { getMonthHolidays, getDayLabels } = require('../../utils/holidays');

Page({
  data: {
    familyId: null,
    scheduleList: [],
    rawSchedules: [], // 服务器原始数据，不展开循环
    daySchedules: [], // 当天日程
    monthHolidays: {}, // 该月节假日数据
    selectedDateInfo: {}, // 选中日期的标签信息
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
    remindValues: [0, 0, 1, 3, 7],
    remindIndex: 0,
    repeatOptions: ['不循环', '每日', '每周', '每月', '每年'],
    repeatIndex: 0,
    repeatValues: ['none', 'daily', 'weekly', 'monthly', 'yearly']
  },

  onLoad() { this.initCalendar(); },

  onShow() {
    if (app.globalData.familyInfo) {
      this.setData({ familyId: app.globalData.familyInfo.id });
      this.loadScheduleList();
    }
  },

  onPullDownRefresh() {
    this.loadScheduleList().then(() => wx.stopPullDownRefresh());
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

    const monthHolidays = this.data.monthHolidays || {};

    for (let i = 0; i < startWeekday; i++) {
      days.push({ empty: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasSchedule = this.checkHasSchedule(dateStr);
      const isToday = dateStr === todayStr;
      const holidayInfo = monthHolidays[dateStr] || {};
      const isHoliday = holidayInfo.holiday === true;
      const isWorkday = holidayInfo.holiday === false;
      const holidayWage = holidayInfo.wage || 0;
      
      // 右上角标记: 休/班
      let restMark = null, restMarkClass = '';
      if (isHoliday && holidayWage === 2) { restMark = '休'; restMarkClass = 'rest-tag'; }
      if (isWorkday) { restMark = '班'; restMarkClass = 'work-tag'; }
      if (isHoliday && holidayWage === 3) { restMark = '休'; restMarkClass = 'holiday-tag'; }

      // 判断是否是假期正日(前一天不是同一个holidayName)
      let isHolidayMainDay = false;
      if (isHoliday && holidayWage === 3) {
        const prevDateStr = `${year}-${String(month).padStart(2, '0')}-${String(d - 1).padStart(2, '0')}`;
        const prevInfo = monthHolidays[prevDateStr] || {};
        isHolidayMainDay = prevInfo.holidayName !== holidayInfo.holidayName;
      }

      // 下方标签行: 只有假期正日才显示节日名, 其他天只显示"休"
      const dayTags = [];
      
      if (isHoliday && holidayWage === 3 && isHolidayMainDay) {
        const name = holidayInfo.holidayName || '';
        let shortName = name;
        if (name.includes('初') || name.includes('除夕')) shortName = '春节';
        else if (name.includes('清明')) shortName = '清明';
        else if (name.includes('劳动')) shortName = '劳动节';
        else if (name.includes('端午')) shortName = '端午';
        else if (name.includes('中秋')) shortName = '中秋';
        else if (name.includes('国庆')) shortName = '国庆';
        else if (name.includes('元旦')) shortName = '元旦';
        dayTags.push({ text: shortName, cls: 'holiday-tag' });
      }
      if (holidayInfo.term) {
        dayTags.push({ text: holidayInfo.term, cls: 'term-tag' });
      }
      if (holidayInfo.festival) {
        dayTags.push({ text: holidayInfo.festival, cls: 'festival-tag' });
      }
      // 当天日程中的重要类型也加入标签行(最多1个)
      const daySchedTypes = { birthday: '🎂生日', anniversary: '💕纪念日', trip: '✈️出行' };
      this.data.scheduleList.forEach(s => {
        if (s.schedule_date === dateStr && daySchedTypes[s.type]) {
          const tagText = daySchedTypes[s.type];
          if (!dayTags.find(t => t.text === tagText)) {
            dayTags.push({ text: tagText, cls: 'schedule-tag' });
          }
        }
      });
      
      // 只保留最多2个标签
      const displayTags = dayTags.slice(0, 2);

      days.push({
        day: d,
        dateStr,
        isToday,
        hasSchedule,
        selected: dateStr === this.data.selectedDate,
        restMark,
        restMarkClass,
        dayTags: displayTags,
        isHoliday,
        isWorkday,
        holidayWage
      });
    }

    this.setData({ calendarDays: days });
  },

  checkHasSchedule(dateStr) {
    return this.data.scheduleList.some(s => s.schedule_date === dateStr);
  },

  async prevMonth() {
    let { currentYear, currentMonthNum } = this.data;
    if (currentMonthNum === 1) {
      currentYear--; currentMonthNum = 12;
    } else {
      currentMonthNum--;
    }
    this.setData({ currentYear, currentMonthNum, currentMonth: `${currentYear}年${currentMonthNum}月` });
    await this.expandAndRender();
  },

  async nextMonth() {
    let { currentYear, currentMonthNum } = this.data;
    if (currentMonthNum === 12) {
      currentYear++; currentMonthNum = 1;
    } else {
      currentMonthNum++;
    }
    this.setData({ currentYear, currentMonthNum, currentMonth: `${currentYear}年${currentMonthNum}月` });
    await this.expandAndRender();
  },

  async expandAndRender() {
    const expandedList = this.expandRecurringSchedules(this.data.rawSchedules);
    this.setData({ scheduleList: expandedList });
    
    // 加载该月节假日数据
    const monthHolidays = await getMonthHolidays(this.data.currentYear, this.data.currentMonthNum);
    this.setData({ monthHolidays });
    
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
    const typeNames = { birthday: '生日', anniversary: '纪念日', appointment: '预约', meeting: '会议', trip: '出行', schedule: '日程', other: '其他' };
    const daySchedules = this.data.scheduleList.filter(s => s.schedule_date === date).map(s => ({ ...s, typeName: typeNames[s.type] || '其他' }));
    // 计算选中日期的标签信息，传到wxml
    const holidayInfo = this.data.monthHolidays[date] || {};
    const isHoliday = holidayInfo.holiday === true;
    const isWorkday = holidayInfo.holiday === false;
    // 判断是否假期正日(前一天不是同一个holidayName)
    const year = this.data.currentYear;
    const month = this.data.currentMonthNum;
    const dayNum = parseInt(date.split('-')[2]);
    const prevDateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum - 1).padStart(2, '0')}`;
    const prevInfo = this.data.monthHolidays[prevDateStr] || {};
    const isHolidayMainDay = isHoliday && holidayInfo.wage === 3 && prevInfo.holidayName !== holidayInfo.holidayName;
    const selectedDateInfo = {
      holidayName: isHolidayMainDay ? (holidayInfo.holidayName || '') : null,
      holidaySuffix: isHoliday ? '休' : (isWorkday ? '' : null),
      isWorkday,
      term: holidayInfo.term || '',
      termEmoji: holidayInfo.termEmoji || '',
      festival: holidayInfo.festival || null,
      festivalEmoji: holidayInfo.festivalEmoji || null

    };
    this.setData({ daySchedules, selectedDateInfo });
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
      
      // 加载节假日
      const monthHolidays = await getMonthHolidays(this.data.currentYear, this.data.currentMonthNum);
      
      this.setData({ rawSchedules, scheduleList: expandedList, monthHolidays });
      this.generateCalendar(this.data.currentYear, this.data.currentMonthNum);
      this.updateDaySchedules(this.data.selectedDate);
    } catch (err) { console.error('加载日程失败', err) }
  },
  
  expandRecurringSchedules(schedules) {
    const { currentYear, currentMonthNum } = this.data;
    const expanded = [];
    
    schedules.forEach(schedule => {
      const recurring = schedule.recurring || schedule.repeat_type || 'none';
      
      if (recurring === 'none') {
        expanded.push(schedule);
      } else if (recurring === 'daily') {
        const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          expanded.push({ ...schedule, schedule_date: dateStr, isRecurring: true });
        }
      } else if (recurring === 'weekly') {
        const originalDate = new Date(schedule.schedule_date);
        const targetWeekday = originalDate.getDay();
        const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(currentYear, currentMonthNum - 1, d);
          if (date.getDay() === targetWeekday) {
            const dateStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            expanded.push({ ...schedule, schedule_date: dateStr, isRecurring: true });
          }
        }
      } else if (recurring === 'monthly') {
        const originalDay = new Date(schedule.schedule_date).getDate();
        const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
        if (originalDay <= daysInMonth) {
          const dateStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}-${String(originalDay).padStart(2, '0')}`;
          expanded.push({ ...schedule, schedule_date: dateStr, isRecurring: true });
        }
      } else if (recurring === 'yearly') {
        const originalDate = new Date(schedule.schedule_date);
        const originalMonth = originalDate.getMonth() + 1;
        const originalDay = originalDate.getDate();
        if (originalMonth === currentMonthNum) {
          const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
          if (originalDay <= daysInMonth) {
            const dateStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}-${String(originalDay).padStart(2, '0')}`;
            expanded.push({ ...schedule, schedule_date: dateStr, isRecurring: true });
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

  hideModal() { this.setData({ showModal: false }); },

  stopPropagation() {},

  inputTitle(e) { this.setData({ 'formData.title': e.detail.value }); },
  inputTime(e) { this.setData({ 'formData.time': e.detail.value }); },
  onDateChange(e) { this.setData({ 'formData.date': e.detail.value }); },
  inputDescription(e) { this.setData({ 'formData.description': e.detail.value }); },

  pickType(e) {
    const index = e.detail.value;
    this.setData({ typeIndex: index, 'formData.type': this.data.types[index].value });
  },

  pickRemind(e) {
    const index = e.detail.value;
    this.setData({ remindIndex: index, 'formData.remind': this.data.remindValues[index] });
  },

  pickRepeat(e) {
    const index = e.detail.value;
    this.setData({ repeatIndex: index, 'formData.repeatType': this.data.repeatValues[index] });
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
          data: { familyId: this.data.familyId, title, type, date, time, description, remind, repeatType }
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

    const repeatType = item.repeat_type ?? item.recurring ?? 'none';
    const repeatIndex = this.data.repeatValues.indexOf(repeatType);
    
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
    const id = e.currentTarget.dataset.id

    const res = await wx.showModal({ title: '确认删除', content: '确定要删除这个日程吗？' });

    if (res.confirm) {
      try {
        await app.request({ url: `/schedule/${id}`, method: 'DELETE' });
        wx.showToast({ title: '已删除', icon: 'success' });
        this.loadScheduleList();
      } catch (err) { wx.showToast({ title: '删除失败', icon: 'none' }) }
    }
  }
});