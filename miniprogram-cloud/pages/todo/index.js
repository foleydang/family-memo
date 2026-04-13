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
    stats: { pending: 0, doing: 0, done: 0 },
    togglingId: ''
  },

  onLoad() {
    this.checkStatus()
  },

  onShow() {
    this.checkStatus()
    if (app.globalData.familyInfo) {
      this.loadTodos()
      this.loadMembers()
    }
  },

  checkStatus() {
    if (!app.globalData.userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => { wx.switchTab({ url: '/pages/index/index' }) }
      })
      return false
    }
    
    if (!app.globalData.familyInfo) {
      wx.showModal({
        title: '提示',
        content: '请先创建或加入家庭',
        showCancel: false,
        success: () => { wx.navigateTo({ url: '/pages/family/index' }) }
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
        data: { action: 'getMembers', data: { familyId: this.data.familyInfo._id } }
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

  updateStats() {
    const todos = this.data.todos
    const pending = todos.filter(i => i.status === 'pending').length
    const doing = todos.filter(i => i.status === 'doing').length
    const done = todos.filter(i => i.status === 'done').length
    this.setData({ stats: { pending, doing, done } })
  },

  updateFilteredList() {
    let list = this.data.todos.map(item => {
      const assignee = this.data.members.find(m => m._id === item.assigneeId)
      return {
        ...item,
        assigneeName: assignee ? (assignee.nickname || '成员') : '',
        assigneeAvatar: assignee ? assignee.avatarUrl : '',
        createTime: this.formatTime(item.createTime)
      }
    })
    if (this.data.currentTab !== 'all') {
      list = list.filter(i => i.status === this.data.currentTab)
    }
    this.setData({ filteredList: list })
  },

  formatTime(time) {
    if (!time) return ''
    const date = new Date(time)
    const now = new Date()
    const diff = now - date
    
    // 一天内显示"今天 HH:mm"
    if (diff < 24 * 60 * 60 * 1000) {
      const h = String(date.getHours()).padStart(2, '0')
      const m = String(date.getMinutes()).padStart(2, '0')
      return `今天 ${h}:${m}`
    }
    
    // 一周内显示"X天前"
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000))
      return `${days}天前`
    }
    
    // 其他显示日期
    const y = date.getFullYear()
    const mon = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${mon}-${d}`
  },

  async loadTodos() {
    if (!this.data.familyInfo) return
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'todo',
        data: { action: 'list', data: { familyId: this.data.familyInfo._id } }
      })
      
      if (res.result.success) {
        this.setData({ todos: res.result.data })
        this.updateStats()
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
            assigneeId: this.data.formData.assigneeId,
            sendNotify: this.data.formData.assigneeId ? true : false  // 有指派人时发送通知
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
    
    if (this.data.togglingId === item._id) return
    
    const statusFlow = { pending: 'doing', doing: 'done', done: 'pending' }
    const newStatus = statusFlow[item.status]
    
    const todos = this.data.todos.map(t => {
      if (t._id === item._id) {
        return { ...t, status: newStatus }
      }
      return t
    })
    
    this.setData({ togglingId: item._id, todos })
    this.updateStats()
    this.updateFilteredList()
    
    try {
      await wx.cloud.callFunction({
        name: 'todo',
        data: { action: 'toggle', data: { _id: item._id, status: newStatus } }
      })
    } catch (err) {
      await this.loadTodos()
    } finally {
      this.setData({ togglingId: '' })
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
              data: { action: 'delete', data: { _id: id } }
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
