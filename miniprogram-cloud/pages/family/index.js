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

  showCreateFamily() {
    this.setData({ showCreate: true })
  },

  hideCreateFamily() {
    this.setData({ showCreate: false, familyName: '' })
  },

  onFamilyNameInput(e) {
    this.setData({ familyName: e.detail.value })
  },

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
        this.hideCreateFamily()
        await app.getFamilyInfo()
        this.loadFamilyInfo()
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '创建失败', icon: 'none' })
    }
  },

  showJoinFamily() {
    this.setData({ showJoin: true })
  },

  hideJoinFamily() {
    this.setData({ showJoin: false, inputCode: '' })
  },

  onCodeInput(e) {
    this.setData({ inputCode: e.detail.value.toUpperCase() })
  },

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
        this.hideJoinFamily()
        await app.getFamilyInfo()
        this.loadFamilyInfo()
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '加入失败', icon: 'none' })
    }
  },

  async getInviteCode() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'family',
        data: { action: 'getInviteCode' }
      })
      
      if (res.result.success) {
        this.setData({ inviteCode: res.result.data.inviteCode })
      }
    } catch (err) {
      console.error('获取邀请码失败', err)
    }
  },

  copyInviteCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
