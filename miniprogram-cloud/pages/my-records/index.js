// pages/my-records/index.js - 云开发版本
const app = getApp()

Page({
  data: {
    familyId: null,
    currentTab: 'shopping',
    shoppingList: [],
    todoList: [],
    scheduleList: [],
    loading: false
  },

  onLoad() {
    if (app.globalData.familyInfo) {
      this.setData({ familyId: app.globalData.familyInfo._id })
      this.loadData()
    }
  },

  onShow() {
    if (this.data.familyId) {
      this.loadData()
    } else if (app.globalData.familyInfo) {
      this.setData({ familyId: app.globalData.familyInfo._id })
      this.loadData()
    }
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
  },

  async loadData() {
    if (!this.data.familyId) return

    this.setData({ loading: true })

    try {
      const [shopping, todo, schedule] = await Promise.all([
        this.loadShopping(),
        this.loadTodo(),
        this.loadSchedule()
      ])

      this.setData({
        shoppingList: shopping,
        todoList: todo,
        scheduleList: schedule,
        loading: false
      })
    } catch (err) {
      console.error('加载数据失败', err)
      this.setData({ loading: false })
    }
  },

  async loadShopping() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'shopping',
        data: {
          action: 'list',
          data: { familyId: this.data.familyId }
        }
      })
      
      if (res.result.success) {
        // 只返回自己创建的
        const userId = app.globalData.userId
        return (res.result.data || []).filter(item => item.createdBy === userId)
      }
      return []
    } catch (err) {
      console.error('加载购物失败', err)
      return []
    }
  },

  async loadTodo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'todo',
        data: {
          action: 'list',
          data: { familyId: this.data.familyId }
        }
      })
      
      if (res.result.success) {
        const userId = app.globalData.userId
        return (res.result.data || []).filter(item => item.createdBy === userId)
      }
      return []
    } catch (err) {
      console.error('加载待办失败', err)
      return []
    }
  },

  async loadSchedule() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'schedule',
        data: {
          action: 'list',
          data: { familyId: this.data.familyId }
        }
      })
      
      if (res.result.success) {
        const userId = app.globalData.userId
        return (res.result.data || []).filter(item => item.createdBy === userId)
      }
      return []
    } catch (err) {
      console.error('加载日程失败', err)
      return []
    }
  },

  async toggleShopping(e) {
    const id = e.currentTarget.dataset.id
    try {
      await wx.cloud.callFunction({
        name: 'shopping',
        data: {
          action: 'toggle',
          data: { _id: id }
        }
      })
      this.loadData()
    } catch (err) {
      console.error('操作失败', err)
    }
  },

  async deleteShopping(e) {
    const id = e.currentTarget.dataset.id
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这条购物记录吗？'
    })

    if (res.confirm) {
      try {
        await wx.cloud.callFunction({
          name: 'shopping',
          data: {
            action: 'delete',
            data: { _id: id }
          }
        })
        wx.showToast({ title: '已删除', icon: 'success' })
        this.loadData()
      } catch (err) {
        wx.showToast({ title: '删除失败', icon: 'none' })
      }
    }
  },

  async toggleTodo(e) {
    const item = e.currentTarget.dataset.item
    
    try {
      await wx.cloud.callFunction({
        name: 'todo',
        data: {
          action: 'toggle',
          data: { _id: item._id }
        }
      })
      this.loadData()
    } catch (err) {
      console.error('操作失败', err)
    }
  },

  async deleteTodo(e) {
    const id = e.currentTarget.dataset.id
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这条待办记录吗？'
    })

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
        this.loadData()
      } catch (err) {
        wx.showToast({ title: '删除失败', icon: 'none' })
      }
    }
  },

  async deleteSchedule(e) {
    const id = e.currentTarget.dataset.id
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这条日程记录吗？'
    })

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
        this.loadData()
      } catch (err) {
        wx.showToast({ title: '删除失败', icon: 'none' })
      }
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }
})
