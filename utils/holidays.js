// utils/holidays.js - 前端节假日工具
// 从后端获取节假日/节气/节日信息，缓存到storage
// 不需要 getApp延迟获取

const CACHE_KEY = 'holidays_cache';

/**
 * 获取某月的节假日数据
 * 法定假日一年不变 → 缓存到该年12月31日过期
 * 节气数据内置，永远有效
 */
async function getMonthHolidays(year, month) {
  const app = getApp();
  // 缓存过期时间：该年12月31日23:59:59
  const expireTime = new Date(year, 11, 31, 23, 59, 59).getTime();
  const cacheKey = `${CACHE_KEY}_${year}_${month}`;
  const cached = wx.getStorageSync(cacheKey);
  if (cached && cached.expire > Date.now()) {
    return cached.data;
  }
  
  try {
    const res = await app.request({
      url: '/holidays/month',
      data: { year, month }
    });
    
    if (res.success) {
      wx.setStorageSync(cacheKey, { data: res.data, expire: expireTime });
      return res.data;
    }
  } catch (err) {
    console.error('获取节假日失败:', err);
  }
  
  return {};
}

/**
 * 获取某日的节假日标签(简短,用于日历格子显示)
 * 补班日 → "班" (灰色)
 * 核心假日(wage=3) → 具体节日名如"端午" (红色加粗)
 * 调休日(wage=2) → "休" (粉色小字)
 * 节气 → 节气名 (绿色)
 * 纪念日 → 名称 (粉色)
 */
function getDayLabel(dateStr, monthHolidays) {
  const info = monthHolidays[dateStr];
  if (!info) return null;
  
  // 补班日 → "班"
  if (info.holiday === false) return '班';
  
  // 法定假日: wage=3 核心节日日, wage=2 调休放假日
  if (info.holiday === true) {
    if (info.wage === 3) {
      const name = info.holidayName || '';
      if (name.includes('除夕')) return '除夕';
      if (name.includes('初')) return '春节';
      if (name.includes('清明')) return '清明';
      if (name.includes('劳动')) return '劳动节';
      if (name.includes('端午')) return '端午';
      if (name.includes('中秋')) return '中秋';
      if (name.includes('国庆')) return '国庆';
      if (name.includes('元旦')) return '元旦';
      return name;
    }
    return '休';
  }
  
  if (info.term) return info.term;
  if (info.festival) return info.festival;
  
  return null;
}

