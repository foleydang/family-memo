// pages/index/index.js - 云开发版本
const app = getApp()

const SCHEDULE_REMIND_TEMPLATE_ID = 'bDHCtdW_8crvYVMvD1p0fo_u1vIR0zuKTSPGr8BW1dU'

Page({
  data: {
    userInfo: null,
    familyInfo: null,
    members: [],
    greeting: '',
    todayStr: '',
    loading: true,  // 初始为加载中
    dataReady: false // 数据是否准备完成
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    // 只有数据准备好了才刷新
    if (this.data.dataReady) {
      this.refreshData()
      this.checkTodayRemind()
    }
  },

  onPullDownRefresh() {
    this.refreshData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async initPage() {
    // 设置问候语
    const hour = new Date().getHours()
    let greeting = '你好'
    if (hour < 6) greeting = '夜深了'
    else if (hour < 9) greeting = '早上好'
    else if (hour < 12) greeting = '上午好'
    else if (hour < 14) greeting = '中午好'
    else if (hour < 18) greeting = '下午好'
    else if (hour < 22) greeting = '晚上好'
    else greeting = '夜深了'

    const today = new Date()
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']

    this.setData({
      greeting,
      todayStr: `${today.getMonth() + 1}月${today.getDate()}日 星期${weekDays[today.getDay()]}`
    })

    // 等待登录和家庭信息都加载完成
    await this.waitForDataReady()
    
    this.setData({ 
      loading: false,
      dataReady: true 
    })
    
    this.refreshData()
  },

  // 等待数据准备完成
  async waitForDataReady() {
    return new Promise((resolve) => {
      const checkReady = () => {
        // 检查是否登录完成
        if (app.globalData.userInfo) {
          // 检查家庭信息是否加载完成（可能为null，但也算完成）
          resolve()
        } else {
          // 等待登录完成
          const timer = setInterval(() => {
            if (app.globalData.userInfo) {
              clearInterval(timer)
              // 再等待家庭信息
              setTimeout(() => resolve(), 500)
            }
          }, 100)
          
          // 超时保护
          setTimeout(() => {
            clearInterval(timer)
            resolve()
          }, 5000)
        }
      }
      checkReady()
    })
  },

  async refreshData() {
    const userInfo = app.globalData.userInfo
    const familyInfo = app.globalData.familyInfo
    
    this.setData({ userInfo, familyInfo })

    if (familyInfo) {
      await this.loadFamilyMembers()
    }
  },

  async loadFamilyMembers() {
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

  async checkTodayRemind() {
    if (!app.globalData.userInfo || !app.globalData.familyInfo) return
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'schedule',
        data: { action: 'getTodayRemind' }
      })
      
      if (res.result.success && res.result.data.length > 0) {
        await new Promise((resolve) => {
          wx.requestSubscribeMessage({
            tmplIds: [SCHEDULE_REMIND_TEMPLATE_ID],
            success: (res) => resolve(res[SCHEDULE_REMIND_TEMPLATE_ID] === 'accept'),
            fail: () => resolve(false)
          })
        })
        
        await wx.cloud.callFunction({
          name: 'sendRemind',
          data: { action: 'checkToday' }
        })
      }
    } catch (err) {
      console.error('检查提醒失败', err)
    }
  },

  handleLogin() {
    wx.showLoading({ title: '登录中' })
    app.login().then(async () => {
      // 等待家庭信息加载
      await new Promise(resolve => setTimeout(resolve, 1000))
      wx.hideLoading()
      this.setData({ 
        userInfo: app.globalData.userInfo,
        familyInfo: app.globalData.familyInfo,
        loading: false,
        dataReady: true
      })
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: '登录失败', icon: 'none' })
    })
  },

  handleCreateFamily() {
    wx.switchTab({ url: '/pages/family/index' })
  },

  handleJoinFamily() {
    wx.switchTab({ url: '/pages/family/index' })
  },

  goToShopping() {
    wx.switchTab({ url: '/pages/shopping/index' })
  },

  goToTodo() {
    wx.switchTab({ url: '/pages/todo/index' })
  },

  goToSchedule() {
    wx.switchTab({ url: '/pages/schedule/index' })
  },

  goToFamily() {
    wx.switchTab({ url: '/pages/family/index' })
  }
})
