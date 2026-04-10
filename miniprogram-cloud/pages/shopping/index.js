// pages/shopping/index.js - 云开发版本
const app = getApp()

Page({
  data: {
    items: [],
    filteredList: [],
    familyInfo: null,
    showModal: false,
    editMode: false,
    currentTab: 'pending',
    currentCategory: 'all',
    categories: [
      { id: 'food', name: '食品' },
      { id: 'daily', name: '日用品' },
      { id: 'fruit', name: '蔬果' },
      { id: 'meat', name: '肉类' },
      { id: 'dairy', name: '乳制品' },
      { id: 'snack', name: '零食饮料' },
      { id: 'cleaning', name: '清洁用品' },
      { id: 'other', name: '其他' }
    ],
    categoryIndex: 0, // 默认选中第一个（食品）
    formData: {
      _id: '',
      title: '',
      category: 'food',
      quantity: 1,
      unit: '个',
      priority: 0
    },
    stats: { pending: 0, done: 0 }
  },

  onLoad() {
    this.checkFamily()
  },

  onShow() {
    this.loadItems()
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

  getCategoryName(categoryId) {
    const cat = this.data.categories.find(c => c.id === categoryId)
    return cat ? cat.name : '其他'
  },

  updateFilteredList() {
    let list = this.data.items.map(item => ({
      ...item,
      categoryName: this.getCategoryName(item.category)
    }))
    if (this.data.currentTab === 'pending') {
      list = list.filter(i => i.status === 'pending')
    } else if (this.data.currentTab === 'done') {
      list = list.filter(i => i.status === 'done')
    }
    if (this.data.currentCategory !== 'all') {
      list = list.filter(i => i.category === this.data.currentCategory)
    }
    this.setData({ filteredList: list })
  },

  async loadItems() {
    if (!this.checkFamily()) return
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'shopping',
        data: {
          action: 'list',
          data: { familyId: this.data.familyInfo._id }
        }
      })
      
      if (res.result.success) {
        const items = res.result.data
        const pending = items.filter(i => i.status === 'pending').length
        const done = items.filter(i => i.status === 'done').length
        this.setData({ items, stats: { pending, done } })
        this.updateFilteredList()
      }
    } catch (err) {
      console.error('加载购物清单失败', err)
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    this.updateFilteredList()
  },

  switchCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ currentCategory: category })
    this.updateFilteredList()
  },

  showAddModal() {
    this.setData({
      showModal: true,
      editMode: false,
      formData: { _id: '', title: '', category: 'food', quantity: 1, unit: '个', priority: 0 },
      categoryIndex: 0 // 默认食品
    })
  },

  hideModal() {
    this.setData({ showModal: false })
  },

  inputTitle(e) {
    this.setData({ 'formData.title': e.detail.value })
  },

  inputQuantity(e) {
    this.setData({ 'formData.quantity': parseInt(e.detail.value) || 1 })
  },

  inputUnit(e) {
    this.setData({ 'formData.unit': e.detail.value })
  },

  pickCategory(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      categoryIndex: index,
      'formData.category': this.data.categories[index].id
    })
  },

  togglePriority() {
    this.setData({ 'formData.priority': this.data.formData.priority ? 0 : 1 })
  },

  editItem(e) {
    const item = e.currentTarget.dataset.item
    const catIndex = this.data.categories.findIndex(c => c.id === item.category)
    this.setData({
      showModal: true,
      editMode: true,
      formData: {
        _id: item._id,
        title: item.title,
        category: item.category || 'other',
        quantity: item.quantity || 1,
        unit: item.unit || '个',
        priority: item.priority || 0
      },
      categoryIndex: catIndex >= 0 ? catIndex : this.data.categories.length - 1
    })
  },

  async submitForm() {
    if (!this.data.formData.title.trim()) {
      return wx.showToast({ title: '请输入物品名称', icon: 'none' })
    }
    
    wx.showLoading({ title: this.data.editMode ? '保存中' : '添加中' })
    
    try {
      const action = this.data.editMode ? 'update' : 'add'
      const res = await wx.cloud.callFunction({
        name: 'shopping',
        data: {
          action,
          data: {
            _id: this.data.formData._id,
            familyId: this.data.familyInfo._id,
            title: this.data.formData.title.trim(),
            category: this.data.formData.category,
            quantity: this.data.formData.quantity,
            unit: this.data.formData.unit,
            priority: this.data.formData.priority
          }
        }
      })
      
      wx.hideLoading()
      
      if (res.result.success) {
        wx.showToast({ title: this.data.editMode ? '已保存' : '添加成功', icon: 'success' })
        this.hideModal()
        this.loadItems()
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async toggleItem(e) {
    const id = e.currentTarget.dataset.id
    
    try {
      await wx.cloud.callFunction({
        name: 'shopping',
        data: {
          action: 'toggle',
          data: { _id: id }
        }
      })
      
      this.loadItems()
    } catch (err) {
      console.error('切换状态失败', err)
    }
  },

  async deleteItem(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个商品吗？',
      success: async (res) => {
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
            this.loadItems()
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
      content: '确定要清空所有已购物品吗？',
      success: async (res) => {
        if (res.confirm) {
          const doneItems = this.data.items.filter(i => i.status === 'done')
          wx.showLoading({ title: '清空中' })
          
          try {
            for (const item of doneItems) {
              await wx.cloud.callFunction({
                name: 'shopping',
                data: { action: 'delete', data: { _id: item._id } }
              })
            }
            wx.hideLoading()
            wx.showToast({ title: '已清空', icon: 'success' })
            this.loadItems()
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
