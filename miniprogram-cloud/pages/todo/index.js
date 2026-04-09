// pages/todo/index.js - 云开发版本
const app = getApp()

Page({
  data: {
    todos: [],
    familyInfo: null,
    showAdd: false,
    newTodo: { title: '', description: '', priority: 0, dueDate: '' }
  },

  onLoad() {
    this.checkFamily()
  },

  onShow() {
    this.loadTodos()
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

  async loadTodos() {
    if (!this.checkFamily()) return
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'todo',
        data: {
          action: 'list',
          data: { familyId: this.data.familyInfo._id }
        }
      })
      
      if (res.result.success) {
        this.setData({ todos: res.result.data })
      }
    } catch (err) {
      console.error('加载待办失败', err)
    }
  },

  showAddTodo() {
    this.setData({ showAdd: true, newTodo: { title: '', description: '', priority: 0, dueDate: '' } })
  },

  hideAddTodo() {
    this.setData({ showAdd: false })
  },

  onTitleInput(e) {
    this.setData({ 'newTodo.title': e.detail.value })
  },

  onDescInput(e) {
    this.setData({ 'newTodo.description': e.detail.value })
  },

  onDateChange(e) {
    this.setData({ 'newTodo.dueDate': e.detail.value })
  },

  async addTodo() {
    if (!this.data.newTodo.title.trim()) {
      return wx.showToast({ title: '请输入待办事项', icon: 'none' })
    }
    
    wx.showLoading({ title: '添加中' })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'todo',
        data: {
          action: 'add',
          data: {
            familyId: this.data.familyInfo._id,
            ...this.data.newTodo
          }
        }
      })
      
      wx.hideLoading()
      
      if (res.result.success) {
        wx.showToast({ title: '添加成功', icon: 'success' })
        this.hideAddTodo()
        this.loadTodos()
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  },

  async toggleTodo(e) {
    const { id } = e.currentTarget.dataset
    
    try {
      await wx.cloud.callFunction({
        name: 'todo',
        data: {
          action: 'toggle',
          data: { _id: id }
        }
      })
      
      this.loadTodos()
    } catch (err) {
      console.error('切换状态失败', err)
    }
  },

  async deleteTodo(e) {
    const { id } = e.currentTarget.dataset
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个待办吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await wx.cloud.callFunction({
              name: 'todo',
              data: {
                action: 'delete',
                data: { _id: id }
              }
            })
            
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadTodos()
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  }
})
