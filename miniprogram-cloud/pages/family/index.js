// pages/family/index.js - 云开发版本
const app = getApp()

Page({
  data: {
    familyInfo: null,
    members: [],
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
    // 先从 globalData 获取
    this.setData({ familyInfo: app.globalData.familyInfo })
    
    // 如果有家庭，加载成员
    if (app.globalData.familyInfo) {
      this.setData({ familyInfo: app.globalData.familyInfo })
      await this.loadMembers()
    }
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
        this.setData({ members: res.result.data })
      }
    } catch (err) {
      console.error('加载成员失败', err)
    }
  },

  showCreateModal() {
    this.setData({ showCreate: true, familyName: '' })
  },

  hideCreateModal() {
    this.setData({ showCreate: false, familyName: '' })
  },

  showJoinModal() {
    this.setData({ showJoin: true, inputCode: '' })
  },

  hideJoinModal() {
    this.setData({ showJoin: false, inputCode: '' })
  },

  onFamilyNameInput(e) {
    this.setData({ familyName: e.detail.value })
  },

  onCodeInput(e) {
    this.setData({ inputCode: e.detail.value.toUpperCase() })
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
        this.hideCreateModal()
        
        // 更新 globalData
        await app.getFamilyInfo()
        
        // 立即更新当前页面数据
        this.setData({ familyInfo: app.globalData.familyInfo })
        
        // 加载成员（应该包含自己）
        await this.loadMembers()
      } else {
        wx.showToast({ title: res.result.message || '创建失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('创建家庭失败:', err)
      wx.showToast({ title: '创建失败', icon: 'none' })
    }
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
        this.hideJoinModal()
        await app.getFamilyInfo()
        this.setData({ familyInfo: app.globalData.familyInfo })
        await this.loadMembers()
      } else {
        wx.showToast({ title: res.result.message || '加入失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('加入家庭失败:', err)
      wx.showToast({ title: '加入失败', icon: 'none' })
    }
  },

  async generateInviteCode() {
    if (!this.data.familyInfo) return
    
    wx.showLoading({ title: '生成中' })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'family',
        data: {
          action: 'getInviteCode'
        }
      })
      
      wx.hideLoading()
      
      if (res.result.success) {
        const inviteCode = res.result.data.inviteCode
        this.setData({ 
          familyInfo: { ...this.data.familyInfo, inviteCode }
        })
        wx.showToast({ title: '已生成', icon: 'success' })
      } else {
        wx.showToast({ title: res.result.message || '生成失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('生成邀请码失败:', err)
      wx.showToast({ title: '生成失败', icon: 'none' })
    }
  },

  copyInviteCode() {
    const code = this.data.familyInfo?.inviteCode
    if (!code) {
      return wx.showToast({ title: '请先生成邀请码', icon: 'none' })
    }
    
    wx.setClipboardData({
      data: code,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  shareInvite() {
    const code = this.data.familyInfo?.inviteCode
    if (!code) {
      this.generateInviteCode()
      return
    }
  },

  async leaveFamily() {
    const res = await wx.showModal({
      title: '确认退出',
      content: '确定要退出家庭吗？退出后数据将无法访问'
    })
    
    if (!res.confirm) return
    
    wx.showLoading({ title: '退出中' })
    
    try {
      // 清除本地数据
      app.globalData.familyInfo = null
      this.setData({ familyInfo: null, members: [] })
      wx.hideLoading()
      wx.showToast({ title: '已退出', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      console.error('退出家庭失败:', err)
      wx.showToast({ title: '退出失败', icon: 'none' })
    }
  },

  stopPropagation() {}
})
