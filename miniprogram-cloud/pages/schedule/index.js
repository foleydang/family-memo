// pages/schedule/index.js - 云开发版本
const app = getApp()

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
      time: '',
      type: 'other'
    },
    types: [
      { value: 'birthday', name: '生日' },
      { value: 'anniversary', name: '纪念日' },
      { value: 'event', name: '活动' },
      { value: 'other', name: '其他' }
    ],
    typeIndex: 3,
    remindOptions: ['不提醒', '当天提醒', '提前1天', '提前3天'],
    remindIndex: 0
  },

  onLoad() {
    this.checkFamily()
    this.initCalendar()
  },

  onShow() {
    this.loadSchedules()
  },

  checkFamily() {
    if (!app.globalData.familyInfo) {
      wx.showModal({
        title: '提示',
        content: '请先创建或加入家庭',
        showCancel: false,
        success: () => {
          wx.switchTab({ url: '/pages/index/index' })
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

  generateCalendar(date) {
    const year = date.getFullYear()
    const month = date.getMonth()
    
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', 
                        '七月', '八月', '九月', '十月', '十一月', '十二月']
    
    // 当月第一天
    const firstDay = new Date(year, month, 1)
    const firstDayWeek = firstDay.getDay()
    
    // 当月天数
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    // 今天
    const today = new Date()
    const todayStr = this.formatDate(today)
    
    const calendarDays = []
    
    // 填充空白天
    for (let i = 0; i < firstDayWeek; i++) {
      calendarDays.push({ empty: true })
    }
    
    // 填充日期
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      calendarDays.push({
        day: d,
        dateStr,
        isToday: dateStr === todayStr,
        selected: dateStr === this.data.selectedDateStr,
        hasSchedule: this.data.schedules.some(s => s.scheduleDate === dateStr)
      })
    }
    
    this.setData({
      currentMonth: `${year}年 ${monthNames[month]}`,
      calendarDays
    })
  },

  async loadSchedules() {
    if (!this.checkFamily()) return
    
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
        this.generateCalendar(new Date())
        this.loadDaySchedules()
      }
    } catch (err) {
      console.error('加载日程失败', err)
    }
  },

  loadDaySchedules() {
    const daySchedules = this.data.schedules
      .filter(s => s.scheduleDate === this.data.selectedDateStr)
      .map(s => ({
        ...s,
        typeName: this.getTypeName(s.type),
        time: s.scheduleTime || ''
      }))
    
    const date = new Date(this.data.selectedDateStr)
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const selectedDate = `${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`
    
    this.setData({ daySchedules, selectedDate })
  },

  getTypeName(type) {
    const typeMap = { birthday: '生日', anniversary: '纪念日', event: '活动', other: '其他' }
    return typeMap[type] || '其他'
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
        time: '',
        type: 'other'
      },
      typeIndex: 3,
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

  inputTime(e) {
    this.setData({ 'formData.time': e.detail.value })
  },

  onDateChange(e) {
    this.setData({ 'formData.date': e.detail.value })
  },

  pickType(e) {
    const index = e.detail.value
    this.setData({ typeIndex: index, 'formData.type': this.data.types[index].value })
  },

  pickRemind(e) {
    this.setData({ remindIndex: e.detail.value })
  },

  editItem(e) {
    const item = e.currentTarget.dataset.item
    const typeIndex = this.data.types.findIndex(t => t.value === item.type) || 3
    this.setData({
      showModal: true,
      editMode: true,
      formData: {
        _id: item._id,
        title: item.title,
        description: item.description || '',
        date: item.scheduleDate,
        time: item.scheduleTime || '',
        type: item.type || 'other'
      },
      typeIndex
    })
  },

  async submitForm() {
    if (!this.data.formData.title.trim()) {
      return wx.showToast({ title: '请输入日程标题', icon: 'none' })
    }
    
    if (!this.data.formData.date) {
      return wx.showToast({ title: '请选择日期', icon: 'none' })
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
            scheduleTime: this.data.formData.time,
            type: this.data.formData.type
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
              data: {
                action: 'delete',
                data: { _id: id }
              }
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
