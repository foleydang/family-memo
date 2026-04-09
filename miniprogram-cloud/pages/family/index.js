// pages/family/index.js - 云开发版本
const app = getApp()

Page({
  data: {
    familyInfo: null,
    members: [],
    inviteCode: '',
    showCreate: false,
    showJoin: false,
    familyName: '',
    inputCode: ''
  },

  onLoad(options) {
    if (options.action === 'join') {
      this.setData({ showJoin: true })
    }
    this.loadFamilyInfo()
  },

  onShow() {
    this.loadFamilyInfo()
  },

  async loadFamilyInfo() {
    if (app.globalData.familyInfo) {
      this.setData({ familyInfo: app.globalData.familyInfo })
      this.loadMembers()
    }
  },

  async loadMembers() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'family',
        data: {
          action: 'getMembers',
          data: { familyId: this.data.familyInfo._id }
        }
      })
      
      if (res.result.success) {
        this.setData({ members: res.result.data })
      }
    } catch (err) {
      console.error('加载成员失败', err)
    }
  },

  // 显示创建家庭弹窗
  showCreateModal() {
    this.setData({ showCreate: true, familyName: '' })
  },

  // 隐藏创建家庭弹窗
  hideCreateModal() {
    this.setData({ showCreate: false, familyName: '' })
  },

  // 显示加入家庭弹窗
  showJoinModal() {
    this.setData({ showJoin: true, inputCode: '' })
  },

  // 隐藏加入家庭弹窗
  hideJoinModal() {
    this.setData({ showJoin: false, inputCode: '' })
  },

  onFamilyNameInput(e) {
    this.setData({ familyName: e.detail.value })
  },

  onCodeInput(e) {
    this.setData({ inputCode: e.detail.value.toUpperCase() })
  },

  // 创建家庭
  async createFamily() {
    if (!this.data.familyName.trim()) {
      return wx.showToast({ title: '请输入家庭名称', icon: 'none' })
    }
    
    wx.showLoading({ title: '创建中' })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'family',
        data: {
          action: 'create',
          data: { name: this.data.familyName.trim() }
        }
      })
      
      wx.hideLoading()
      
      if (res.result.success) {
        wx.showToast({ title: '创建成功', icon: 'success' })
        this.hideCreateModal()
        await app.getFamilyInfo()
        this.loadFamilyInfo()
      } else {
        wx.showToast({ title: res.result.message || '创建失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('创建家庭失败:', err)
      wx.showToast({ title: '创建失败', icon: 'none' })
    }
  },

  // 加入家庭
  async joinFamily() {
    if (!this.data.inputCode.trim()) {
      return wx.showToast({ title: '请输入邀请码', icon: 'none' })
    }
    
    wx.showLoading({ title: '加入中' })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'family',
        data: {
          action: 'join',
          data: { inviteCode: this.data.inputCode.trim() }
        }
      })
      
      wx.hideLoading()
      
      if (res.result.success) {
        wx.showToast({ title: '加入成功', icon: 'success' })
        this.hideJoinModal()
        await app.getFamilyInfo()
        this.loadFamilyInfo()
      } else {
        wx.showToast({ title: res.result.message || '加入失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('加入家庭失败:', err)
      wx.showToast({ title: '加入失败', icon: 'none' })
    }
  },

  // 复制邀请码
  copyInviteCode() {
    wx.setClipboardData({
      data: this.data.familyInfo.inviteCode,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
