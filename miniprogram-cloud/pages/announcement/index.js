// pages/announcement/index.js - 云开发版本
const app = getApp()

const DEFAULT_AVATAR = '/images/default-avatar.png'

function getValidAvatar(url) {
  if (!url) return DEFAULT_AVATAR
  if (url.startsWith('cloud://')) return DEFAULT_AVATAR
  if (url.startsWith('https://') && url.includes('?')) return url
  return DEFAULT_AVATAR
}

Page({
  data: {
    familyId: null,
    announcements: [],
    showModal: false,
    formData: { content: '' },
    loading: false
  },

  onLoad() { this.initPage() },

  onShow() {
    if (this.data.familyId) this.loadAnnouncements()
  },

  async initPage() {
    if (!app.globalData.userInfo) {
      await new Promise(resolve => {
        const timer = setInterval(() => {
          if (app.globalData.userInfo) { clearInterval(timer); resolve() }
        }, 100)
        setTimeout(() => { clearInterval(timer); resolve() }, 3000)
      })
    }
    
    if (!app.globalData.familyInfo) {
      wx.showToast({ title: '请先加入家庭', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    
    this.setData({ familyId: app.globalData.familyInfo._id })
    this.loadAnnouncements()
  },

  onPullDownRefresh() {
    this.loadAnnouncements().then(() => wx.stopPullDownRefresh())
  },

  async loadAnnouncements() {
    if (!this.data.familyId) return
    
    this.setData({ loading: true })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'announcement',
        data: { action: 'list', data: { familyId: this.data.familyId } }
      })
      
      if (res.result.success) {
        const announcements = (res.result.data || []).map(item => ({
          ...item,
          displayTime: this.formatTime(item.createTime),
          authorAvatar: getValidAvatar(item.authorAvatar)
        }))
        this.setData({ announcements, loading: false })
      } else {
        this.setData({ loading: false })
      }
    } catch (err) {
      console.error('加载公告失败:', err)
      this.setData({ loading: false })
    }
  },

  formatTime(time) {
    if (!time) return ''
    const date = new Date(time)
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  },

  showAddModal() {
    this.setData({ showModal: true, formData: { content: '' } })
  },

  hideModal() { this.setData({ showModal: false }) },

  inputContent(e) { this.setData({ 'formData.content': e.detail.value }) },

  async submitForm() {
    const { content } = this.data.formData
    
    if (!content.trim()) return wx.showToast({ title: '请输入公告内容', icon: 'none' })
    if (content.trim().length < 5) return wx.showToast({ title: '内容至少5个字', icon: 'none' })
    
    wx.showLoading({ title: '发布中' })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'announcement',
        data: { action: 'add', data: { familyId: this.data.familyId, content: content.trim() } }
      })
      
      wx.hideLoading()
      
      if (res.result.success) {
        wx.showToast({ title: '发布成功', icon: 'success' })
        this.setData({ showModal: false, formData: { content: '' } })
        this.loadAnnouncements()
      } else {
        wx.showToast({ title: res.result.message || '发布失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('发布失败:', err)
      wx.showToast({ title: '发布失败', icon: 'none' })
    }
  },

  deleteAnnouncement(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条公告吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中' })
          
          try {
            const result = await wx.cloud.callFunction({
              name: 'announcement',
              data: { action: 'delete', data: { _id: id } }
            })
            
            wx.hideLoading()
            
            if (result.result.success) {
              wx.showToast({ title: '已删除', icon: 'success' })
              this.loadAnnouncements()
            } else {
              wx.showToast({ title: result.result.message || '删除失败', icon: 'none' })
            }
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  stopPropagation() {}
})
