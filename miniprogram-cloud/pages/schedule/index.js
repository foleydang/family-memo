// pages/schedule/index.js - 云开发版本
const app = getApp()

const SCHEDULE_REMIND_TEMPLATE_ID = 'bDHCtdW_8crvYVMvD1p0fo_u1vIR0zuKTSPGr8BW1dU'

Page({
  data: {
    schedules: [],
    familyInfo: null,
    showModal: false,
    editMode: false,
    currentMonth: '',
    calendarDays: [],
    selectedDate: '',
    selectedDateStr: '',
    daySchedules: [],
    formData: {
      _id: '',
      title: '',
      description: '',
      date: '',
      startTime: '',
      endTime: '',
      type: 'work',
      recurring: 'none',
      recurringEnd: '',
      remind: 0
    },
    types: [
      { value: 'work', name: '工作/会议' },
      { value: 'event', name: '活动' },
      { value: 'appointment', name: '预约' },
      { value: 'anniversary', name: '纪念日' },
      { value: 'birthday', name: '生日' },
      { value: 'trip', name: '出行' },
      { value: 'holiday', name: '假期' },
      { value: 'other', name: '其他' }
    ],
    typeIndex: 0,
    recurringOptions: ['不重复', '每天', '每周', '每月', '每年'],
    recurringIndex: 0,
    remindOptions: ['不提醒', '当天提醒', '提前1天', '提前3天', '提前7天'],
    remindIndex: 0
  },

  onLoad() {
    this.initPage()
  },

  async initPage() {
    if (this.checkStatus()) {
      this.initCalendar()
      await this.loadSchedules()
    }
  },

  onShow() {
    if (this.checkStatus() && app.globalData.familyInfo) {
      this.loadSchedules()
    }
  },

  checkStatus() {
    if (!app.globalData.userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.switchTab({ url: '/pages/index/index' })
        }
      })
      return false
    }
    
    if (!app.globalData.familyInfo) {
      wx.showModal({
        title: '提示',
        content: '请先创建或加入家庭',
        showCancel: false,
        success: () => {
          wx.switchTab({ url: '/pages/family/index' })
        }
      })
      return false
    }
    
    this.setData({ familyInfo: app.globalData.familyInfo })
    return true
  },

  initCalendar() {
    const today = new Date()
    this.setData({ selectedDateStr: this.formatDate(today) })
    this.generateCalendar(today)
  },

  formatDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  },

  getTypeName(type) {
    const typeObj = this.data.types.find(t => t.value === type)
    return typeObj ? typeObj.name : '其他'
  },

  getRecurringText(recurring) {
    const texts = { none: '', daily: '每天', weekly: '每周', monthly: '每月', yearly: '每年' }
    return texts[recurring] || ''
  },

  getTimeRange(startTime, endTime) {
    if (!startTime && !endTime) return ''
    if (startTime && endTime) return `${startTime} - ${endTime}`
    return startTime || endTime
  },

  generateCalendar(date) {
    const year = date.getFullYear()
    const month = date.getMonth()
    
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', 
                        '七月', '八月', '九月', '十月', '十一月', '十二月']
    
    const firstDay = new Date(year, month, 1)
    const firstDayWeek = firstDay.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    const today = new Date()
    const todayStr = this.formatDate(today)
    
    const calendarDays = []
    
    for (let i = 0; i < firstDayWeek; i++) {
      calendarDays.push({ empty: true })
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const hasSchedule = this.checkHasSchedule(dateStr)
      calendarDays.push({
        day: d,
        dateStr,
        isToday: dateStr === todayStr,
        selected: dateStr === this.data.selectedDateStr,
        hasSchedule
      })
    }
    
    this.setData({
      currentMonth: `${year}年 ${monthNames[month]}`,
      calendarDays
    })
  },

  checkHasSchedule(dateStr) {
    return this.data.schedules.some(s => this.matchSchedule(s, dateStr))
  },

  matchSchedule(s, dateStr) {
    if (s.scheduleDate === dateStr) return true
    
    if (s.recurring && s.recurring !== 'none') {
      const scheduleDate = new Date(s.scheduleDate)
      const checkDate = new Date(dateStr)
      
      if (checkDate < scheduleDate) return false
      if (s.recurringEnd) {
        const endDate = new Date(s.recurringEnd)
        if (checkDate > endDate) return false
      }
      
      if (s.recurring === 'daily') return true
      if (s.recurring === 'weekly' && scheduleDate.getDay() === checkDate.getDay()) return true
      if (s.recurring === 'monthly' && scheduleDate.getDate() === checkDate.getDate()) return true
      if (s.recurring === 'yearly' && 
          scheduleDate.getMonth() === checkDate.getMonth() && 
          scheduleDate.getDate() === checkDate.getDate()) return true
    }
    return false
  },

  async loadSchedules() {
    if (!this.data.familyInfo) return
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'schedule',
        data: {
          action: 'list',
          data: { familyId: this.data.familyInfo._id }
        }
      })
      
      if (res.result.success) {
        this.setData({ schedules: res.result.data })
        this.generateCalendar(new Date(this.data.selectedDateStr))
        this.loadDaySchedules()
      }
    } catch (err) {
      console.error('加载日程失败', err)
    }
  },

  loadDaySchedules() {
    const dateStr = this.data.selectedDateStr
    
    const daySchedules = this.data.schedules.filter(s => this.matchSchedule(s, dateStr)).map(s => ({
      ...s,
      typeName: this.getTypeName(s.type),
      timeRange: this.getTimeRange(s.startTime, s.endTime),
      isRecurring: s.recurring && s.recurring !== 'none',
      recurringText: this.getRecurringText(s.recurring)
    }))
    
    const date = new Date(dateStr)
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const selectedDate = `${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`
    
    this.setData({ daySchedules, selectedDate })
  },

  prevMonth() {
    const current = new Date(this.data.selectedDateStr)
    const prev = new Date(current.getFullYear(), current.getMonth() - 1, 1)
    this.generateCalendar(prev)
  },

  nextMonth() {
    const current = new Date(this.data.selectedDateStr)
    const next = new Date(current.getFullYear(), current.getMonth() + 1, 1)
    this.generateCalendar(next)
  },

  selectDay(e) {
    const dateStr = e.currentTarget.dataset.date
    this.setData({ selectedDateStr: dateStr })
    this.generateCalendar(new Date(dateStr))
    this.loadDaySchedules()
  },

  showAddModal() {
    this.setData({
      showModal: true,
      editMode: false,
      formData: {
        _id: '',
        title: '',
        description: '',
        date: this.data.selectedDateStr,
        startTime: '',
        endTime: '',
        type: 'work',
        recurring: 'none',
        recurringEnd: '',
        remind: 0
      },
      typeIndex: 0,
      recurringIndex: 0,
      remindIndex: 0
    })
  },

  hideModal() {
    this.setData({ showModal: false })
  },

  inputTitle(e) {
    this.setData({ 'formData.title': e.detail.value })
  },

  inputDescription(e) {
    this.setData({ 'formData.description': e.detail.value })
  },

  onDateChange(e) {
    this.setData({ 'formData.date': e.detail.value })
  },

  onStartTimeChange(e) {
    this.setData({ 'formData.startTime': e.detail.value })
  },

  onEndTimeChange(e) {
    this.setData({ 'formData.endTime': e.detail.value })
  },

  onRecurringEndChange(e) {
    this.setData({ 'formData.recurringEnd': e.detail.value })
  },

  pickType(e) {
    const index = parseInt(e.detail.value)
    this.setData({ typeIndex: index, 'formData.type': this.data.types[index].value })
  },

  pickRecurring(e) {
    const index = parseInt(e.detail.value)
    const recurringValues = ['none', 'daily', 'weekly', 'monthly', 'yearly']
    this.setData({ recurringIndex: index, 'formData.recurring': recurringValues[index] })
  },

  pickRemind(e) {
    const index = parseInt(e.detail.value)
    this.setData({ remindIndex: index, 'formData.remind': index })
  },

  editItem(e) {
    const item = e.currentTarget.dataset.item
    const typeIndex = this.data.types.findIndex(t => t.value === item.type)
    const recurringValues = ['none', 'daily', 'weekly', 'monthly', 'yearly']
    const recurringIndex = recurringValues.indexOf(item.recurring || 'none')
    
    this.setData({
      showModal: true,
      editMode: true,
      formData: {
        _id: item._id,
        title: item.title,
        description: item.description || '',
        date: item.scheduleDate,
        startTime: item.startTime || '',
        endTime: item.endTime || '',
        type: item.type || 'work',
        recurring: item.recurring || 'none',
        recurringEnd: item.recurringEnd || '',
        remind: item.remind || 0
      },
      typeIndex: typeIndex >= 0 ? typeIndex : this.data.types.length - 1,
      recurringIndex: recurringIndex >= 0 ? recurringIndex : 0,
      remindIndex: item.remind || 0
    })
  },

  async requestSubscribe() {
    return new Promise((resolve) => {
      wx.requestSubscribeMessage({
        tmplIds: [SCHEDULE_REMIND_TEMPLATE_ID],
        success: (res) => {
          resolve(res[SCHEDULE_REMIND_TEMPLATE_ID] === 'accept')
        },
        fail: () => resolve(false)
      })
    })
  },

  async submitForm() {
    if (!this.data.formData.title.trim()) {
      return wx.showToast({ title: '请输入日程标题', icon: 'none' })
    }
    
    if (!this.data.formData.date) {
      return wx.showToast({ title: '请选择日期', icon: 'none' })
    }
    
    if (this.data.formData.remind > 0) {
      const subscribed = await this.requestSubscribe()
      if (!subscribed) {
        wx.showToast({ title: '未授权提醒功能', icon: 'none' })
      }
    }
    
    wx.showLoading({ title: this.data.editMode ? '保存中' : '添加中' })
    
    try {
      const action = this.data.editMode ? 'update' : 'add'
      const res = await wx.cloud.callFunction({
        name: 'schedule',
        data: {
          action,
          data: {
            _id: this.data.formData._id,
            familyId: this.data.familyInfo._id,
            title: this.data.formData.title.trim(),
            description: this.data.formData.description,
            scheduleDate: this.data.formData.date,
            startTime: this.data.formData.startTime,
            endTime: this.data.formData.endTime,
            type: this.data.formData.type,
            recurring: this.data.formData.recurring,
            recurringEnd: this.data.formData.recurringEnd,
            remind: this.data.formData.remind
          }
        }
      })
      
      wx.hideLoading()
      
      if (res.result.success) {
        wx.showToast({ title: this.data.editMode ? '已保存' : '添加成功', icon: 'success' })
        this.hideModal()
        this.loadSchedules()
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async deleteItem(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个日程吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await wx.cloud.callFunction({
              name: 'schedule',
              data: { action: 'delete', data: { _id: id } }
            })
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadSchedules()
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  stopPropagation() {}
})
