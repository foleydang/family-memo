// pages/family/index.js
const app = getApp();

Page({
  data: {
    familyInfo: null,
    members: [],
    showModal: false,
    inviteCode: '',
    action: '',
    createForm: { name: '' },
    joinForm: { code: '' },
    currentUserId: null // 当前用户 ID
  },

  onLoad(options) {
    if (options.action) {
      this.setData({ action: options.action });
    }

    if (app.globalData.familyInfo) {
      this.setData({ familyInfo: app.globalData.familyInfo });
      this.loadFamilyInfo();
    }
  },

  onShow() {
    if (app.globalData.familyInfo) {
      this.setData({ familyInfo: app.globalData.familyInfo });
      this.loadFamilyInfo();
    }
  },

  async loadFamilyInfo() {
    if (!this.data.familyInfo) return;

    try {
      const res = await app.request({
        url: `/family/${this.data.familyInfo.id}`
      });
      this.setData({
        familyInfo: res.data,
        members: res.data.members || [],
        currentUserId: app.globalData.userInfo?.id
      });
    } catch (err) {
      console.error('加载家庭信息失败', err);
    }
  },

  showCreateModal() {
    this.setData({
      showModal: true,
      action: 'create',
      createForm: { name: '' }
    });
  },

  showJoinModal() {
    this.setData({
      showModal: true,
      action: 'join',
      joinForm: { code: '' }
    });
  },

  hideModal() {
    this.setData({ showModal: false });
  },

  stopPropagation() {
    // 阻止事件冒泡
  },

  inputFamilyName(e) {
    this.setData({ 'createForm.name': e.detail.value });
  },

  inputJoinCode(e) {
    this.setData({ 'joinForm.code': e.detail.value });
  },

  async createFamily() {
    const { name } = this.data.createForm;

    if (!name.trim()) {
      wx.showToast({ title: '请输入家庭名称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '创建中' });

    try {
      const res = await app.request({
        url: '/family/create',
        method: 'POST',
        data: { name }
      });

      wx.hideLoading();
      wx.showToast({ title: '创建成功', icon: 'success' });

      app.globalData.familyInfo = res.data;
      this.setData({
        familyInfo: res.data,
        showModal: false,
        inviteCode: res.data.inviteCode || ''
      });

      // 刷新用户信息
      await app.getUserInfo();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '创建失败', icon: 'none' });
    }
  },

  async joinFamily() {
    const { code } = this.data.joinForm;

    if (!code.trim()) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '加入中' });

    try {
      const res = await app.request({
        url: '/family/join',
        method: 'POST',
        data: { code }
      });

      wx.hideLoading();
      wx.showToast({ title: '加入成功', icon: 'success' });

      app.globalData.familyInfo = res.data;
      this.setData({
        familyInfo: res.data,
        showModal: false
      });

      // 刷新用户信息
      await app.getUserInfo();
      this.loadFamilyInfo();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加入失败，请检查邀请码', icon: 'none' });
    }
  },

  async getInviteCode() {
    // 直接从家庭信息获取邀请码，不需要生成新的
    if (!this.data.familyInfo) return;
    
    // 如果已有邀请码，直接使用
    if (this.data.inviteCode) return;
    
    // 否则重新加载家庭信息
    await this.loadFamilyInfo();
  },

  copyInviteCode() {
    const code = this.data.inviteCode;
    if (!code) {
      wx.showToast({ title: '邀请码加载中...', icon: 'none' });
      this.loadFamilyInfo();
      return;
    }
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => {
        wx.showToast({ title: '已复制邀请码', icon: 'success' });
      }
    });
  },

  shareInvite() {
    const code = this.data.inviteCode;
    if (!code) {
      // 邀请码还未加载，先加载
      this.loadFamilyInfo().then(() => {
        this.shareInvite();
      });
      return;
    }

    // 分享给微信好友
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  async removeMember(e) {
    const memberId = e.currentTarget.dataset.id;

    if (memberId === app.globalData.userInfo.id) {
      wx.showToast({ title: '不能移除自己', icon: 'none' });
      return;
    }

    // 检查权限
    if (!this.isAdmin()) {
      wx.showToast({ title: '只有管理员可以移除成员', icon: 'none' });
      return;
    }

    const res = await wx.showModal({
      title: '确认移除',
      content: '确定要移除该成员吗？'
    });

    if (res.confirm) {
      try {
        await app.request({
          url: `/family/${this.data.familyInfo.id}/member/${memberId}`,
          method: 'DELETE'
        });
        wx.showToast({ title: '已移除', icon: 'success' });
        this.loadFamilyInfo();
      } catch (err) {
        wx.showToast({ title: '移除失败', icon: 'none' });
      }
    }
  },

  // 判断当前用户是否是管理员
  isAdmin() {
    const familyInfo = this.data.familyInfo;
    const currentUserId = this.data.currentUserId;
    return familyInfo && (familyInfo.created_by === currentUserId || familyInfo.owner_id === currentUserId);
  },

  // 设置/取消管理员
  async toggleAdmin(e) {
    const memberId = e.currentTarget.dataset.id;
    const member = this.data.members.find(m => m.id === memberId);
    
    if (!this.isAdmin()) {
      wx.showToast({ title: '只有创建者可以设置管理员', icon: 'none' });
      return;
    }

    const action = member.role === 'admin' ? '取消管理员' : '设为管理员';
    const res = await wx.showModal({
      title: '确认操作',
      content: `确定要${action}吗？`
    });

    if (res.confirm) {
      try {
        await app.request({
          url: `/family/${this.data.familyInfo.id}/member/${memberId}/role`,
          method: 'PUT',
          data: { role: member.role === 'admin' ? 'member' : 'admin' }
        });
        wx.showToast({ title: '已更新', icon: 'success' });
        this.loadFamilyInfo();
      } catch (err) {
        wx.showToast({ title: '操作失败', icon: 'none' });
      }
    }
  },

  async leaveFamily() {
    const res = await wx.showModal({
      title: '确认退出',
      content: '确定要退出家庭吗？退出后数据将无法访问'
    });

    if (res.confirm) {
      try {
        await app.request({
          url: `/family/${this.data.familyInfo.id}/leave`,
          method: 'POST'
        });
        wx.showToast({ title: '已退出', icon: 'success' });

        app.globalData.familyInfo = null;
        this.setData({
          familyInfo: null,
          members: []
        });

        await app.getUserInfo();
      } catch (err) {
        wx.showToast({ title: '退出失败', icon: 'none' });
      }
    }
  },

  getRoleText(role) {
    const map = { owner: '创建者', admin: '管理员', member: '成员' };
    return map[role] || '成员';
  },

  goToShopping() {
    wx.switchTab({ url: '/pages/shopping/index' });
  },

  goToTodo() {
    wx.switchTab({ url: '/pages/todo/index' });
  },

  goToSchedule() {
    wx.switchTab({ url: '/pages/schedule/index' });
  }
});