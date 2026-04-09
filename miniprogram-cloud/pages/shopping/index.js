// pages/shopping/index.js - 云开发版本
const app = getApp()

Page({
  data: {
    items: [],
    familyInfo: null,
    showAdd: false,
    newItem: { title: '', category: '其他', quantity: 1, unit: '个' },
    categories: ['食品', '日用品', '蔬果', '肉类', '其他']
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
          wx.switchTab({ url: '/pages/user/index' })
        }
      })
      return false
    }
    this.setData({ familyInfo: app.globalData.familyInfo })
    return true
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
        this.setData({ items: res.result.data })
      }
    } catch (err) {
      console.error('加载购物清单失败', err)
    }
  },

  showAddItem() {
    this.setData({ showAdd: true, newItem: { title: '', category: '其他', quantity: 1, unit: '个' } })
  },

  hideAddItem() {
    this.setData({ showAdd: false })
  },

  onTitleInput(e) {
    this.setData({ 'newItem.title': e.detail.value })
  },

  onCategoryChange(e) {
    this.setData({ 'newItem.category': this.data.categories[e.detail.value] })
  },

  onQuantityChange(e) {
    this.setData({ 'newItem.quantity': parseInt(e.detail.value) || 1 })
  },

  onUnitInput(e) {
    this.setData({ 'newItem.unit': e.detail.value })
  },

  async addItem() {
    if (!this.data.newItem.title.trim()) {
      return wx.showToast({ title: '请输入商品名称', icon: 'none' })
    }
    
    wx.showLoading({ title: '添加中' })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'shopping',
        data: {
          action: 'add',
          data: {
            familyId: this.data.familyInfo._id,
            ...this.data.newItem
          }
        }
      })
      
      wx.hideLoading()
      
      if (res.result.success) {
        wx.showToast({ title: '添加成功', icon: 'success' })
        this.hideAddItem()
        this.loadItems()
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  },

  async toggleItem(e) {
    const { id } = e.currentTarget.dataset
    
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
    const { id } = e.currentTarget.dataset
    
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
  }
})
