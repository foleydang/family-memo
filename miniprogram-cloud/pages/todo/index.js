// pages/todo/index.js - 云开发版本
const app = getApp()

Page({
  data: {
    todos: [],
    filteredList: [],
    familyInfo: null,
    showModal: false,
    editMode: false,
    currentTab: 'all',
    formData: {
      _id: '',
      title: '',
      description: '',
      priority: 0,
      assigneeId: ''
    },
    members: [],
    memberNames: ['不指派'],
    assigneeIndex: 0,
    stats: { pending: 0, done: 0 }
  },

  onLoad() {
    this.checkFamily()
  },

  onShow() {
    this.loadTodos()
    this.loadMembers()
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

  async loadMembers() {
    if (!this.data.familyInfo) return
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'family',
        data: {
          action: 'getMembers',
          data: { familyId: this.data.familyInfo._id }
        }
      })
      
      if (res.result.success) {
        const members = res.result.data
        const memberNames = ['不指派', ...members.map(m => m.nickname || '成员')]
        this.setData({ members, memberNames })
      }
    } catch (err) {
      console.error('加载成员失败', err)
    }
  },

  updateFilteredList() {
    let list = this.data.todos.map(item => ({
      ...item,
      assigneeName: this.getAssigneeName(item.assigneeId)
    }))
    if (this.data.currentTab !== 'all') {
      list = list.filter(i => i.status === this.data.currentTab)
    }
    this.setData({ filteredList: list })
  },

  getAssigneeName(assigneeId) {
    if (!assigneeId) return ''
    const member = this.data.members.find(m => m._id === assigneeId)
    return member ? (member.nickname || '成员') : ''
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
        const todos = res.result.data
        const pending = todos.filter(i => i.status === 'pending').length
        const done = todos.filter(i => i.status === 'done').length
        this.setData({ todos, stats: { pending, done } })
        this.updateFilteredList()
      }
    } catch (err) {
      console.error('加载待办失败', err)
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab || 'all'
    this.setData({ currentTab: tab })
    this.updateFilteredList()
  },

  showAddModal() {
    this.setData({
      showModal: true,
      editMode: false,
      formData: { _id: '', title: '', description: '', priority: 0, assigneeId: '' },
      assigneeIndex: 0
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

  togglePriority(e) {
    const level = parseInt(e.currentTarget.dataset.level) || 0
    this.setData({ 'formData.priority': level })
  },

  pickAssignee(e) {
    const index = parseInt(e.detail.value)
    const assigneeId = index === 0 ? '' : (this.data.members[index - 1]?._id || '')
    this.setData({ assigneeIndex: index, 'formData.assigneeId': assigneeId })
  },

  editItem(e) {
    const item = e.currentTarget.dataset.item
    const assigneeIndex = item.assigneeId 
      ? this.data.members.findIndex(m => m._id === item.assigneeId) + 1 
      : 0
    this.setData({
      showModal: true,
      editMode: true,
      formData: {
        _id: item._id,
        title: item.title,
        description: item.description || '',
        priority: item.priority || 0,
        assigneeId: item.assigneeId || ''
      },
      assigneeIndex: assigneeIndex >= 0 ? assigneeIndex : 0
    })
  },

  async submitForm() {
    if (!this.data.formData.title.trim()) {
      return wx.showToast({ title: '请输入待办内容', icon: 'none' })
    }
    
    wx.showLoading({ title: this.data.editMode ? '保存中' : '添加中' })
    
    try {
      const action = this.data.editMode ? 'update' : 'add'
      const res = await wx.cloud.callFunction({
        name: 'todo',
        data: {
          action,
          data: {
            _id: this.data.formData._id,
            familyId: this.data.familyInfo._id,
            title: this.data.formData.title.trim(),
            description: this.data.formData.description,
            priority: this.data.formData.priority,
            assigneeId: this.data.formData.assigneeId
          }
        }
      })
      
      wx.hideLoading()
      
      if (res.result.success) {
        wx.showToast({ title: this.data.editMode ? '已保存' : '添加成功', icon: 'success' })
        this.hideModal()
        this.loadTodos()
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async toggleItem(e) {
    const item = e.currentTarget.dataset.item
    
    // 两态切换: pending <-> done
    const newStatus = item.status === 'done' ? 'pending' : 'done'
    
    try {
      await wx.cloud.callFunction({
        name: 'todo',
        data: {
          action: 'toggle',
          data: { _id: item._id }
        }
      })
      
      this.loadTodos()
    } catch (err) {
      console.error('切换状态失败', err)
    }
  },

  async deleteItem(e) {
    const id = e.currentTarget.dataset.id
    
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
  },

  async clearDone() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有已完成待办吗？',
      success: async (res) => {
        if (res.confirm) {
          const doneItems = this.data.todos.filter(i => i.status === 'done')
          wx.showLoading({ title: '清空中' })
          
          try {
            for (const item of doneItems) {
              await wx.cloud.callFunction({
                name: 'todo',
                data: { action: 'delete', data: { _id: item._id } }
              })
            }
            wx.hideLoading()
            wx.showToast({ title: '已清空', icon: 'success' })
            this.loadTodos()
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '清空失败', icon: 'none' })
          }
        }
      }
    })
  },

  stopPropagation() {}
})
