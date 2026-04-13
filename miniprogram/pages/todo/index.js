// pages/todo/index.js - 服务器版本
const app = getApp()

const TODO_TEMPLATE_ID = 'tjimAHRkF_Go-ELPIr3Vqq1K3QB03bCzauINTe6Dqc0'

Page({
  data: {
    todos: [],
    filteredList: [],
    familyInfo: null,
    showModal: false,
    editMode: false,
    currentTab: 'all',
    formData: { id: '', title: '', description: '', priority: 0, assigneeId: '' },
    members: [],
    memberNames: ['不指派'],
    assigneeIndex: 0,
    stats: { pending: 0, doing: 0, done: 0 },
    togglingId: '',
    subscribed: false
  },

  onLoad() { this.checkStatus() },
  
  onShow() {
    this.checkStatus()
    if (app.globalData.familyInfo) {
      this.loadTodos()
      this.loadMembers()
    }
    this.checkSubscribeStatus()
  },

  checkStatus() {
    if (!app.globalData.userInfo) {
      wx.showModal({ title: '提示', content: '请先登录', showCancel: false,
        success: () => { wx.switchTab({ url: '/pages/index/index' }) }
      })
      return false
    }
    if (!app.globalData.familyInfo) {
      wx.showModal({ title: '提示', content: '请先创建或加入家庭', showCancel: false,
        success: () => { wx.navigateTo({ url: '/pages/family/index' }) }
      })
      return false
    }
    this.setData({ familyInfo: app.globalData.familyInfo })
    return true
  },

  checkSubscribeStatus() {
    const subscribed = wx.getStorageSync('subscribeTodo') || false
    this.setData({ subscribed })
  },

  // 订阅提醒
  requestSubscribe(callback) {
    wx.requestSubscribeMessage({
      tmplIds: [TODO_TEMPLATE_ID],
      success: (res) => {
        if (res[TODO_TEMPLATE_ID] === 'accept') {
          wx.setStorageSync('subscribeTodo', true)
          this.setData({ subscribed: true })
          if (callback) callback(true)
        } else {
          if (callback) callback(false)
        }
      },
      fail: (err) => {
        console.error('订阅失败:', err)
        if (callback) callback(false)
      }
    })
  },

  subscribeNotify() {
    this.requestSubscribe()
  },

  async loadMembers() {
    if (!this.data.familyInfo) return
    try {
      const res = await app.request({
        url: `/family/${this.data.familyInfo.id}`
      })
      const members = res.data.members || []
      const memberNames = ['不指派', ...members.map(m => m.name || m.nickname || '成员')]
      this.setData({ members, memberNames })
    } catch (err) { console.error('加载成员失败', err) }
  },

  updateStats() {
    const todos = this.data.todos
    this.setData({
      stats: {
        pending: todos.filter(i => i.status === 'pending').length,
        doing: todos.filter(i => i.status === 'doing').length,
        done: todos.filter(i => i.status === 'done').length
      }
    })
  },

  updateFilteredList() {
    let list = this.data.todos.map(item => {
      const assignee = this.data.members.find(m => m.id === item.assignee_id)
      return {
        ...item,
        assigneeName: assignee ? (assignee.name || assignee.nickname || '成员') : '',
        assigneeAvatar: assignee ? assignee.avatar_url : '',
        timeDisplay: this.formatTimeDisplay(item)
      }
    })
    if (this.data.currentTab !== 'all') {
      list = list.filter(i => i.status === this.data.currentTab)
    } else {
      list = this.sortTodos(list)
    }
    this.setData({ filteredList: list })
  },

  sortTodos(list) {
    const statusPriority = { pending: 0, doing: 1, done: 2 }
    return list.sort((a, b) => {
      const statusDiff = statusPriority[a.status] - statusPriority[b.status]
      if (statusDiff !== 0) return statusDiff
      const timeA = a.updated_at || a.created_at
      const timeB = b.updated_at || b.created_at
      return new Date(timeB) - new Date(timeA)
    })
  },

  formatTimeDisplay(item) {
    if (item.status === 'done' && item.done_at) return '完成于 ' + this.formatShortTime(item.done_at)
    if (item.created_at) return this.formatShortTime(item.created_at)
    return ''
  },

  formatShortTime(time) {
    if (!time) return ''
    const date = new Date(time)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
    return `${date.getMonth() + 1}-${date.getDate()}`
  },

  async loadTodos() {
    if (!this.data.familyInfo) return
    try {
      const res = await app.request({
        url: '/todo/list',
        data: { familyId: this.data.familyInfo.id, status: 'all' }
      })
      this.setData({ todos: res.data.all || [] })
      this.updateStats()
      this.updateFilteredList()
    } catch (err) { console.error('加载待办失败', err) }
  },

  switchTab(e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab || 'all' })
    this.updateFilteredList()
  },

  showAddModal() {
    this.setData({
      showModal: true, editMode: false,
      formData: { id: '', title: '', description: '', priority: 0, assigneeId: '' },
      assigneeIndex: 0
    })
  },

  hideModal() { this.setData({ showModal: false }) },
  inputTitle(e) { this.setData({ 'formData.title': e.detail.value }) },
  inputDescription(e) { this.setData({ 'formData.description': e.detail.value }) },
  togglePriority(e) { this.setData({ 'formData.priority': parseInt(e.currentTarget.dataset.level) || 0 }) },
  
  pickAssignee(e) {
    const index = parseInt(e.detail.value)
    const assigneeId = index === 0 ? '' : (this.data.members[index - 1]?.id || '')
    this.setData({ assigneeIndex: index, 'formData.assigneeId': assigneeId })
  },

  editItem(e) {
    const item = e.currentTarget.dataset.item
    const assigneeIndex = item.assignee_id ? this.data.members.findIndex(m => m.id === item.assignee_id) + 1 : 0
    this.setData({
      showModal: true, editMode: true,
      formData: {
        id: item.id, title: item.title, description: item.description || '',
        priority: item.priority || 0, assigneeId: item.assignee_id || ''
      },
      assigneeIndex: assigneeIndex >= 0 ? assigneeIndex : 0
    })
  },

  // 提交表单
  async submitForm() {
    if (!this.data.formData.title.trim()) return wx.showToast({ title: '请输入内容', icon: 'none' })
    
    const myUserId = app.globalData.userInfo?.id
    if (this.data.formData.assigneeId === myUserId) {
      this.requestSubscribe(async () => {
        await this.doSubmit()
      })
    } else {
      await this.doSubmit()
    }
  },

  async doSubmit() {
    wx.showLoading({ title: this.data.editMode ? '保存中' : '添加中' })
    
    try {
      if (this.data.editMode) {
        await app.request({
          url: `/todo/${this.data.formData.id}`,
          method: 'PUT',
          data: {
            title: this.data.formData.title.trim(),
            description: this.data.formData.description,
            priority: this.data.formData.priority,
            assigneeId: this.data.formData.assigneeId
          }
        })
      } else {
        await app.request({
          url: '/todo/add',
          method: 'POST',
          data: {
            familyId: this.data.familyInfo.id,
            title: this.data.formData.title.trim(),
            description: this.data.formData.description,
            priority: this.data.formData.priority,
            assigneeId: this.data.formData.assigneeId
          }
        })
      }
      
      wx.hideLoading()
      wx.showToast({ title: this.data.editMode ? '已保存' : '添加成功', icon: 'success' })
      this.hideModal()
      this.loadTodos()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async toggleItem(e) {
    const item = e.currentTarget.dataset.item
    if (this.data.togglingId === item.id) return
    
    const statusFlow = { pending: 'doing', doing: 'done', done: 'pending' }
    const newStatus = statusFlow[item.status]
    
    const todos = this.data.todos.map(t => t.id === item.id ? { ...t, status: newStatus } : t)
    this.setData({ togglingId: item.id, todos })
    this.updateStats()
    this.updateFilteredList()
    
    try {
      await app.request({
        url: `/todo/${item.id}/status`,
        method: 'PUT',
        data: { status: newStatus }
      })
    } catch (err) { this.loadTodos() }
    finally { this.setData({ togglingId: '' }) }
  },

  async deleteItem(e) {
    wx.showModal({
      title: '确认删除', content: '确定删除这个待办吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await app.request({
              url: `/todo/${e.currentTarget.dataset.id}`,
              method: 'DELETE'
            })
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadTodos()
          } catch (err) { wx.showToast({ title: '删除失败', icon: 'none' }) }
        }
      }
    })
  },

  async clearDone() {
    wx.showModal({
      title: '确认清空', content: '确定清空所有已完成待办吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清空中' })
          try {
            await app.request({
              url: `/todo/clear-done/${this.data.familyInfo.id}`,
              method: 'DELETE'
            })
            wx.hideLoading()
            wx.showToast({ title: '已清空', icon: 'success' })
            this.loadTodos()
          } catch (err) { wx.hideLoading(); wx.showToast({ title: '清空失败', icon: 'none' }) }
        }
      }
    })
  },

  stopPropagation() {}
})
