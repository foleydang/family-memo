// pages/family/index.js - 云开发版本
const app = getApp()

Page({
  data: {
    familyInfo: null,
    members: [],
    showCreate: false,
    showJoin: false,
    familyName: '',
    inputCode: '',
    isAdmin: false,
    loading: true
  },

  onLoad(options) {
    if (options.action === 'join') {
      this.setData({ showJoin: true })
    }
    this.initPage()
  },

  onShow() {
    if (!this.data.loading) {
      this.loadFamilyInfo()
    }
  },

  async initPage() {
    if (!app.globalData.userInfo) {
      await new Promise(resolve => {
        const checkTimer = setInterval(() => {
          if (app.globalData.userInfo) {
            clearInterval(checkTimer)
            resolve()
          }
        }, 100)
        setTimeout(() => {
          clearInterval(checkTimer)
          resolve()
        }, 3000)
      })
    }
    
    this.setData({ loading: false })
    await this.loadFamilyInfo()
  },

  async loadFamilyInfo() {
    let familyInfo = app.globalData.familyInfo
    
    if (!familyInfo && app.globalData.userInfo) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'family',
          data: { action: 'getMyFamily' }
        })
        
        if (res.result.success && res.result.data) {
          familyInfo = res.result.data
          app.globalData.familyInfo = familyInfo
        }
      } catch (err) {
        console.error('获取家庭信息失败:', err)
      }
    }
    
    this.setData({ familyInfo })
    
    if (familyInfo) {
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
        const members = res.result.data
        const currentUserId = app.globalData.userId
        const adminMember = members.find(m => m.role === 'admin')
        const isAdmin = adminMember && adminMember._id === currentUserId
        
        this.setData({ members, isAdmin })
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
        await app.getFamilyInfo()
        this.setData({ familyInfo: app.globalData.familyInfo })
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
        data: { action: 'getInviteCode' }
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
    }
  },

  async leaveFamily() {
    const isAdmin = this.data.isAdmin
    
    wx.showModal({
      title: isAdmin ? '解散家庭' : '退出家庭',
      content: isAdmin ? '解散后所有成员将被移除，数据无法恢复，确定解散吗？' : '确定要退出家庭吗？退出后数据将无法访问',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: isAdmin ? '解散中' : '退出中' })
          
          try {
            if (isAdmin) {
              await wx.cloud.callFunction({
                name: 'family',
                data: { action: 'dissolve' }
              })
            }
            
            app.globalData.familyInfo = null
            this.setData({ familyInfo: null, members: [] })
            wx.hideLoading()
            wx.showToast({ title: isAdmin ? '已解散' : '已退出', icon: 'success' })
          } catch (err) {
            wx.hideLoading()
            console.error('操作失败:', err)
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  },

  stopPropagation() {}
})
