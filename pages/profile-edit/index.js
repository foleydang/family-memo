// pages/profile-edit/index.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    nickname: '',
    avatar: '',
    isSaving: false
  },

  onLoad() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    const userInfo = app.globalData.userInfo || {};
    this.setData({
      userInfo,
      nickname: userInfo.name || userInfo.nickname || '',
      avatar: userInfo.avatar || ''
    });
  },

  // 选择头像（微信新版授权方式）
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    console.log('选择的头像:', avatarUrl);
    
    // 显示临时头像
    this.setData({ avatar: avatarUrl });
    
    // 上传头像到服务器
    this.uploadAvatar(avatarUrl);
  },

  // 上传头像
  async uploadAvatar(tempFilePath) {
    wx.showLoading({ title: '上传中...' });
    
    try {
      // 上传到服务器获取永久URL
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${app.globalData.baseUrl}/upload/avatar`,
          filePath: tempFilePath,
          name: 'avatar',
          header: {
            'Authorization': `Bearer ${app.globalData.token}`
          },
          success: (res) => {
            try {
              const data = JSON.parse(res.data);
              if (data.success) {
                resolve(data.data.url);
              } else {
                reject(new Error(data.message || '上传失败'));
              }
            } catch (e) {
              reject(e);
            }
          },
          fail: reject
        });
      });
      
      // 更新为服务器返回的 URL（完整路径）
      // uploadRes 是相对路径如 /static/uploads/avatars/xxx.jpeg
      // baseUrl 是 https://api.yanten.top/api
      // 需要拼接成 https://api.yanten.top/static/uploads/avatars/xxx.jpeg
      const fullUrl = uploadRes.startsWith('http') 
        ? uploadRes 
        : `https://api.yanten.top${uploadRes}`;
      
      console.log('头像完整URL:', fullUrl);
      this.setData({ avatar: fullUrl });
      wx.hideLoading();
      wx.showToast({ title: '头像已上传', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      console.error('上传头像失败:', err);
      wx.showToast({ title: '上传失败，请重试', icon: 'none' });
    }
  },

  // 昵称输入
  onNicknameChange(e) {
    this.setData({ nickname: e.detail.value });
  },

  // 昵称输入框失去焦点
  onNicknameBlur(e) {
    const nickname = e.detail.value.trim();
    if (nickname) {
      this.setData({ nickname });
    }
  },

  // 保存资料
  async handleSave() {
    const { nickname, avatar } = this.data;
    
    if (!nickname.trim()) {
      return wx.showToast({ title: '请输入昵称', icon: 'none' });
    }
    
    this.setData({ isSaving: true });
    wx.showLoading({ title: '保存中...' });
    
    try {
      const res = await app.request({
        url: '/auth/profile',
        method: 'PUT',
        data: {
          nickname: nickname.trim(),
          avatar: avatar
        }
      });
      
      // 更新全局用户信息
      if (app.globalData.userInfo) {
        app.globalData.userInfo.name = nickname.trim();
        app.globalData.userInfo.nickname = nickname.trim();
        app.globalData.userInfo.avatar = avatar;
      }
      
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ isSaving: false });
    }
  }
});
