// pages/schedule/index.js - 云开发版本
const app = getApp()

Page({
  data: {
    schedules: [],
    familyInfo: null,
    showAdd: false,
    newSchedule: { title: '', description: '', scheduleDate: '', scheduleTime: '', type: 'other' },
    types: [
      { value: 'birthday', label: '生日' },
      { value: 'anniversary', label: '纪念日' },
      { value: 'event', label: '活动' },
      { value: 'other', label: '其他' }
    ]
  },

  onLoad() {
    this.checkFamily()
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
          wx.switchTab({ url: '/pages/user/index' })
        }
      })
      return false
    }
    this.setData({ familyInfo: app.globalData.familyInfo })
    return true
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
      }
    } catch (err) {
      console.error('加载日程失败', err)
    }
  },

  showAddSchedule() {
    this.setData({ 
      showAdd: true, 
      newSchedule: { title: '', description: '', scheduleDate: '', scheduleTime: '', type: 'other' } 
    })
  },

  hideAddSchedule() {
    this.setData({ showAdd: false })
  },

  onTitleInput(e) {
    this.setData({ 'newSchedule.title': e.detail.value })
  },

  onDescInput(e) {
    this.setData({ 'newSchedule.description': e.detail.value })
  },

  onDateChange(e) {
    this.setData({ 'newSchedule.scheduleDate': e.detail.value })
  },

  onTimeChange(e) {
    this.setData({ 'newSchedule.scheduleTime': e.detail.value })
  },

  onTypeChange(e) {
    this.setData({ 'newSchedule.type': this.data.types[e.detail.value].value })
  },

  async addSchedule() {
    if (!this.data.newSchedule.title.trim()) {
      return wx.showToast({ title: '请输入日程标题', icon: 'none' })
    }
    
    if (!this.data.newSchedule.scheduleDate) {
      return wx.showToast({ title: '请选择日期', icon: 'none' })
    }
    
    wx.showLoading({ title: '添加中' })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'schedule',
        data: {
          action: 'add',
          data: {
            familyId: this.data.familyInfo._id,
            ...this.data.newSchedule
          }
        }
      })
      
      wx.hideLoading()
      
      if (res.result.success) {
        wx.showToast({ title: '添加成功', icon: 'success' })
        this.hideAddSchedule()
        this.loadSchedules()
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  },

  async deleteSchedule(e) {
    const { id } = e.currentTarget.dataset
    
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
  }
})
